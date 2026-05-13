import bcrypt from 'bcryptjs'
import { env } from '@/config'
import { TokenManager } from '@/lib/security/token-manager'
import { ConflictError } from '@/lib/errors/app-error'
import { encryptSessionKey } from '@/lib/wechat/encryption'
import { getPhoneNumber } from '@/lib/wechat/phone'
import type { MeResponse, MeUserDto } from '@/contracts/dtos/auth/me.dto'
import type { UserRepository } from '@/repositories/interfaces/core/user.interface'
import type { SessionRepository } from '@/repositories/interfaces/core/session.interface'
import type { WechatAccountRepository } from '@/plugins/wechat/repositories/interfaces/wechat-account.interface'
import type { RbacRepository } from '@/repositories/interfaces/core/rbac.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'

const DUMMY_PASSWORD_HASH = '$2b$10$B93tP3/wsBzQNB7acfEf3ua3aGzv5rPCgb5Gpg4rCkjqtyaWiA5Ie'

export type WechatOauthProvider = {
  code2Session: (code: string) => Promise<{ openid: string; unionid?: string | null; session_key: string }>
}

export type AuthContext = {
  userAgent: string | null
  clientIp: string | null
}

type AuthErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_DISABLED'
  | 'LOCKED'
  | 'SESSION_REUSE_DETECTED'
  | 'INTERNAL_ERROR'

export class AuthError extends Error {
  public readonly code: AuthErrorCode
  public readonly lockedUntil: string | null

  constructor(code: AuthErrorCode, message: string, options?: { lockedUntil?: string | null }) {
    super(message)
    this.code = code
    this.lockedUntil = options?.lockedUntil ?? null
  }
}

function nowIso() {
  return new Date().toISOString()
}

function addSecondsToIso(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString()
}

function isLockedUntil(lockedUntilIso: string | null): boolean {
  if (!lockedUntilIso) return false
  return new Date(lockedUntilIso).getTime() > Date.now()
}

function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const typedError = error as { code?: unknown }
  return typedError.code === 'P2002' || typedError.code === '23505'
}

export type LoginResult = {
  userId: string
  accessToken: string
  refreshToken: string
  sessionId: string
}

