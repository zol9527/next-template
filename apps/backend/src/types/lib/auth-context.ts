import type { MeUserDto } from '@/contracts/dtos/auth/me.dto'
import type { RoleDto } from '@/contracts/dtos/rbac/role.dto'
import type { GrantDto } from '@/contracts/dtos/rbac/access.dto'
import type { Session } from '@/contracts/dtos/session.dto'

/**
 * Type: AuthContextValue
 *
 * Description: 认证上下文值类型，包含用户信息、认证状态、角色和会话管理
 *
 * Properties:
 *     user(MeUserDto | null): 当前用户信息，未登录时为 null
 *     isAuthenticated(boolean): 是否已登录
 *     isLoading(boolean): 是否正在加载用户信息
 *     error(Error | null): 错误信息
 *     grants(GrantDto[]): 结构化授权规则（从 getMe API 返回）
 *     roles(RoleDto[]): 用户角色列表
 *     login(Function): 登录方法
 *     logout(Function): 登出方法
 *     refreshSession(Function): 刷新会话方法
 *     refetch(Function): 重新获取用户信息方法
 *     hasRole(Function): 角色检查方法
 *     sessions(Session[]): 当前用户的所有活跃会话
 *     sessionsLoading(boolean): 是否正在加载会话列表
 *     sessionsError(Error | null): 会话列表加载错误
 *     revokeSession(Function): 撤销指定会话
 *     revokeOtherSessions(Function): 撤销其他设备的会话
 *     refreshSessions(Function): 刷新会话列表
 */
export interface AuthContextValue {
  // 用户信息
  user: MeUserDto | null

  // 认证状态
  isAuthenticated: boolean
  isLoading: boolean
  error: Error | null

  // 权限与角色
  grants: GrantDto[]
  roles: RoleDto[]

  // 方法
  login: (params: LoginParams) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<boolean>
  refetch: () => Promise<void>

  // 权限检查
  hasRole: (requiredRole: string) => boolean

  // Session 管理
  sessions: Session[]
  sessionsLoading: boolean
  sessionsError: Error | null
  revokeSession: (sessionId: string) => Promise<void>
  revokeOtherSessions: () => Promise<void>
  refreshSessions: () => Promise<void>
}

/**
 * Type: LoginParams
 *
 * Description: 登录参数（判别联合类型），支持密码登录和微信登录
 *
 * Variants:
 *     password: 密码登录 { type: 'password', identifier: string, password: string }
 *     wechat: 微信登录 { type: 'wechat', code: string }
 */
export type LoginParams =
  | { type: 'password'; identifier: string; password: string }
  | { type: 'wechat'; code: string }

// 导出类型供其他模块使用
export type { MeUserDto, RoleDto, GrantDto }
