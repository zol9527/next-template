import { prisma } from '@/lib/prisma'
import type { SessionRepository } from '@/repositories/interfaces/core/session.interface'
import type { Session, CreateSessionInput } from '@/contracts/dtos/session.dto'
import type { RepoContext } from '@/types/repo/repo-context'

function mapSession(s: {
  id: string
  userId: string
  refreshTokenHash: string
  replacedBySessionId: string | null
  rotatedAt: Date | null
  userAgent: string | null
  clientIp: string | null
  isRevoked: boolean
  expiresAt: Date
  createdAt: Date
}): Session {
  return {
    id: s.id,
    userId: s.userId,
    refreshTokenHash: s.refreshTokenHash,
    replacedBySessionId: s.replacedBySessionId,
    rotatedAt: s.rotatedAt?.toISOString() ?? null,
    userAgent: s.userAgent,
    clientIp: s.clientIp,
    isRevoked: s.isRevoked,
    expiresAt: s.expiresAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
  }
}

/**
Function: createPrismaSessionRepository

Description: 创建基于 Prisma 的会话仓储实现

Parameters:

Returns:
    repository(SessionRepository): SessionRepository 的 Prisma 实现
*/
export function createPrismaSessionRepository(): SessionRepository {
  return {
    async getSessionById(ctx: RepoContext, params: { sessionId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_session_by_id', sessionId: params.sessionId })

      const session = await prisma.session.findUnique({ where: { id: params.sessionId } })
      return session ? mapSession(session) : null
    },

    async getSessionByRefreshTokenHash(ctx: RepoContext, params: { refreshTokenHash: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_session_by_refresh_token_hash' })

      const session = await prisma.session.findUnique({ where: { refreshTokenHash: params.refreshTokenHash } })
      return session ? mapSession(session) : null
    },

    async createSession(ctx: RepoContext, params: { input: CreateSessionInput }) {
      const { logger } = ctx
      // MySQL/MariaDB 上 Prisma 的默认 String 往往会落成 VARCHAR(191)；
      // 某些 User-Agent 会超过该长度，导致写入失败并触发 500。
      // 这里做兜底截断，确保登录链路稳定。
      const MAX_USER_AGENT_LENGTH = 191
      const rawUserAgent = params.input.userAgent ?? null
      const userAgent = rawUserAgent ? rawUserAgent.slice(0, MAX_USER_AGENT_LENGTH) : null
      const userAgentTruncated = Boolean(rawUserAgent && rawUserAgent.length > MAX_USER_AGENT_LENGTH)

      logger.info({
        action: 'create_session',
        userId: params.input.userId,
        userAgentLength: rawUserAgent?.length ?? null,
        userAgentTruncated,
      })

      const session = await prisma.session.create({
        data: {
          userId: params.input.userId,
          refreshTokenHash: params.input.refreshTokenHash,
          expiresAt: new Date(params.input.expiresAt),
          userAgent,
          clientIp: params.input.clientIp,
          isRevoked: false,
        },
      })
      return mapSession(session)
    },

    async rotateSession(ctx: RepoContext, params: { oldSessionId: string; newSessionId: string; rotatedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'rotate_session', oldSessionId: params.oldSessionId, newSessionId: params.newSessionId })

      await prisma.session.update({
        where: { id: params.oldSessionId },
        data: {
          replacedBySessionId: params.newSessionId,
          rotatedAt: new Date(params.rotatedAt),
          isRevoked: true,
        },
      })
    },

    async refreshSessionToken(ctx: RepoContext, params: { sessionId: string; newRefreshTokenHash: string; newExpiresAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'refresh_session_token', sessionId: params.sessionId })

      await prisma.session.update({
        where: { id: params.sessionId },
        data: {
          refreshTokenHash: params.newRefreshTokenHash,
          expiresAt: new Date(params.newExpiresAt),
        },
      })
    },

    async revokeSession(ctx: RepoContext, params: { sessionId: string }) {
      const { logger } = ctx
      logger.info({ action: 'revoke_session', sessionId: params.sessionId })

      await prisma.session.update({ where: { id: params.sessionId }, data: { isRevoked: true } })
    },

    async revokeAllSessionsForUser(ctx: RepoContext, params: { userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'revoke_all_sessions_for_user', userId: params.userId })

      await prisma.session.updateMany({ where: { userId: params.userId }, data: { isRevoked: true } })
    },

    async revokeAllSessionsExceptCurrent(ctx: RepoContext, params: { userId: string; currentSessionId: string }) {
      const { logger } = ctx
      logger.info({ action: 'revoke_all_sessions_except_current', userId: params.userId, currentSessionId: params.currentSessionId })

      await prisma.session.updateMany({
        where: {
          userId: params.userId,
          id: { not: params.currentSessionId },
        },
        data: { isRevoked: true },
      })
    },

    async revokeOldestSessions(ctx: RepoContext, params: { userId: string; keepLatest: number; nowIso: string }) {
      const { logger } = ctx
      logger.info({ action: 'revoke_oldest_sessions', userId: params.userId, keepLatest: params.keepLatest })

      // 查询用户的所有会话，按创建时间倒序排列
      const sessions = await prisma.session.findMany({
        where: { userId: params.userId },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
      })

      // 如果会话数量超过保留数量，撤销最旧的会话
      if (sessions.length > params.keepLatest) {
        const toRevoke = sessions.slice(params.keepLatest)
        const idsToRevoke = toRevoke.map((s: { id: string }) => s.id)

        await prisma.session.updateMany({
          where: { id: { in: idsToRevoke } },
          data: { isRevoked: true },
        })
      }
    },

    async getUserSessions(ctx: RepoContext, params: {
      userId: string
      includeRevoked?: boolean
      limit?: number
      offset?: number
    }) {
      const { logger } = ctx
      logger.info({ action: 'get_user_sessions', userId: params.userId })

      // 构建查询条件
      const where: { userId: string; isRevoked?: boolean } = { userId: params.userId }
      if (!params.includeRevoked) {
        where.isRevoked = false
      }

      // 查询用户的会话列表，按创建时间倒序排列
      const sessions = await prisma.session.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params.limit,
        skip: params.offset,
      })

      return sessions.map(mapSession)
    },

    async getUserSessionsCount(ctx: RepoContext, params: {
      userId: string
      includeRevoked?: boolean
    }) {
      const { logger } = ctx
      logger.info({ action: 'get_user_sessions_count', userId: params.userId })

      // 构建查询条件
      const where: { userId: string; isRevoked?: boolean } = { userId: params.userId }
      if (!params.includeRevoked) {
        where.isRevoked = false
      }

      // 统计用户的会话总数
      return prisma.session.count({ where })
    },

    async cleanupExpiredAndRevokedSessions(ctx: RepoContext) {
      const { logger } = ctx
      const now = new Date()

      const result = await prisma.session.deleteMany({
        where: {
          isRevoked: true,
          expiresAt: { lt: now },
        },
      })

      logger.info({ action: 'cleanup_expired_revoked_sessions', deletedCount: result.count })
      return result.count
    },
  }
}