export function createAuthService(
  deps: {
    users: UserRepository
    sessions: SessionRepository
    wechatAccounts: WechatAccountRepository
    rbac: RbacRepository
    wechatOauth: WechatOauthProvider
  },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  const defaultRoleName = 'user'

  async function ensureDefaultRoleAssigned(userId: string) {
    const roleId = await deps.rbac.getRoleIdByName(repoCtx, { roleName: defaultRoleName })
    if (!roleId) {
      throw new AuthError('INTERNAL_ERROR', `Default role '${defaultRoleName}' not found`)
    }

    await deps.rbac.assignRoleToUser(repoCtx, { userId, roleId })
  }

  async function issueSession(params: {
    userId: string
    ctx: AuthContext
  }): Promise<LoginResult> {
    const now = nowIso()

    const roles = await deps.rbac.getRolesForUser(repoCtx, { userId: params.userId })
    logger.info({ action: 'issue_session_step1', roleCount: roles?.length }, 'Got roles')

    const roleNames = roles.map((r) => r.name)
    logger.info({ action: 'issue_session_step2', roleNames }, 'Mapped role names')

    logger.info({ action: 'issue_session', userId: params.userId, roles: roleNames }, 'Issuing session with roles')

    await deps.sessions.revokeOldestSessions(repoCtx, {
      userId: params.userId,
      keepLatest: Math.max(0, env.AUTH_MAX_SESSIONS_PER_USER - 1),
      nowIso: now,
    })

    const { token: refreshToken, tokenHash } = TokenManager.createRefreshToken()

    const session = await deps.sessions.createSession(repoCtx, {
      input: {
        userId: params.userId,
        refreshTokenHash: tokenHash,
        expiresAt: addSecondsToIso(env.AUTH_REFRESH_TTL_SECONDS),
        userAgent: params.ctx.userAgent,
        clientIp: params.ctx.clientIp,
      },
    })

    const accessToken = await TokenManager.signAccessToken(
      { sub: params.userId, sessionId: session.id, roles: roleNames },
      env.AUTH_ACCESS_TTL_SECONDS,
    )

    return {
      userId: params.userId,
      accessToken,
      refreshToken,
      sessionId: session.id,
    }
  }

  return {
    /**
    Function: assertAccessSessionActive

    Description: 校验 access token 绑定的 session 是否仍然有效（未撤销/未过期/未被旋转替换），用于实现管理员踢出等“立即失效”能力

    Parameters:
    	params(object): 校验参数
    	params.userId(string): token 中的用户 ID
    	params.sessionId(string): token 中的 sessionId

    Returns:
    	void(void): 校验通过不返回值，失败抛出 AuthError('UNAUTHORIZED')
    */
    async assertAccessSessionActive(params: { userId: string; sessionId: string }) {
      const session = await deps.sessions.getSessionById(repoCtx, { sessionId: params.sessionId })
      if (!session) {
        throw new AuthError('UNAUTHORIZED', 'Unauthorized')
      }

      if (session.userId !== params.userId) {
        throw new AuthError('UNAUTHORIZED', 'Unauthorized')
      }

      const expired = new Date(session.expiresAt).getTime() <= Date.now()
      const rotated = Boolean(session.rotatedAt) || Boolean(session.replacedBySessionId)

      if (session.isRevoked || expired || rotated) {
        throw new AuthError('UNAUTHORIZED', 'Unauthorized')
      }
    },

    async validateCredentials(params: {
      identifier: string
      password: string
    }): Promise<{ userId: string }> {
      const user = await deps.users.getUserByIdentifier(repoCtx, { identifier: params.identifier })

      // Mitigate timing attacks by always performing comparison
      const hashToCompare = user?.passwordHash ?? DUMMY_PASSWORD_HASH
      const isPasswordValid = await bcrypt.compare(params.password, hashToCompare)

      if (!user || !user.passwordHash) {
        throw new AuthError('INVALID_CREDENTIALS', 'Invalid credentials')
      }

      // Check password first to prevent user enumeration
      // If the password is not valid, we return a generic error immediately.
      // We don't want to leak if the account is disabled or locked.
      if (!isPasswordValid) {
        const current = user.failedLoginCount ?? 0
        const next = Math.min(current + 1, env.AUTH_LOGIN_LOCK_THRESHOLD)
        const lockedUntil = next >= env.AUTH_LOGIN_LOCK_THRESHOLD
          ? addSecondsToIso(env.AUTH_LOGIN_LOCK_DURATION_SECONDS)
          : null

        await deps.users.recordLoginFailure(repoCtx, {
          userId: user.id,
          failedLoginCount: next,
          lockedUntil,
        })

        // Always return generic error even if account is locked/disabled
        throw new AuthError('INVALID_CREDENTIALS', 'Invalid credentials')
      }

      // Now that we know the password is correct, we can check status/lock.
      if (user.status && user.status !== 'active') {
        throw new AuthError('ACCOUNT_DISABLED', 'Account disabled')
      }

      if (isLockedUntil(user.lockedUntil)) {
        throw new AuthError('LOCKED', 'Account locked', { lockedUntil: user.lockedUntil })
      }

      await deps.users.resetLoginFailures(repoCtx, { userId: user.id })

      return { userId: user.id }
    },

    async loginUser(params: {
      userId: string
      ctx: AuthContext
    }): Promise<LoginResult> {
      // Re-verify user status as a safety measure
      const user = await deps.users.getUserById(repoCtx, { userId: params.userId })
      if (!user) {
        throw new AuthError('INVALID_CREDENTIALS', 'User not found')
      }

      if (user.status && user.status !== 'active') {
        throw new AuthError('ACCOUNT_DISABLED', 'Account disabled')
      }

      return issueSession({ userId: params.userId, ctx: params.ctx })
    },

    async loginWithPassword(params: {
      identifier: string
      password: string
      ctx: AuthContext
    }): Promise<LoginResult> {
      const { userId } = await this.validateCredentials({ identifier: params.identifier, password: params.password })
      logger.info({ action: 'auth.password_login', userId }, 'Password login')
      return issueSession({ userId, ctx: params.ctx })
    },

    /**
     * Function: loginWithWechat
     *
     * Description: 微信登录（仅负责身份识别和会话建立，不再处理资料补全）
     *
     * Parameters:
     *   params.code(string): 微信小程序登录 code
     *   params.ctx(AuthContext): 认证上下文（包含 userAgent 和 clientIp）
     *
     * Returns:
     *   LoginResult: 登录结果（包含 userId、accessToken、refreshToken、sessionId）
     *
     * 注意:
     *   - 第一阶段：保留对 profile 参数的兼容，但不再使用
     *   - 第二阶段：完全移除 profile 参数
     */
    async loginWithWechat(params: {
      code: string
      ctx: AuthContext
      profile?: {
        nickname?: string
        avatarUrl?: string
      }
    }): Promise<LoginResult> {
      // 调用微信 code2Session 接口获取 openid 和 session_key
      const session = await deps.wechatOauth.code2Session(params.code)

      // 查找已有微信账号
      const existing = await deps.wechatAccounts.findByOpenid(repoCtx, { openid: session.openid })

      if (existing) {
        // 更新已有账号的 session_key
        const encryptedSessionKey = encryptSessionKey(session.session_key)
        await deps.wechatAccounts.updateSessionKey(repoCtx, {
          userId: existing.userId,
          sessionKey: encryptedSessionKey,
        })

        logger.info({ action: 'auth.wechat_login', userId: existing.userId }, 'WeChat login')
        return issueSession({ userId: existing.userId, ctx: params.ctx })
      }

      // 创建新用户（不再接收昵称头像，不再自动生成 wx_xxx 用户名）
      const user = await deps.users.createUserForWechat(repoCtx, {
        input: {
          username: null, // 允许 username 为空，后续由用户主动补全
          avatarUrl: null,
        },
      })

      // 加密并存储 session_key
      const encryptedSessionKey = encryptSessionKey(session.session_key)

      // 创建微信账号
      await deps.wechatAccounts.createAccount(repoCtx, {
        userId: user.id,
        openid: session.openid,
        unionid: session.unionid ?? null,
        sessionKey: encryptedSessionKey,
      })

      await ensureDefaultRoleAssigned(user.id)

      logger.info({ action: 'auth.wechat_signup', userId: user.id }, 'WeChat signup')

      return issueSession({ userId: user.id, ctx: params.ctx })
    },

    async refreshSession(params: {
      refreshToken: string
      ctx: AuthContext
    }): Promise<LoginResult> {
      const tokenHash = TokenManager.hashRefreshToken(params.refreshToken)
      const current = await deps.sessions.getSessionByRefreshTokenHash(repoCtx, { refreshTokenHash: tokenHash })

      if (!current || !TokenManager.verifyRefreshToken(params.refreshToken, current.refreshTokenHash)) {
        throw new AuthError('UNAUTHORIZED', 'Unauthorized')
      }

      const expired = new Date(current.expiresAt).getTime() <= Date.now()
      if (current.isRevoked || expired) {
        throw new AuthError('UNAUTHORIZED', 'Unauthorized')
      }

      const isRotated = Boolean(current.rotatedAt) || Boolean(current.replacedBySessionId)
      if (isRotated) {
        // TODO(P2): 改为 revokeSessionFamily 仅撤销同族会话，避免攻击者利用旧 token 发起 DoS
        await deps.sessions.revokeAllSessionsForUser(repoCtx, { userId: current.userId })
        throw new AuthError('SESSION_REUSE_DETECTED', 'Session reuse detected')
      }

      const roles = await deps.rbac.getRolesForUser(repoCtx, { userId: current.userId })
      const roleNames = roles.map((r) => r.name)

      const { token: newRefreshToken, tokenHash: newTokenHash } = TokenManager.createRefreshToken()
      const newExpiresAt = addSecondsToIso(env.AUTH_REFRESH_TTL_SECONDS)

      await deps.sessions.refreshSessionToken(repoCtx, {
        sessionId: current.id,
        newRefreshTokenHash: newTokenHash,
        newExpiresAt,
      })

      const accessToken = await TokenManager.signAccessToken(
        { sub: current.userId, sessionId: current.id, roles: roleNames },
        env.AUTH_ACCESS_TTL_SECONDS,
      )

      logger.info({ action: 'auth.refresh', userId: current.userId, sessionId: current.id }, 'Token refreshed')

      return {
        userId: current.userId,
        accessToken,
        refreshToken: newRefreshToken,
        sessionId: current.id,
      }
    },

    async logout(params: { refreshToken: string | null }) {
      if (!params.refreshToken) return

      const tokenHash = TokenManager.hashRefreshToken(params.refreshToken)
      const current = await deps.sessions.getSessionByRefreshTokenHash(repoCtx, { refreshTokenHash: tokenHash })
      
      if (!current || !TokenManager.verifyRefreshToken(params.refreshToken, current.refreshTokenHash)) {
        return
      }

      await deps.sessions.revokeSession(repoCtx, { sessionId: current.id })
      logger.info({ action: 'auth.logout', userId: current.userId }, 'Logout')
    },

    async loginWithMfa(params: {
      userId: string
      ctx: AuthContext
    }): Promise<LoginResult> {
      // 验证用户存在且状态正常
      const user = await deps.users.getUserById(repoCtx, { userId: params.userId })
      if (!user) {
        throw new AuthError('INVALID_CREDENTIALS', 'User not found')
      }

      if (user.status && user.status !== 'active') {
        throw new AuthError('ACCOUNT_DISABLED', 'Account disabled')
      }

      logger.info({ action: 'auth.mfa_login', userId: params.userId }, 'MFA login')

      return issueSession({ userId: params.userId, ctx: params.ctx })
    },

    async getMe(userId: string): Promise<MeResponse> {
      const user = await deps.users.getUserById(repoCtx, { userId })
      if (!user) {
        throw new AuthError('UNAUTHORIZED', 'Unauthorized')
      }

      const roles = await deps.rbac.getRolesForUser(repoCtx, { userId })
      const grants = await deps.rbac.getGrantsForUser(repoCtx, { userId })

      logger.info({ action: 'getMe', userId }, 'getMe result')

      const meUser: MeUserDto = {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        userType: user.userType,
        canUpload: user.canUpload,
      }

      return {
        user: meUser,
        roles: roles.map((r) => ({ id: r.id, name: r.name, description: r.description ?? undefined })),
        grants,
      }
    },

    /**
     * Function: completeWechatProfile
     *
     * Description: 补全微信用户展示资料（昵称和头像）
     *
     * Parameters:
     *   params.userId(string): 用户 ID
     *   params.nickname(string): 用户昵称（展示名称，不唯一）
     *   params.avatarUrl(string): 头像 URL
     *
     * Returns:
     *   void: 无返回值
     *
     * 注意:
     *   - 该方法仅用于补全展示资料，不涉及登录
     *   - nickname 不参与唯一性约束，可以直接更新
     */
    async completeWechatProfile(params: { userId: string; nickname: string; avatarUrl?: string }): Promise<void> {
      const user = await deps.users.getUserById(repoCtx, { userId: params.userId })
      if (!user) {
        throw new AuthError('UNAUTHORIZED', 'User not found')
      }

      logger.info(
        {
          action: 'auth.complete_wechat_profile',
          userId: params.userId,
          hasNickname: !!params.nickname,
          hasAvatar: !!params.avatarUrl,
        },
        'Complete WeChat profile',
      )

      await deps.users.updateWechatDisplayProfile(repoCtx, {
        userId: params.userId,
        nickname: params.nickname,
        avatarUrl: params.avatarUrl,
      })

      logger.info({ action: 'auth.wechat_profile_completed', userId: params.userId }, 'WeChat profile completed')
    },

    /**
     * Function: bindWechatPhone
     *
     * Description: 绑定微信用户手机号
     *
     * Parameters:
     *   params.userId(string): 用户 ID
     *   params.code(string): 微信手机号授权 code
     *
     * Returns:
     *   phone(string): 脱敏后的手机号（如：138****1234）
     *
     * 注意:
     *   - 该方法仅用于绑定手机号，不涉及登录
     *   - 使用微信新版服务端 API，不需要 session_key
     */
    async bindWechatPhone(params: { userId: string; code: string }): Promise<{ phone: string }> {
      const user = await deps.users.getUserById(repoCtx, { userId: params.userId })
      if (!user) {
        throw new AuthError('UNAUTHORIZED', 'User not found')
      }

      logger.info(
        {
          action: 'auth.bind_wechat_phone_start',
          userId: params.userId,
        },
        'Start binding WeChat phone',
      )

      // 调用微信接口获取手机号
      const { phone } = await getPhoneNumber(params.code)

      // 更新用户手机号
      try {
        await deps.users.updateUserPhone(repoCtx, {
          userId: params.userId,
          phone,
        })
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new ConflictError('该手机号已绑定其他账号')
        }

        throw error
      }

      // 脱敏手机号
      const maskedPhone = phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')

      logger.info(
        {
          action: 'auth.wechat_phone_bound',
          userId: params.userId,
          maskedPhone,
        },
        'WeChat phone bound successfully',
      )

      return { phone: maskedPhone }
    },
  }
}

/**
 * Type: AuthService
 *
 * Description: 认证服务类型，由 createAuthService 函数返回
 */
export type AuthService = ReturnType<typeof createAuthService>
