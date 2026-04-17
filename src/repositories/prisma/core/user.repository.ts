import { prisma } from '@/lib/prisma'
import type { UserRepository } from '@/repositories/interfaces/core/user.interface'
import type { AdminUserDetail } from '@/contracts/dtos/admin/user-detail.dto'
import type { AdminUserListItem, AdminUserListQuery } from '@/contracts/dtos/admin/users.dto'
import type { RepoContext } from '@/types/repo/repo-context'

function mapUser(u: Record<string, unknown>): AdminUserDetail {
  return {
    id: u.id as string,
    username: u.username as string | null,
    nickname: u.nickname as string | null,
    email: u.email as string | null,
    phone: u.phone as string | null,
    avatarUrl: u.avatarUrl as string | null,
    userType: u.userType as string | null,
    status: u.status as string,
    canUpload: (u.canUpload as boolean) ?? false,
    passwordHash: u.passwordHash as string | null,
    failedLoginCount: (u.failedLoginCount as number) ?? 0,
    lockedUntil: (u.lockedUntil as Date | null)?.toISOString() ?? null,
    passwordUpdatedAt: u.passwordUpdatedAt as string | null,
    // MFA 相关字段
    mfaEnabled: (u.mfaEnabled as boolean) ?? false,
    mfaSecret: u.mfaSecret as string | null,
    mfaBackupCodes: u.mfaBackupCodes as string | null,
    mfaSetupAt: u.mfaSetupAt as string | null,
    createdAt: (u.createdAt as Date)?.toISOString() ?? new Date().toISOString(),
    updatedAt: (u.updatedAt as Date)?.toISOString() ?? new Date().toISOString(),
  }
}

function mapUserListItem(u: Record<string, unknown>): AdminUserListItem {
  return {
    id: u.id as string,
    username: u.username as string | null,
    nickname: u.nickname as string | null,
    email: u.email as string | null,
    phone: u.phone as string | null,
    avatarUrl: u.avatarUrl as string | null,
    userType: u.userType as string | null,
    status: u.status as string,
    canUpload: (u.canUpload as boolean) ?? false,
    lockedUntil: (u.lockedUntil as Date | null)?.toISOString() ?? null,
    createdAt: (u.createdAt as Date)?.toISOString() ?? '',
  }
}

