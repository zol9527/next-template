// src/services/admin-me.service.ts
import bcrypt from 'bcryptjs'
import type { ChangePasswordDto, UpdateProfileDto } from '@/contracts/dtos/admin/me'
import { ForbiddenError, ValidationError } from '@/lib/errors/app-error'
import type { SessionRepository } from '@/repositories/interfaces/core/session.interface'
import type { UserRepository } from '@/repositories/interfaces/core/user.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import type { ServiceContext } from '@/types/service/service-context'
import { getAvatarById } from '@/lib/constants/avatars'

export type AdminMeSessionItem = {
  id: string
  deviceInfo: string
  ipAddress: string
  lastActive: string
  isCurrent: boolean
}

/**
Function: createAdminMeService

Description: 创建管理员个人资料服务，提供获取/更新资料、修改密码、会话管理等能力

Parameters:
  deps(object): 依赖项
  deps.users(UserRepository): 用户仓储（用于读取/更新管理员用户信息）
  deps.sessions(SessionRepository): 会话仓储（用于查询/撤销会话）
  ctx(ServiceContext): 服务上下文

Returns:
  service(object): 管理员个人资料服务
*/
export function createAdminMeService(
  deps: {
    users: UserRepository
    sessions: SessionRepository
  },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  async function getAdminOrThrow(adminId: string) {
    const admin = await deps.users.getUserAdminById(repoCtx, { userId: adminId })
    if (!admin) {
      throw new ValidationError('管理员不存在')
    }
    return admin
  }

  return {
    async getCurrentProfile(adminId: string) {
      const admin = await getAdminOrThrow(adminId)

      return {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        phone: admin.phone,
        avatarUrl: admin.avatarUrl,
        mfaEnabled: admin.mfaEnabled,
        mfaSetupAt: admin.mfaSetupAt,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      }
    },

    async updateProfile(adminId: string, dto: UpdateProfileDto) {
      await getAdminOrThrow(adminId)

      const existing = await deps.users.findByEmail(repoCtx, { email: dto.email })
      if (existing && existing.id !== adminId) {
        throw new ValidationError('该邮箱已被使用')
      }

      // 处理头像：如果提供了 avatarId，使用预设本地头像；否则使用 avatarUrl
      let finalAvatarUrl = dto.avatarUrl || null
      if (finalAvatarUrl?.trim().startsWith('emoji:')) {
        finalAvatarUrl = null
      }
      if (dto.avatarId) {
        const avatar = getAvatarById(dto.avatarId)
        if (avatar) {
          finalAvatarUrl = avatar.src
        }
      }

      const updated = await deps.users.updateUserProfile(repoCtx, {
        userId: adminId,
        username: dto.username,
        email: dto.email,
        phone: dto.phone ? dto.phone : null,
        avatarUrl: finalAvatarUrl,
      })

      logger.info({ action: 'admin_me.update_profile', adminId }, '更新管理员个人资料')

      return updated
    },

    async changePassword(adminId: string, dto: ChangePasswordDto) {
      const admin = await getAdminOrThrow(adminId)

      if (!admin.passwordHash) {
        throw new ValidationError('当前账号未设置密码')
      }

      const isValid = await bcrypt.compare(dto.currentPassword, admin.passwordHash)
      if (!isValid) {
        throw new ValidationError('当前密码错误')
      }

      const newPasswordHash = await bcrypt.hash(dto.newPassword, 12)
      await deps.users.updatePassword(repoCtx, { userId: adminId, passwordHash: newPasswordHash })

      // 密码修改后强制所有会话失效（包含当前会话），要求重新登录
      await deps.sessions.revokeAllSessionsForUser(repoCtx, { userId: adminId })

      logger.info({ action: 'admin_me.change_password', adminId }, '管理员密码修改成功并撤销所有会话')
    },

    async getSessions(adminId: string, currentSessionId?: string): Promise<AdminMeSessionItem[]> {
      await getAdminOrThrow(adminId)

      const sessions = await deps.sessions.getUserSessions(repoCtx, {
        userId: adminId,
        includeRevoked: false,
        limit: 100,
        offset: 0,
      })

      return sessions.map((s) => ({
        id: s.id,
        deviceInfo: s.userAgent || '未知设备',
        ipAddress: s.clientIp || '-',
        lastActive: s.rotatedAt || s.createdAt,
        isCurrent: currentSessionId ? s.id === currentSessionId : false,
      }))
    },

    async revokeSession(adminId: string, sessionId: string): Promise<void> {
      await getAdminOrThrow(adminId)

      const session = await deps.sessions.getSessionById(repoCtx, { sessionId })
      if (!session) {
        throw new ValidationError('会话不存在')
      }
      if (session.userId !== adminId) {
        throw new ForbiddenError('无权操作此会话')
      }

      await deps.sessions.revokeSession(repoCtx, { sessionId })
    },

    async revokeAllOtherSessions(adminId: string, currentSessionId: string): Promise<void> {
      await getAdminOrThrow(adminId)
      if (!currentSessionId) {
        throw new ValidationError('当前会话不存在')
      }

      await deps.sessions.revokeAllSessionsExceptCurrent(repoCtx, {
        userId: adminId,
        currentSessionId,
      })
    },
  }
}

export type AdminMeService = ReturnType<typeof createAdminMeService>
