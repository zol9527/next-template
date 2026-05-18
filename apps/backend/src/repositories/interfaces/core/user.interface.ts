import type { RepoContext } from '@/types/repo/repo-context'
import type { AdminUserDetail } from '@/contracts/dtos/admin/user-detail.dto'
import type { AdminUserListItem, AdminUserListQuery } from '@/contracts/dtos/admin/users.dto'

export type UserAdminDetailRecord = AdminUserDetail

export interface UserRepository {
  getUserById(ctx: RepoContext, params: { userId: string }): Promise<AdminUserDetail | null>
  getUserByIdentifier(ctx: RepoContext, params: { identifier: string }): Promise<AdminUserDetail | null>

  getUserAdminById(ctx: RepoContext, params: { userId: string }): Promise<AdminUserDetail | null>

  updateUserStatus(ctx: RepoContext, params: { userId: string; status: string }): Promise<void>
	updateUploadPermission(ctx: RepoContext, params: { userId: string; canUpload: boolean }): Promise<void>

  listUsers(ctx: RepoContext, params: AdminUserListQuery): Promise<{ items: AdminUserListItem[]; total: number; offset: number; limit: number; nextCursor: string | null }>
  listUsersWithCursor(ctx: RepoContext, params: { limit: number; cursor: string; keyword: string | undefined; status: string | undefined; role?: string }): Promise<{ items: AdminUserListItem[]; nextCursor: string | null; totalCount: number }>

  resetLoginFailures(ctx: RepoContext, params: { userId: string }): Promise<void>
  recordLoginFailure(ctx: RepoContext, params: {
    userId: string
    failedLoginCount: number
    lockedUntil: string | null
  }): Promise<void>

  createUserForWechat(ctx: RepoContext, params: { input?: { username?: string | null; avatarUrl?: string | null; userType?: string | null } }): Promise<AdminUserDetail>

  /**
   * Function: updateWechatProfile
   *
   * Description: 微信登录时更新用户资料（用户名/头像）
   *
   * Parameters:
   *   ctx(RepoContext): 仓储上下文
   *   params.userId(string): 用户 ID
   *   params.username?(string): 用户名（可选）
   *   params.avatarUrl?(string): 头像 URL（可选）
   *
   * Returns:
   *   void: 无返回值
   */
  updateWechatProfile(ctx: RepoContext, params: { userId: string; username?: string; avatarUrl?: string }): Promise<void>

  getGlobalStats(ctx: RepoContext): Promise<{ totalUsers: number }>

  /**
   * Function: findByEmail
   *
   * Description: 根据邮箱查找用户
   *
   * Parameters:
   *   ctx(RepoContext): 仓储上下文
   *   params.email(string): 邮箱地址
   *
   * Returns:
   *   user(AdminUserDetail | null): 用户信息，不存在则返回 null
   */
  findByEmail(ctx: RepoContext, params: { email: string }): Promise<AdminUserDetail | null>

  /**
   * Function: updateUserProfile
   *
   * Description: 更新用户资料
   *
   * Parameters:
   *   ctx(RepoContext): 仓储上下文
   *   params.userId(string): 用户 ID
   *   params.username(string): 用户名
   *   params.email(string): 邮箱地址
   *   params.phone?(string): 手机号
   *   params.avatarUrl?(string): 头像 URL
   *
   * Returns:
   *   user(AdminUserDetail): 更新后的用户信息
   */
  updateUserProfile(
    ctx: RepoContext,
    params: {
      userId: string
      username: string
      email: string
      phone?: string | null
      avatarUrl?: string | null
    }
  ): Promise<AdminUserDetail>

  /**
   * Function: updatePassword
   *
   * Description: 更新用户密码
   *
   * Parameters:
   *   ctx(RepoContext): 仓储上下文
   *   params.userId(string): 用户 ID
   *   params.passwordHash(string): 新密码哈希
   *
   * Returns:
   *   void: 无返回值
   */
  updatePassword(ctx: RepoContext, params: { userId: string; passwordHash: string }): Promise<void>

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
  updateWechatDisplayProfile(
    ctx: RepoContext,
    params: { userId: string; nickname: string; avatarUrl?: string }
  ): Promise<void>

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
  updateUserPhone(ctx: RepoContext, params: { userId: string; phone: string }): Promise<void>

  /**
   * Function: updateUserAdmin
   *
   * Description: 管理员更新用户基本信息（昵称、邮箱、手机号、状态）
   *
   * Parameters:
   *   ctx(RepoContext): 仓储上下文
   *   params.userId(string): 用户 ID
   *   params.nickname?(string): 昵称
   *   params.email?(string): 邮箱
   *   params.phone?(string): 手机号
   *   params.status?(string): 账户状态
   *
   * Returns:
   *   user(AdminUserDetail): 更新后的用户信息
   */
  updateUserAdmin(
    ctx: RepoContext,
    params: {
      userId: string
      nickname?: string
      email?: string
      phone?: string
      status?: string
    }
  ): Promise<AdminUserDetail>
}