export function createPrismaUserRepository(): UserRepository {
  return {
    async getUserById(ctx: RepoContext, params: { userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_user_by_id', userId: params.userId })

      const user = await prisma.user.findUnique({ where: { id: params.userId } })
      if (!user) return null
      return mapUser(user)
    },

    async getUserByIdentifier(ctx: RepoContext, params: { identifier: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_user_by_identifier', identifier: params.identifier })

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: params.identifier },
            { email: params.identifier },
            { phone: params.identifier },
          ],
        },
      })
      if (!user) return null
      return mapUser(user)
    },

    async getUserAdminById(ctx: RepoContext, params: { userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_user_admin_by_id', userId: params.userId })

      const user = await prisma.user.findUnique({ where: { id: params.userId } })
      if (!user) return null
      return mapUser(user)
    },

    async updateUserStatus(ctx: RepoContext, params: { userId: string; status: string }) {
      const { logger } = ctx
      logger.info({ action: 'update_user_status', userId: params.userId, status: params.status })

      await prisma.user.update({ where: { id: params.userId }, data: { status: params.status } })
    },

    async updateUploadPermission(ctx: RepoContext, params: { userId: string; canUpload: boolean }) {
      const { logger } = ctx
      logger.info({ action: 'update_upload_permission', userId: params.userId, canUpload: params.canUpload })

      await prisma.user.update({ where: { id: params.userId }, data: { canUpload: params.canUpload } })
    },

    async listUsersWithCursor(ctx: RepoContext, params: { limit: number; cursor: string; keyword: string | undefined; status: string | undefined }): Promise<{ items: AdminUserListItem[]; nextCursor: string | null; totalCount: number }> {
      const { logger } = ctx
      logger.info({ action: 'list_users_cursor', limit: params.limit, cursor: params.cursor })

      const safeLimit = Math.max(1, Math.min(params.limit ?? 50, 50))

      const where: Record<string, unknown> = {}
      if (params.status) where.status = params.status
      if (params.keyword) {
        where.OR = [
          { username: { contains: params.keyword } },
          { email: { contains: params.keyword } },
          { phone: { contains: params.keyword } },
        ]
      }
      if (params.cursor) where.createdAt = { lt: new Date(params.cursor) }

      const items = await prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
      })

      const totalCount = await prisma.user.count({ where })

      return {
        items: items.map(mapUserListItem),
        nextCursor: items.length === safeLimit ? items[items.length - 1]?.createdAt.toISOString() ?? null : null,
        totalCount,
      }
    },

    async listUsers(ctx: RepoContext, params: AdminUserListQuery) {
      const { logger } = ctx
      logger.info({ action: 'list_users', limit: params.limit, offset: params.offset, cursor: params.cursor })

      const safeLimit = Math.max(1, Math.min(params.limit ?? 50, 50))
      const safeOffset = params.offset ?? 0

      const where: Record<string, unknown> = {}
      if (params.status) where.status = params.status
      if (params.keyword) {
        where.OR = [
          { username: { contains: params.keyword } },
          { email: { contains: params.keyword } },
          { phone: { contains: params.keyword } },
        ]
      }

      const [items, totalCount] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: safeLimit,
          skip: safeOffset,
        }),
        prisma.user.count({ where }),
      ])

      return {
        items: items.map(mapUserListItem),
        total: totalCount,
        offset: safeOffset,
        limit: safeLimit,
        nextCursor: items.length === safeLimit ? items[items.length - 1]?.createdAt.toISOString() ?? null : null,
      }
    },

    async resetLoginFailures(ctx: RepoContext, params: { userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'reset_login_failures', userId: params.userId })

      await prisma.user.update({
        where: { id: params.userId },
        data: { failedLoginCount: 0, lockedUntil: null },
      })
    },

    async recordLoginFailure(ctx: RepoContext, params: { userId: string; failedLoginCount: number; lockedUntil: string | null }) {
      const { logger } = ctx
      logger.info({ action: 'record_login_failure', userId: params.userId, count: params.failedLoginCount })

      await prisma.user.update({
        where: { id: params.userId },
        data: { failedLoginCount: params.failedLoginCount, lockedUntil: params.lockedUntil ? new Date(params.lockedUntil) : null },
      })
    },

    async createUserForWechat(ctx: RepoContext, params: { input?: { username?: string | null; avatarUrl?: string | null; userType?: string | null } }) {
      const { logger } = ctx
      logger.info({ action: 'create_user_for_wechat' })

      const user = await prisma.user.create({
        data: {
          status: 'active',
          username: params.input?.username ?? null,
          avatarUrl: params.input?.avatarUrl ?? null,
          userType: params.input?.userType ?? null,
        },
      })
      return mapUser(user)
    },

    async updateWechatProfile(ctx: RepoContext, params: { userId: string; username?: string; avatarUrl?: string }) {
      const { logger } = ctx
      logger.info({ action: 'update_wechat_profile', userId: params.userId })

      const data: { username?: string; avatarUrl?: string } = {}
      if (params.username) data.username = params.username
      if (params.avatarUrl) data.avatarUrl = params.avatarUrl

      if (Object.keys(data).length === 0) return

      await prisma.user.update({
        where: { id: params.userId },
        data,
      })
    },

    async getGlobalStats(ctx: RepoContext) {
      const { logger } = ctx
      logger.info({ action: 'get_global_stats' })

      const totalUsers = await prisma.user.count()
      return { totalUsers }
    },

    async findByEmail(ctx: RepoContext, params: { email: string }) {
      const { logger } = ctx
      logger.info({ action: 'find_by_email', email: params.email })

      const user = await prisma.user.findUnique({ where: { email: params.email } })
      if (!user) return null
      return mapUser(user)
    },

    async updateUserProfile(
      ctx: RepoContext,
      params: {
        userId: string
        username: string
        email: string
        phone?: string | null
        avatarUrl?: string | null
      }
    ) {
      const { logger } = ctx
      logger.info({ action: 'update_user_profile', userId: params.userId })

      const user = await prisma.user.update({
        where: { id: params.userId },
        data: {
          username: params.username,
          email: params.email,
          phone: params.phone ?? null,
          avatarUrl: params.avatarUrl ?? null,
        },
      })
      return mapUser(user)
    },

    async updatePassword(ctx: RepoContext, params: { userId: string; passwordHash: string }) {
      const { logger } = ctx
      logger.info({ action: 'update_password', userId: params.userId })

      await prisma.user.update({
        where: { id: params.userId },
        data: {
          passwordHash: params.passwordHash,
          passwordUpdatedAt: new Date(),
        },
      })
    },

    /**
     * Function: updateWechatDisplayProfile
     *
     * Description: 更新微信用户展示资料（昵称和头像）
     *
     * Parameters:
     *   ctx(RepoContext): 仓储上下文
     *   params.userId(string): 用户 ID
     *   params.nickname(string): 用户昵称（展示名称，不唯一）
     *   params.avatarUrl(string): 头像 URL
     *
     * Returns:
     *   void: 无返回值
     */
    async updateWechatDisplayProfile(
      ctx: RepoContext,
      params: { userId: string; nickname: string; avatarUrl: string }
    ) {
      const { logger } = ctx
      logger.info({ action: 'update_wechat_display_profile', userId: params.userId })

      await prisma.user.update({
        where: { id: params.userId },
        data: {
          nickname: params.nickname,
          avatarUrl: params.avatarUrl,
        },
      })
    },

    /**
     * Function: updateUserPhone
     *
     * Description: 更新用户手机号
     *
     * Parameters:
     *   ctx(RepoContext): 仓储上下文
     *   params.userId(string): 用户 ID
     *   params.phone(string): 手机号
     *
     * Returns:
     *   void: 无返回值
     */
    async updateUserPhone(ctx: RepoContext, params: { userId: string; phone: string }) {
      const { logger } = ctx
      logger.info({ action: 'update_user_phone', userId: params.userId })

      await prisma.user.update({
        where: { id: params.userId },
        data: {
          phone: params.phone,
        },
      })
    },
  }
}
