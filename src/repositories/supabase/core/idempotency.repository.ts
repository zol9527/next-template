import type { IdempotencyRequest } from '@/contracts/dtos/idempotency.dto'
import type { IdempotencyRepository } from '@/repositories/interfaces/core/idempotency.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/client'

const IDEMPOTENCY_SELECT =
  'id,user_id,action,idempotency_key,request_hash,status,resource_type,resource_id,response_code,response_body,created_at,updated_at,expires_at'

function getString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  return typeof value === 'string' ? value : null
}

function getNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key]
  return typeof value === 'number' ? value : null
}

function mapIdempotencyRequest(row: Record<string, unknown>): IdempotencyRequest {
  const id = getString(row, 'id')
  const userId = getString(row, 'user_id')
  const action = getString(row, 'action')
  const idempotencyKey = getString(row, 'idempotency_key')
  const requestHash = getString(row, 'request_hash')
  const status = getString(row, 'status')
  const createdAt = getString(row, 'created_at')
  const updatedAt = getString(row, 'updated_at')
  const expiresAt = getString(row, 'expires_at')

  if (!id || !userId || !action || !idempotencyKey || !requestHash || !status || !createdAt || !updatedAt || !expiresAt) {
    throw new Error('Invalid idempotency_requests row')
  }

  return {
    id,
    userId,
    action,
    idempotencyKey,
    requestHash,
    status: status as 'pending' | 'succeeded' | 'failed',
    resourceType: getString(row, 'resource_type'),
    resourceId: getString(row, 'resource_id'),
    responseCode: getNumber(row, 'response_code'),
    responseBody: row['response_body'] ?? null,
    createdAt,
    updatedAt,
    expiresAt,
  }
}

/**
Function: createSupabaseIdempotencyRepository

Description: 创建基于 Supabase（Service Role）的幂等请求仓储实现，负责 idempotency_requests 的读写与状态更新

Parameters:

Returns:
	repository(IdempotencyRepository): IdempotencyRepository 的 Supabase 实现
*/
export function createSupabaseIdempotencyRepository(): IdempotencyRepository {
  const supabase = createSupabaseServiceRoleClient()

  return {
    async getRequest(ctx: RepoContext, params: { userId: string; action: string; idempotencyKey: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_request', userId: params.userId })

      const { data, error } = await supabase
        .from('idempotency_requests')
        .select(IDEMPOTENCY_SELECT)
        .eq('user_id', params.userId)
        .eq('action', params.action)
        .eq('idempotency_key', params.idempotencyKey)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapIdempotencyRequest(data as unknown as Record<string, unknown>)
    },

    async createRequest(ctx: RepoContext, params: { userId: string; action: string; idempotencyKey: string; requestHash: string; expiresAt: string; createdAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'create_request', userId: params.userId })

      const { data, error } = await supabase
        .from('idempotency_requests')
        .insert({
          user_id: params.userId,
          action: params.action,
          idempotency_key: params.idempotencyKey,
          request_hash: params.requestHash,
          status: 'pending',
          created_at: params.createdAt,
          updated_at: params.createdAt,
          expires_at: params.expiresAt,
        })
        .select(IDEMPOTENCY_SELECT)
        .single()

      if (error) throw error
      return mapIdempotencyRequest(data as unknown as Record<string, unknown>)
    },

    async markSucceeded(ctx: RepoContext, params: { id: string; resourceType: string; resourceId: string; responseCode?: number | null; responseBody?: unknown; updatedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'mark_succeeded', id: params.id })

      const { data, error } = await supabase
        .from('idempotency_requests')
        .update({
          status: 'succeeded',
          resource_type: params.resourceType,
          resource_id: params.resourceId,
          response_code: params.responseCode ?? null,
          response_body: params.responseBody ?? null,
          updated_at: params.updatedAt,
        })
        .eq('id', params.id)
        .select(IDEMPOTENCY_SELECT)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapIdempotencyRequest(data as unknown as Record<string, unknown>)
    },

    async markFailed(ctx: RepoContext, params: { id: string; responseCode?: number | null; responseBody?: unknown; updatedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'mark_failed', id: params.id })

      const { data, error } = await supabase
        .from('idempotency_requests')
        .update({
          status: 'failed',
          response_code: params.responseCode ?? null,
          response_body: params.responseBody ?? null,
          updated_at: params.updatedAt,
        })
        .eq('id', params.id)
        .select(IDEMPOTENCY_SELECT)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapIdempotencyRequest(data as unknown as Record<string, unknown>)
    },
  }
}
