import type { RepoContext } from '@/types/repo/repo-context'
import type { Session, CreateSessionInput } from '@/contracts/dtos/session.dto'

export interface SessionRepository {
  getSessionById(ctx: RepoContext, params: { sessionId: string }): Promise<Session | null>

  getSessionByRefreshTokenHash(ctx: RepoContext, params: { refreshTokenHash: string }): Promise<Session | null>

  createSession(ctx: RepoContext, params: { input: CreateSessionInput }): Promise<Session>

  rotateSession(ctx: RepoContext, params: {
    oldSessionId: string
    newSessionId: string
    rotatedAt: string
  }): Promise<void>

  /**
   * Function: refreshSessionToken
   *
   * Description: 原地刷新 session 的 refresh token（更新 refreshTokenHash 和 expiresAt），
   *              避免创建新记录，减少 DB 调用次数
   *
   * Parameters:
   *   ctx(RepoContext): 仓储上下文
   *   params.sessionId(string): 当前会话 ID
   *   params.newRefreshTokenHash(string): 新的 refresh token 哈希值
   *   params.newExpiresAt(string): 新的过期时间（ISO 格式）
   *
   * Returns:
   *   void: 无返回值
   */
  refreshSessionToken(ctx: RepoContext, params: {
    sessionId: string
    newRefreshTokenHash: string
    newExpiresAt: string
  }): Promise<void>

  revokeSession(ctx: RepoContext, params: { sessionId: string }): Promise<void>
  revokeAllSessionsForUser(ctx: RepoContext, params: { userId: string }): Promise<void>

  /**
   * Function: revokeAllSessionsExceptCurrent
   *
   * Description: 撤销指定用户除当前会话外的所有其他会话
   *
   * Parameters:
   *   ctx(RepoContext): 仓储上下文
   *   params.userId(string): 用户 ID
   *   params.currentSessionId(string): 当前会话 ID（保留）
   *
   * Returns:
   *   void: 无返回值
   */
  revokeAllSessionsExceptCurrent(ctx: RepoContext, params: { userId: string; currentSessionId: string }): Promise<void>

  revokeOldestSessions(ctx: RepoContext, params: {
    userId: string
    keepLatest: number
    nowIso: string
  }): Promise<void>

  /**
   * Function: getUserSessions
   *
   * Description: 获取指定用户的所有会话列表，支持分页和过滤已撤销的会话
   *
   * Parameters:
   *   ctx(RepoContext): 仓储上下文，包含日志等基础信息
   *   params.userId(string): 用户 ID
   *   params.includeRevoked(boolean): 是否包含已撤销的会话，默认为 false
   *   params.limit(number): 返回结果的最大数量，用于分页
   *   params.offset(number): 偏移量，用于分页跳过前面的记录
   *
   * Returns:
   *   sessions(Session[]): 会话列表，按创建时间倒序排列
   */
  getUserSessions(ctx: RepoContext, params: {
    userId: string
    includeRevoked?: boolean
    limit?: number
    offset?: number
  }): Promise<Session[]>

  /**
   * Function: getUserSessionsCount
   *
   * Description: 统计指定用户的会话总数，支持过滤已撤销的会话
   *
   * Parameters:
   *   ctx(RepoContext): 仓储上下文，包含日志等基础信息
   *   params.userId(string): 用户 ID
   *   params.includeRevoked(boolean): 是否包含已撤销的会话，默认为 false
   *
   * Returns:
   *   count(number): 会话总数
   */
  getUserSessionsCount(ctx: RepoContext, params: {
    userId: string
    includeRevoked?: boolean
  }): Promise<number>

  /**
   * Function: cleanupExpiredAndRevokedSessions
   *
   * Description: 清理已过期且已撤销的会话，释放存储空间
   *
   * Parameters:
   *   ctx(RepoContext): 仓储上下文
   *
   * Returns:
   *   deletedCount(number): 被删除的会话数量
   */
  cleanupExpiredAndRevokedSessions(ctx: RepoContext): Promise<number>
}
