/**
 * File: src/services/session.service.ts
 * Description: Session 管理服务，提供会话查询和管理功能
 */

import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import type { SessionRepository } from '@/repositories/interfaces/core/session.interface'
import type { SessionListResponse } from '@/contracts/dtos/session.dto'

/**
 * Interface: SessionServiceDependencies
 *
 * Description: Session 服务依赖
 */
export interface SessionServiceDependencies {
  sessions: SessionRepository
}

/**
 * Function: createSessionService
 *
 * Description: 创建 Session 管理服务
 *
 * Parameters:
 *     deps(SessionServiceDependencies): 服务依赖
 *     ctx(ServiceContext): 服务上下文
 *
 * Returns:
 *     service(object): Session 管理服务对象
 */
export function createSessionService(
  deps: SessionServiceDependencies,
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    /**
     * 获取用户的所有会话
     */
    async getUserSessions(params: {
      userId: string
      includeRevoked?: boolean
      page?: number
      pageSize?: number
    }): Promise<SessionListResponse> {
      const { userId, includeRevoked = false, page = 1, pageSize = 20 } = params

      logger.info({ action: 'session.get_user_sessions', userId, page, pageSize }, '获取用户会话列表')

      const offset = (page - 1) * pageSize

      const [sessions, total] = await Promise.all([
        deps.sessions.getUserSessions(repoCtx, { userId, includeRevoked, limit: pageSize, offset }),
        deps.sessions.getUserSessionsCount(repoCtx, { userId, includeRevoked }),
      ])

      return { sessions, total, page, pageSize }
    },

    /**
     * 获取会话详情
     */
    async getSessionById(sessionId: string) {
      logger.info({ action: 'session.get_by_id', sessionId }, '获取会话详情')

      const session = await deps.sessions.getSessionById(repoCtx, { sessionId })

      if (!session) {
        throw new Error('会话不存在')
      }

      return session
    },

    /**
     * 撤销单个会话
     */
    async revokeSession(sessionId: string): Promise<void> {
      logger.info({ action: 'session.revoke', sessionId }, '撤销会话')

      await deps.sessions.revokeSession(repoCtx, { sessionId })
    },

    /**
     * 批量撤销会话
     */
    async revokeSessions(sessionIds: string[]): Promise<void> {
      logger.info({ action: 'session.revoke_batch', count: sessionIds.length }, '批量撤销会话')

      for (const sessionId of sessionIds) {
        await deps.sessions.revokeSession(repoCtx, { sessionId })
      }
    },
  }
}
