import type { SessionRepository } from '@/repositories/interfaces/core/session.interface'
import type { Session, CreateSessionInput } from '@/contracts/dtos/session.dto'
import type { RepoContext } from '@/types/repo/repo-context'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/client'

const SESSION_SELECT = 'id,user_id,refresh_token_hash,replaced_by_session_id,rotated_at,user_agent,client_ip,is_revoked,expires_at,created_at'

function getString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  return typeof value === 'string' ? value : null
}

function getBoolean(row: Record<string, unknown>, key: string): boolean | null {
  const value = row[key]
  return typeof value === 'boolean' ? value : null
}

function mapSession(row: Record<string, unknown>): Session {
  const id = getString(row, 'id')
  const userId = getString(row, 'user_id')
  const refreshTokenHash = getString(row, 'refresh_token_hash')
  const expiresAt = getString(row, 'expires_at')
  const createdAt = getString(row, 'created_at')

  if (!id || !userId || !refreshTokenHash || !expiresAt || !createdAt) {
    throw new Error(`Invalid sessions row: id=${id}, userId=${userId}, refreshTokenHash=${refreshTokenHash}, expiresAt=${expiresAt}, createdAt=${createdAt}`)
  }

  return {
    id,
    userId,
    refreshTokenHash,
    replacedBySessionId: getString(row, 'replaced_by_session_id'),
    rotatedAt: getString(row, 'rotated_at'),
    userAgent: getString(row, 'user_agent'),
    clientIp: getString(row, 'client_ip'),
    isRevoked: getBoolean(row, 'is_revoked') ?? false,
    expiresAt,
    createdAt,
  }
}

