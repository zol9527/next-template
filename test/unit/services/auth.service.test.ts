/**
 * Unit: 认证服务测试
 *
 * Description: 测试认证服务的核心功能，包括登录、登出、会话刷新和用户信息获取
 */

import { describe, it, expect, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { createAuthService } from '@/services/core/auth.service'
import type { UserRepository } from '@/repositories/interfaces/user.interface'
import type { SessionRepository } from '@/repositories/interfaces/session.interface'
import type { WechatAccountRepository } from '@/repositories/interfaces/wechat-account.interface'
import type { RbacRepository } from '@/repositories/interfaces/rbac.interface'
import type { Session } from '@/contracts/dtos/session.dto'
import type { RoleDto } from '@/contracts/dtos/rbac'
import type pino from 'pino'

// 模拟日志记录器
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(() => mockLogger),
} as unknown as pino.Logger

// 模拟服务上下文
const mockServiceContext = {
  traceId: 'test-trace-id',
  logger: mockLogger,
}

/**
 * 创建模拟的用户仓库
 */
function createMockUserRepository(overrides?: Partial<UserRepository>): UserRepository {
  return {
    getUserById: vi.fn().mockResolvedValue(null),
    getUserByIdentifier: vi.fn().mockResolvedValue(null),
    getUserAdminById: vi.fn().mockResolvedValue(null),
    updateUserStatus: vi.fn().mockResolvedValue(undefined),
    updateUploadPermission: vi.fn().mockResolvedValue(undefined),
    listUsers: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    listUsersWithCursor: vi.fn().mockResolvedValue({ items: [], nextCursor: null, totalCount: 0 }),
    resetLoginFailures: vi.fn().mockResolvedValue(undefined),
    recordLoginFailure: vi.fn().mockResolvedValue(undefined),
    createUserForWechat: vi.fn().mockResolvedValue({
      id: 'new-user-id',
      username: 'new_user',
      nickname: null,
      email: null,
      phone: null,
      avatarUrl: null,
      userType: 'regular',
      status: 'active',
      passwordHash: null,
      failedLoginCount: 0,
      lockedUntil: null,
    }),
    updateWechatProfile: vi.fn().mockResolvedValue(undefined),
    getGlobalStats: vi.fn().mockResolvedValue({ totalUsers: 0 }),
    findByEmail: vi.fn().mockResolvedValue(null),
    updateUserProfile: vi.fn().mockResolvedValue(null as never),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    updateWechatDisplayProfile: vi.fn().mockResolvedValue(undefined),
    updateUserPhone: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

/**
 * 创建模拟的会话仓库
 */
function createMockSessionRepository(overrides?: Partial<SessionRepository>): SessionRepository {
  return {
    getSessionById: vi.fn().mockResolvedValue(null),
    getSessionByRefreshTokenHash: vi.fn().mockResolvedValue(null),
    createSession: vi.fn().mockResolvedValue({
      id: 'new-session-id',
      userId: 'user-123',
      refreshTokenHash: 'hash',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    }),
    rotateSession: vi.fn().mockResolvedValue(undefined),
    refreshSessionToken: vi.fn().mockResolvedValue(undefined),
    revokeSession: vi.fn().mockResolvedValue(undefined),
    revokeAllSessionsForUser: vi.fn().mockResolvedValue(undefined),
    revokeAllSessionsExceptCurrent: vi.fn().mockResolvedValue(undefined),
    revokeOldestSessions: vi.fn().mockResolvedValue(undefined),
    getUserSessions: vi.fn().mockResolvedValue([]),
    getUserSessionsCount: vi.fn().mockResolvedValue(0),
    ...overrides,
  }
}

/**
 * 创建模拟的微信账号仓库
 */
function createMockWechatAccountRepository(overrides?: Partial<WechatAccountRepository>): WechatAccountRepository {
  return {
    ...overrides,
    findByOpenid: overrides?.findByOpenid ?? vi.fn().mockResolvedValue(null),
    findByUserId: overrides?.findByUserId ?? vi.fn().mockResolvedValue(null),
    createAccount: overrides?.createAccount ?? vi.fn().mockResolvedValue(undefined),
    updateSessionKey: overrides?.updateSessionKey ?? vi.fn().mockResolvedValue(undefined),
  }
}

/**
 * 创建模拟的 RBAC 仓库
 */
function createMockRbacRepository(overrides?: Partial<RbacRepository>): RbacRepository {
  return {
    getRolesForUser: vi.fn().mockResolvedValue([]),
    getGrantsForUser: vi.fn().mockResolvedValue([]),
    getGrantsForRole: vi.fn().mockResolvedValue([]),
    setRoleGrants: vi.fn().mockResolvedValue(undefined),
    listRoles: vi.fn().mockResolvedValue([]),
    getRoleIdByName: vi.fn().mockResolvedValue('role-123'),
    assignRoleToUser: vi.fn().mockResolvedValue(undefined),
    removeRoleFromUser: vi.fn().mockResolvedValue(undefined),
    setRolesForUser: vi.fn().mockResolvedValue(undefined),
    createRole: vi.fn().mockResolvedValue({} as RoleDto),
    deleteRole: vi.fn().mockResolvedValue(undefined),
    countUsersWithRole: vi.fn().mockResolvedValue(0),
    ...overrides,
  }
}

/**
 * 创建模拟的微信 OAuth 提供者
 */
function createMockWechatOauth() {
  return {
    code2Session: vi.fn().mockResolvedValue({
      openid: 'wechat-openid-123',
      unionid: null,
      session_key: 'wechat-session-key-123',
    }),
  }
}

describe('认证服务测试', () => {
  const mockAuthContext = {
    userAgent: 'TestAgent/1.0',
    clientIp: '127.0.0.1',
  }

  describe('密码登录 (loginWithPassword)', () => {
    /**
     * Function: loginWithPassword (成功场景)
     *
     * Description: 测试使用有效凭据进行密码登录
     *
     * Parameters:
     *   params(object): 登录参数
     *   params.identifier(string): 用户标识符（用户名/邮箱/手机号）
     *   params.password(string): 用户密码
     *   params.ctx(object): 认证上下文
     *
     * Returns:
     *   result(LoginResult): 登录结果，包含用户 ID、访问令牌、刷新令牌和会话 ID
     */
    it('应该使用有效凭据成功登录', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123!', 10)
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        phone: '13800138000',
        avatarUrl: null,
        userType: 'regular',
        status: 'active',
        passwordHash,
        failedLoginCount: 0,
        lockedUntil: null,
      }

      const users = createMockUserRepository({
        getUserByIdentifier: vi.fn().mockResolvedValue(mockUser),
      })
      const sessions = createMockSessionRepository({
        createSession: vi.fn().mockResolvedValue({
          id: 'session-123',
          userId: 'user-123',
          refreshTokenHash: 'token-hash',
          isRevoked: false,
          expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        }),
      })
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository({
        getRolesForUser: vi.fn().mockResolvedValue([{ id: 'role-1', name: 'user', description: '普通用户' }]),
      })
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      const result = await authService.loginWithPassword({
        identifier: 'testuser',
        password: 'CorrectPassword123!',
        ctx: mockAuthContext,
      })

      expect(result).toBeDefined()
      expect(result.userId).toBe('user-123')
      expect(result.accessToken).toBeTypeOf('string')
      expect(result.refreshToken).toBeTypeOf('string')
      expect(result.sessionId).toBe('session-123')
      expect(users.resetLoginFailures).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        { userId: 'user-123' },
      )
    })

    /**
     * Function: loginWithPassword (用户不存在)
     *
     * Description: 测试使用不存在的用户标识符登录时抛出错误
     */
    it('应该拒绝不存在的用户', async () => {
      const users = createMockUserRepository({
        getUserByIdentifier: vi.fn().mockResolvedValue(null),
      })
      const sessions = createMockSessionRepository()
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository()
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      await expect(
        authService.loginWithPassword({
          identifier: 'nonexistent',
          password: 'password',
          ctx: mockAuthContext,
        }),
      ).rejects.toThrow('Invalid credentials')
    })

    /**
     * Function: loginWithPassword (密码错误)
     *
     * Description: 测试使用错误密码登录时抛出错误并记录失败
     */
    it('应该拒绝错误密码并记录失败', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123!', 10)
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        phone: '13800138000',
        avatarUrl: null,
        userType: 'regular',
        status: 'active',
        passwordHash,
        failedLoginCount: 0,
        lockedUntil: null,
      }

      const users = createMockUserRepository({
        getUserByIdentifier: vi.fn().mockResolvedValue(mockUser),
      })
      const sessions = createMockSessionRepository()
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository()
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      await expect(
        authService.loginWithPassword({
          identifier: 'testuser',
          password: 'WrongPassword123!',
          ctx: mockAuthContext,
        }),
      ).rejects.toThrow('Invalid credentials')

      expect(users.recordLoginFailure).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        { userId: 'user-123', failedLoginCount: 1, lockedUntil: null },
      )
    })

    /**
     * Function: loginWithPassword (账户锁定)
     *
    * Description: 测试登录失败 10 次后账户被锁定
     */
      it('应该在 10 次失败后锁定账户', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123!', 10)
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        phone: '13800138000',
        avatarUrl: null,
        userType: 'regular',
        status: 'active',
        passwordHash,
        failedLoginCount: 9, // 第 9 次失败
        lockedUntil: null,
      }

      const users = createMockUserRepository({
        getUserByIdentifier: vi.fn().mockResolvedValue(mockUser),
      })
      const sessions = createMockSessionRepository()
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository()
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      await expect(
        authService.loginWithPassword({
          identifier: 'testuser',
          password: 'WrongPassword123!',
          ctx: mockAuthContext,
        }),
      ).rejects.toThrow('Invalid credentials')

      expect(users.recordLoginFailure).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        expect.objectContaining({
          userId: 'user-123',
          failedLoginCount: 10,
          lockedUntil: expect.any(String),
        }),
      )
    })

    /**
     * Function: loginWithPassword (已锁定账户)
     *
     * Description: 测试已锁定账户无法登录
     */
    it('应该拒绝已锁定账户的登录尝试', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123!', 10)
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        phone: '13800138000',
        avatarUrl: null,
        userType: 'regular',
        status: 'active',
        passwordHash,
        failedLoginCount: 5,
        lockedUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 小时后解锁
      }

      const users = createMockUserRepository({
        getUserByIdentifier: vi.fn().mockResolvedValue(mockUser),
      })
      const sessions = createMockSessionRepository()
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository()
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      await expect(
        authService.loginWithPassword({
          identifier: 'testuser',
          password: 'CorrectPassword123!',
          ctx: mockAuthContext,
        }),
      ).rejects.toThrow('Account locked')
    })

    /**
     * Function: loginWithPassword (禁用账户)
     *
     * Description: 测试禁用账户无法登录
     */
    it('应该拒绝禁用账户的登录尝试', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123!', 10)
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        phone: '13800138000',
        avatarUrl: null,
        userType: 'regular',
        status: 'disabled',
        passwordHash,
        failedLoginCount: 0,
        lockedUntil: null,
      }

      const users = createMockUserRepository({
        getUserByIdentifier: vi.fn().mockResolvedValue(mockUser),
      })
      const sessions = createMockSessionRepository()
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository()
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      await expect(
        authService.loginWithPassword({
          identifier: 'testuser',
          password: 'CorrectPassword123!',
          ctx: mockAuthContext,
        }),
      ).rejects.toThrow('Account disabled')
    })

    /**
     * Function: loginWithPassword (timing attack mitigation)
     *
     * Description: 测试即使用户不存在也应该尝试验证密码，以防止计时攻击
     */
    it('应该尝试验证密码即使所提供的用户不存在（防止计时攻击）', async () => {
      const users = createMockUserRepository({
        getUserByIdentifier: vi.fn().mockResolvedValue(null),
      })
      const sessions = createMockSessionRepository()
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository()
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      const compareSpy = vi.spyOn(bcrypt, 'compare')

      await expect(
        authService.loginWithPassword({
          identifier: 'nonexistent',
          password: 'password',
          ctx: mockAuthContext,
        }),
      ).rejects.toThrow('Invalid credentials')

      // 验证 bcrypt.compare 是否被调用
      expect(compareSpy).toHaveBeenCalled()
    })
  })

  describe('凭据验证 (validateCredentials)', () => {
    /**
     * Function: validateCredentials (成功场景)
     *
     * Description: 测试使用有效凭据验证成功并返回 userId
     */
    it('应该使用有效凭据验证成功并返回 userId', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123!', 10)
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        phone: '13800138000',
        avatarUrl: null,
        userType: 'regular',
        status: 'active',
        passwordHash,
        failedLoginCount: 0,
        lockedUntil: null,
      }

      const users = createMockUserRepository({
        getUserByIdentifier: vi.fn().mockResolvedValue(mockUser),
      })
      const sessions = createMockSessionRepository()
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository()
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      const result = await authService.validateCredentials({
        identifier: 'testuser',
        password: 'CorrectPassword123!',
      })

      expect(result).toBeDefined()
      expect(result.userId).toBe('user-123')
      expect(users.resetLoginFailures).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        { userId: 'user-123' },
      )
    })
  })

  describe('用户登录 (loginUser)', () => {
    /**
     * Function: loginUser (成功场景)
     *
     * Description: 测试为指定用户 ID 发布会话
     */
    it('应该为有效用户发布会话', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        status: 'active',
      }

      const users = createMockUserRepository({
        getUserById: vi.fn().mockResolvedValue(mockUser),
      })
      const sessions = createMockSessionRepository({
        createSession: vi.fn().mockResolvedValue({
          id: 'session-123',
          userId: 'user-123',
          refreshTokenHash: 'token-hash',
          isRevoked: false,
          expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        }),
      })
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository({
        getRolesForUser: vi.fn().mockResolvedValue([{ id: 'role-1', name: 'user', description: '普通用户' }]),
      })
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      const result = await authService.loginUser({
        userId: 'user-123',
        ctx: mockAuthContext,
      })

      expect(result).toBeDefined()
      expect(result.userId).toBe('user-123')
      expect(result.sessionId).toBe('session-123')
      expect(sessions.createSession).toHaveBeenCalled()
    })

    /**
     * Function: loginUser (用户不存在)
     */
    it('应该拒绝不存在的用户', async () => {
      const users = createMockUserRepository({
        getUserById: vi.fn().mockResolvedValue(null),
      })
      const sessions = createMockSessionRepository()
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository()
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      await expect(
        authService.loginUser({
          userId: 'nonexistent',
          ctx: mockAuthContext,
        }),
      ).rejects.toThrow('User not found')
    })
  })

  describe('微信登录 (loginWithWechat)', () => {
    /**
     * Function: loginWithWechat (已存在用户)
     *
     * Description: 测试使用微信登录已注册的用户
     *
     * Parameters:
     *   params(object): 微信登录参数
     *   params.code(string): 微信授权码
     *   params.ctx(object): 认证上下文
     *
     * Returns:
     *   result(LoginResult): 登录结果
     */
    it('应该为已存在的微信用户成功登录', async () => {
      const sessions = createMockSessionRepository({
        createSession: vi.fn().mockResolvedValue({
          id: 'session-123',
          userId: 'user-123',
          refreshTokenHash: 'token-hash',
          isRevoked: false,
          expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        }),
      })
      const users = createMockUserRepository()
      const wechatAccounts = createMockWechatAccountRepository({
        findByOpenid: vi.fn().mockResolvedValue({
          userId: 'user-123',
          openid: 'wechat-openid-123',
          unionid: null,
        }),
      })
      const rbac = createMockRbacRepository({
        getRolesForUser: vi.fn().mockResolvedValue([{ id: 'role-1', name: 'user', description: '普通用户' }]),
      })
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      const result = await authService.loginWithWechat({
        code: 'wechat-auth-code',
        ctx: mockAuthContext,
      })

      expect(result).toBeDefined()
      expect(result.userId).toBe('user-123')
      expect(wechatOauth.code2Session).toHaveBeenCalledWith('wechat-auth-code')
    })

    /**
     * Function: loginWithWechat (新用户注册)
     *
     * Description: 测试使用微信登录新用户时自动创建账户
     */
    it('应该为新的微信用户创建账户', async () => {
      const sessions = createMockSessionRepository({
        createSession: vi.fn().mockResolvedValue({
          id: 'session-123',
          userId: 'new-user-id',
          refreshTokenHash: 'token-hash',
          isRevoked: false,
          expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        }),
      })
      const users = createMockUserRepository({
        createUserForWechat: vi.fn().mockResolvedValue({
          id: 'new-user-id',
          username: 'new_user',
          email: null,
          phone: null,
          avatarUrl: null,
          userType: 'regular',
          status: 'active',
          passwordHash: null,
          failedLoginCount: 0,
          lockedUntil: null,
        }),
      })
      const wechatAccounts = createMockWechatAccountRepository({
        findByOpenid: vi.fn().mockResolvedValue(null),
        createAccount: vi.fn().mockResolvedValue(undefined),
      })
      const rbac = createMockRbacRepository({
        getRolesForUser: vi.fn().mockResolvedValue([{ id: 'role-1', name: 'user', description: '普通用户' }]),
      })
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      const result = await authService.loginWithWechat({
        code: 'wechat-auth-code',
        ctx: mockAuthContext,
      })

      expect(result).toBeDefined()
      expect(result.userId).toBe('new-user-id')
      expect(users.createUserForWechat).toHaveBeenCalled()
      expect(wechatAccounts.createAccount).toHaveBeenCalled()
      expect(rbac.assignRoleToUser).toHaveBeenCalled()
    })
  })

  describe('会话刷新 (refreshSession)', () => {
    /**
     * Function: refreshSession (成功场景)
     *
     * Description: 测试使用有效的刷新令牌刷新会话
     *
     * Parameters:
     *   params(object): 刷新参数
     *   params.refreshToken(string): 刷新令牌
     *   params.ctx(object): 认证上下文
     *
     * Returns:
     *   result(LoginResult): 新的登录结果
     */
    it('应该使用有效的刷新令牌成功刷新会话', async () => {
      // 导入 TokenManager 以生成一致的哈希值
      const { TokenManager } = await import('@/lib/security/token-manager')
      const validTokenHash = TokenManager.hashRefreshToken('valid-refresh-token')

      const mockSession: Session = {
        id: 'old-session-id',
        userId: 'user-123',
        refreshTokenHash: validTokenHash,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      }

      const users = createMockUserRepository()
      const sessions = createMockSessionRepository({
        getSessionByRefreshTokenHash: vi.fn().mockResolvedValue(mockSession),
        refreshSessionToken: vi.fn().mockResolvedValue(undefined),
      })
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository({
        getRolesForUser: vi.fn().mockResolvedValue([{ id: 'role-1', name: 'user', description: '普通用户' }]),
      })
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      const result = await authService.refreshSession({
        refreshToken: 'valid-refresh-token',
        ctx: mockAuthContext,
      })

      expect(result).toBeDefined()
      expect(result.userId).toBe('user-123')
      expect(result.sessionId).toBe('old-session-id')
      expect(result.accessToken).toBeTypeOf('string')
      expect(result.refreshToken).toBeTypeOf('string')
      expect(sessions.refreshSessionToken).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        {
          sessionId: 'old-session-id',
          newRefreshTokenHash: expect.any(String),
          newExpiresAt: expect.any(String),
        },
      )
    })

    /**
     * Function: refreshSession (无效令牌)
     *
     * Description: 测试使用无效的刷新令牌时抛出错误
     */
    it('应该拒绝无效的刷新令牌', async () => {
      const users = createMockUserRepository()
      const sessions = createMockSessionRepository({
        getSessionByRefreshTokenHash: vi.fn().mockResolvedValue(null),
      })
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository()
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      await expect(
        authService.refreshSession({
          refreshToken: 'invalid-refresh-token',
          ctx: mockAuthContext,
        }),
      ).rejects.toThrow('Unauthorized')
    })

    /**
     * Function: refreshSession (已撤销会话)
     *
     * Description: 测试刷新已撤销的会话时抛出错误
     */
    it('应该拒绝已撤销会话的刷新请求', async () => {
      const mockSession: Session = {
        id: 'revoked-session-id',
        userId: 'user-123',
        refreshTokenHash: 'token-hash',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      }

      const users = createMockUserRepository()
      const sessions = createMockSessionRepository({
        getSessionByRefreshTokenHash: vi.fn().mockResolvedValue(mockSession),
      })
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository()
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      await expect(
        authService.refreshSession({
          refreshToken: 'refresh-token',
          ctx: mockAuthContext,
        }),
      ).rejects.toThrow('Unauthorized')
    })
  })

  describe('登出 (logout)', () => {
    /**
     * Function: logout (成功场景)
     *
     * Description: 测试使用刷新令牌成功登出
     *
     * Parameters:
     *   params(object): 登出参数
     *   params.refreshToken(string | null): 刷新令牌（可为空）
     */
    it('应该使用有效的刷新令牌成功登出', async () => {
      const { TokenManager } = await import('@/lib/security/token-manager')
      const validTokenHash = TokenManager.hashRefreshToken('valid-refresh-token')

      const mockSession: Session = {
        id: 'session-123',
        userId: 'user-123',
        refreshTokenHash: validTokenHash,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      }

      const users = createMockUserRepository()
      const sessions = createMockSessionRepository({
        getSessionByRefreshTokenHash: vi.fn().mockResolvedValue(mockSession),
      })
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository()
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      await authService.logout({ refreshToken: 'valid-refresh-token' })

      expect(sessions.revokeSession).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        { sessionId: 'session-123' },
      )
    })

    /**
     * Function: logout (空令牌)
     *
     * Description: 测试使用空刷新令牌登出时不执行操作
     */
    it('应该在刷新令牌为空时静默返回', async () => {
      const users = createMockUserRepository()
      const sessions = createMockSessionRepository()
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository()
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      await expect(authService.logout({ refreshToken: null })).resolves.toBeUndefined()
      await expect(authService.logout({ refreshToken: '' })).resolves.toBeUndefined()
    })

    /**
     * Function: logout (无效令牌)
     *
     * Description: 测试使用无效令牌登出时静默返回
     */
    it('应该在令牌无效时静默返回', async () => {
      const users = createMockUserRepository()
      const sessions = createMockSessionRepository({
        getSessionByRefreshTokenHash: vi.fn().mockResolvedValue(null),
      })
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository()
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      await expect(
        authService.logout({ refreshToken: 'invalid-refresh-token' }),
      ).resolves.toBeUndefined()
    })
  })

  describe('获取用户信息 (getMe)', () => {
    /**
     * Function: getMe (成功场景)
     *
     * Description: 测试获取当前用户信息
     *
     * Parameters:
     *   userId(string): 用户 ID
     *
     * Returns:
     *   result(MeResponse): 包含用户、角色和权限的响应
     */
    it('应该聚合返回用户角色与权限信息', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        nickname: null,
        email: 'test@example.com',
        phone: '13800138000',
        avatarUrl: 'https://example.com/avatar.jpg',
        userType: 'regular',
        canUpload: true,
        status: 'active',
        passwordHash: null,
        failedLoginCount: 0,
        lockedUntil: null,
      }

      const users = createMockUserRepository({
        getUserById: vi.fn().mockResolvedValue(mockUser),
      })
      const sessions = createMockSessionRepository()
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository({
        getRolesForUser: vi.fn().mockResolvedValue([
          { id: 'role-1', name: 'user', description: '普通用户' },
          { id: 'role-2', name: 'admin', description: '管理员' },
        ]),
      })
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      const result = await authService.getMe('user-123')

      expect(result).toBeDefined()
      expect(result.user).toEqual({
        id: 'user-123',
        username: 'testuser',
        nickname: null,
        email: 'test@example.com',
        phone: '13800138000',
        avatarUrl: 'https://example.com/avatar.jpg',
        userType: 'regular',
        canUpload: true,
      })
      expect(result.roles).toEqual([
        { id: 'role-1', name: 'user', description: '普通用户' },
        { id: 'role-2', name: 'admin', description: '管理员' },
      ])
    })

    /**
     * Function: getMe (用户不存在)
     *
     * Description: 测试获取不存在用户的信息时抛出错误
     */
    it('应该在用户不存在时抛出错误', async () => {
      const users = createMockUserRepository({
        getUserById: vi.fn().mockResolvedValue(null),
      })
      const sessions = createMockSessionRepository()
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository()
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      await expect(authService.getMe('non-existent-user')).rejects.toThrow('Unauthorized')
    })
  })

  describe('会话活动性校验 (assertAccessSessionActive)', () => {
    /**
     * Function: assertAccessSessionActive (成功场景)
     *
     * Description: 测试校验活动会话成功
     *
     * Parameters:
     *   params(object): 校验参数
     *   params.userId(string): 用户 ID
     *   params.sessionId(string): 会话 ID
     */
    it('应该成功校验活动会话', async () => {
      const mockSession: Session = {
        id: 'session-123',
        userId: 'user-123',
        refreshTokenHash: 'token-hash',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      }

      const users = createMockUserRepository()
      const sessions = createMockSessionRepository({
        getSessionById: vi.fn().mockResolvedValue(mockSession),
      })
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository()
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      await expect(
        authService.assertAccessSessionActive({ userId: 'user-123', sessionId: 'session-123' }),
      ).resolves.toBeUndefined()
    })

    /**
     * Function: assertAccessSessionActive (会话不存在)
     *
     * Description: 测试校验不存在的会话时抛出错误
     */
    it('应该在会话不存在时抛出错误', async () => {
      const users = createMockUserRepository()
      const sessions = createMockSessionRepository({
        getSessionById: vi.fn().mockResolvedValue(null),
      })
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository()
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      await expect(
        authService.assertAccessSessionActive({ userId: 'user-123', sessionId: 'non-existent' }),
      ).rejects.toThrow('Unauthorized')
    })

    /**
     * Function: assertAccessSessionActive (用户 ID 不匹配)
     *
     * Description: 测试会话用户 ID 与 token 用户 ID 不匹配时抛出错误
     */
    it('应该在用户 ID 不匹配时抛出错误', async () => {
      const mockSession: Session = {
        id: 'session-123',
        userId: 'different-user-id',
        refreshTokenHash: 'token-hash',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      }

      const users = createMockUserRepository()
      const sessions = createMockSessionRepository({
        getSessionById: vi.fn().mockResolvedValue(mockSession),
      })
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository()
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      await expect(
        authService.assertAccessSessionActive({ userId: 'user-123', sessionId: 'session-123' }),
      ).rejects.toThrow('Unauthorized')
    })

    /**
     * Function: assertAccessSessionActive (已撤销会话)
     *
     * Description: 测试校验已撤销会话时抛出错误
     */
    it('应该在会话已撤销时抛出错误', async () => {
      const mockSession: Session = {
        id: 'session-123',
        userId: 'user-123',
        refreshTokenHash: 'token-hash',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      }

      const users = createMockUserRepository()
      const sessions = createMockSessionRepository({
        getSessionById: vi.fn().mockResolvedValue(mockSession),
      })
      const wechatAccounts = createMockWechatAccountRepository()
      const rbac = createMockRbacRepository()
      const wechatOauth = createMockWechatOauth()

      const authService = createAuthService(
        { users, sessions, wechatAccounts, rbac, wechatOauth },
        mockServiceContext,
      )

      await expect(
        authService.assertAccessSessionActive({ userId: 'user-123', sessionId: 'session-123' }),
      ).rejects.toThrow('Unauthorized')
    })
  })
})
