import type { AdminUserListItem } from '@/contracts/dtos/admin/users.dto'
import type { SafeAdminUserDetail } from '@/contracts/dtos/admin/user-detail.dto'
import type { UserRepository } from '@/repositories/interfaces/core/user.interface'
import type { SessionRepository } from '@/repositories/interfaces/core/session.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'

/**
 * 管理员用户服务错误类
 */
export class AdminUserServiceError extends Error {
	public readonly code: 'CANNOT_DISABLE_SELF' | 'NOT_FOUND' | 'INTERNAL_ERROR'

	constructor(code: AdminUserServiceError['code'], message: string) {
		super(message)
		this.code = code
	}
}

export function createAdminUserService(
  deps: { users: UserRepository; sessions?: SessionRepository },
  ctx: ServiceContext,
  currentUserId?: string,
) {
  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    async listUsers(params?: {
      limit?: number
      offset?: number
      cursor?: string | null
      keyword?: string
      status?: string
    }): Promise<{ users: AdminUserListItem[]; total: number; offset: number; limit: number; nextCursor: string | null }> {
      const limit = Math.max(1, Math.min(params?.limit ?? 50, 50))
      const offset = Math.max(0, params?.offset ?? 0)
      const cursor = params?.cursor ?? null
      const keyword = params?.keyword?.trim() || undefined
      const status = params?.status?.trim() || undefined

      // 游标分页优先
      if (cursor) {
        const { items, nextCursor, totalCount } = await deps.users.listUsersWithCursor(repoCtx, {
          limit,
          cursor,
          keyword,
          status,
        })

        return {
          users: items.map((u) => ({
            id: u.id,
            username: u.username,
            nickname: u.nickname,
            email: u.email,
            phone: u.phone,
            avatarUrl: u.avatarUrl,
            userType: u.userType,
            status: u.status,
            canUpload: u.canUpload,
            lockedUntil: u.lockedUntil,
            createdAt: u.createdAt,
          })),
          total: totalCount,
          offset: 0,
          limit,
          nextCursor,
        }
      }

      // 向后兼容的 offset 分页
      const { items, total } = await deps.users.listUsers(repoCtx, {
        limit,
        offset,
        keyword,
        status,
      })

      return {
        users: items.map((u) => ({
          id: u.id,
          username: u.username,
          nickname: u.nickname,
          email: u.email,
          phone: u.phone,
          avatarUrl: u.avatarUrl,
          userType: u.userType,
          status: u.status,
          canUpload: u.canUpload,
          lockedUntil: u.lockedUntil,
          createdAt: u.createdAt,
        })),
        total,
        offset,
        limit,
        nextCursor: null,
      }
    },

    async getUserDetail(userId: string): Promise<SafeAdminUserDetail | null> {
      const u = await deps.users.getUserAdminById(repoCtx, { userId })
      if (!u) return null

      ctx.logger.info({
        audit: true,
        actorId: currentUserId ?? 'unknown',
        action: 'user.pii_access',
        target: userId,
        timestamp: new Date().toISOString(),
      }, '管理员访问用户 PII 数据')

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, mfaSecret, mfaBackupCodes, ...safeUser } = u
      return safeUser
    },

    async disableUser(userId: string): Promise<{ userId: string; status: 'disabled'; revokedAllSessions: boolean }> {
      // 业务规则：管理员不能将自己设置为禁用状态
      if (currentUserId && userId === currentUserId) {
        ctx.logger.warn(
          { action: 'admin.disable_user.self_forbidden', targetUserId: userId },
          '管理员尝试禁用自己，已阻止该操作'
        )
        throw new AdminUserServiceError(
          'CANNOT_DISABLE_SELF',
          '管理员不能将自己设置为禁用状态'
        )
      }

      await deps.users.updateUserStatus(repoCtx, { userId, status: 'disabled' })

      if (deps.sessions) {
        await deps.sessions.revokeAllSessionsForUser(repoCtx, { userId })
        return { userId, status: 'disabled', revokedAllSessions: true }
      }

      return { userId, status: 'disabled', revokedAllSessions: false }
    },

    async enableUser(userId: string): Promise<{ userId: string; status: 'active'; revokedAllSessions: boolean }> {
      await deps.users.updateUserStatus(repoCtx, { userId, status: 'active' })
      return { userId, status: 'active', revokedAllSessions: false }
    },

    async unlockUser(userId: string): Promise<SafeAdminUserDetail | null> {
      await deps.users.resetLoginFailures(repoCtx, { userId })
      return this.getUserDetail(userId)
    },

    async revokeUserSessions(userId: string): Promise<SafeAdminUserDetail | null> {
      if (!deps.sessions) {
        throw new Error('Session repository is not configured')
      }

      await deps.sessions.revokeAllSessionsForUser(repoCtx, { userId })
      return this.getUserDetail(userId)
    },

    /**
     * 设置用户上传权限
     *
     * Function: setUploadPermission
     *
     * Description: 设置指定用户的图片上传权限状态
     *
     * Parameters:
     *   userId(string): 用户 ID
     *   canUpload(boolean): 是否允许上传
     *
     * Returns:
     *   result(object): 包含用户 ID 和上传权限状态
     */
    async setUploadPermission(userId: string, canUpload: boolean): Promise<{ userId: string; canUpload: boolean }> {
      ctx.logger.info({ action: 'admin.set_upload_permission', targetUserId: userId, canUpload }, '设置用户上传权限')

      // 验证用户是否存在
      const user = await deps.users.getUserAdminById(repoCtx, { userId })
      if (!user) {
        throw new AdminUserServiceError('NOT_FOUND', '用户不存在')
      }

      await deps.users.updateUploadPermission(repoCtx, { userId, canUpload })
      return { userId, canUpload }
    },
  }
}