/**
Function: createSupabaseSessionRepository

Description: 创建基于 Supabase（Service Role）的会话仓储实现

Parameters:

Returns:
    repository(SessionRepository): SessionRepository 的 Supabase 实现
*/
export function createSupabaseSessionRepository(): SessionRepository {
  const supabase = createSupabaseServiceRoleClient()

  return {
    async getSessionById(ctx: RepoContext, params: { sessionId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_session_by_id', sessionId: params.sessionId })

      const { data, error } = await supabase.from('sessions').select(SESSION_SELECT).eq('id', params.sessionId).maybeSingle()
      if (error) throw error
      if (!data) return null
      return mapSession(data as unknown as Record<string, unknown>)
    },

    async getSessionByRefreshTokenHash(ctx: RepoContext, params: { refreshTokenHash: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_session_by_refresh_token_hash' })

      const { data, error } = await supabase.from('sessions').select(SESSION_SELECT).eq('refresh_token_hash', params.refreshTokenHash).maybeSingle()
      if (error) throw error
      if (!data) return null
      return mapSession(data as unknown as Record<string, unknown>)
    },

    async createSession(ctx: RepoContext, params: { input: CreateSessionInput }) {
      const { logger } = ctx
      logger.info({ action: 'create_session', userId: params.input.userId })

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: params.input.userId,
          refresh_token_hash: params.input.refreshTokenHash,
          expires_at: params.input.expiresAt,
          user_agent: params.input.userAgent ?? null,
          client_ip: params.input.clientIp ?? null,
          is_revoked: false,
        })
        .select(SESSION_SELECT)
        .single()

      if (error) {
        logger.error({ error }, 'createSession failed')
        throw error
      }

      logger.info({ sessionId: data?.id }, 'Session created')
      return mapSession(data as unknown as Record<string, unknown>)
    },

    async rotateSession(ctx: RepoContext, params: { oldSessionId: string; newSessionId: string; rotatedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'rotate_session', oldSessionId: params.oldSessionId, newSessionId: params.newSessionId })

      const { error } = await supabase
        .from('sessions')
        .update({
          replaced_by_session_id: params.newSessionId,
          rotated_at: params.rotatedAt,
          is_revoked: true,
        })
        .eq('id', params.oldSessionId)

      if (error) throw error
    },

    async refreshSessionToken(ctx: RepoContext, params: { sessionId: string; newRefreshTokenHash: string; newExpiresAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'refresh_session_token', sessionId: params.sessionId })

      const { error } = await supabase
        .from('sessions')
        .update({
          refresh_token_hash: params.newRefreshTokenHash,
          expires_at: params.newExpiresAt,
        })
        .eq('id', params.sessionId)

      if (error) throw error
    },

    async revokeSession(ctx: RepoContext, params: { sessionId: string }) {
      const { logger } = ctx
      logger.info({ action: 'revoke_session', sessionId: params.sessionId })

      const { error } = await supabase.from('sessions').update({ is_revoked: true }).eq('id', params.sessionId)
      if (error) throw error
    },

    async revokeAllSessionsForUser(ctx: RepoContext, params: { userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'revoke_all_sessions_for_user', userId: params.userId })

      const { error } = await supabase.from('sessions').update({ is_revoked: true }).eq('user_id', params.userId)
      if (error) throw error
    },

    async revokeAllSessionsExceptCurrent(ctx: RepoContext, params: { userId: string; currentSessionId: string }) {
      const { logger } = ctx
      logger.info({ action: 'revoke_all_sessions_except_current', userId: params.userId, currentSessionId: params.currentSessionId })

      const { error } = await supabase
        .from('sessions')
        .update({ is_revoked: true })
        .eq('user_id', params.userId)
        .neq('id', params.currentSessionId)

      if (error) throw error
    },

    async revokeOldestSessions(ctx: RepoContext, params: { userId: string; keepLatest: number; nowIso: string }) {
      const { logger } = ctx
      logger.info({ action: 'revoke_oldest_sessions', userId: params.userId, keepLatest: params.keepLatest })

      // 先查询用户的所有会话，按创建时间排序
      const { data: sessions, error: queryError } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', params.userId)
        .order('created_at', { ascending: false })

      if (queryError) {
        logger.error({ error: queryError }, 'revokeOldestSessions query failed')
        throw queryError
      }

      logger.info({ sessionCount: sessions?.length }, 'Found sessions')

      // 如果会话数量超过保留数量，撤销最旧的会话
      if (sessions && sessions.length > params.keepLatest) {
        const toRevoke = sessions.slice(params.keepLatest)
        const idsToRevoke = toRevoke.map((s) => (s as Record<string, unknown>).id) as string[]

        logger.info({ revokeCount: idsToRevoke.length, ids: idsToRevoke }, 'Revoking sessions')

        const { error: updateError } = await supabase
          .from('sessions')
          .update({ is_revoked: true })
          .in('id', idsToRevoke)

        if (updateError) {
          logger.error({ error: updateError }, 'revokeOldestSessions update failed')
          throw updateError
        }
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

      // 构建查询：选择用户的所有会话，按创建时间倒序排列
      let query = supabase
        .from('sessions')
        .select(SESSION_SELECT)
        .eq('user_id', params.userId)
        .order('created_at', { ascending: false })

      // 如果不包含已撤销的会话，添加过滤条件
      if (!params.includeRevoked) {
        query = query.eq('is_revoked', false)
      }

      // 应用分页参数
      if (params.limit) {
        query = query.limit(params.limit)
      }
      if (params.offset) {
        // Supabase 使用 range(offset, offset + limit - 1)
        const end = params.limit ? params.offset + params.limit - 1 : params.offset + 1000
        query = query.range(params.offset, end)
      }

      const { data, error } = await query
      if (error) {
        logger.error({ error }, 'getUserSessions query failed')
        throw error
      }

      // 映射结果并返回
      return (data ?? []).map((row) => mapSession(row as unknown as Record<string, unknown>))
    },

    async getUserSessionsCount(ctx: RepoContext, params: {
      userId: string
      includeRevoked?: boolean
    }) {
      const { logger } = ctx
      logger.info({ action: 'get_user_sessions_count', userId: params.userId })

      // 构建查询：统计用户的会话总数
      let query = supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', params.userId)

      // 如果不包含已撤销的会话，添加过滤条件
      if (!params.includeRevoked) {
        query = query.eq('is_revoked', false)
      }

      const { count, error } = await query
      if (error) {
        logger.error({ error }, 'getUserSessionsCount query failed')
        throw error
      }

      // 返回计数，如果为 null 则返回 0
      return count ?? 0
    },

    async cleanupExpiredAndRevokedSessions(ctx: RepoContext) {
      const { logger } = ctx

      const { count, error } = await supabase
        .from('sessions')
        .delete({ count: 'exact' })
        .eq('is_revoked', true)
        .lt('expires_at', new Date().toISOString())

      if (error) {
        logger.error({ error }, 'cleanupExpiredAndRevokedSessions failed')
        throw error
      }

      logger.info({ action: 'cleanup_expired_revoked_sessions', deletedCount: count ?? 0 })
      return count ?? 0
    },
  }
}
