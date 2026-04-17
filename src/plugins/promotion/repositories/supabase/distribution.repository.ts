import type { DistributionRelation } from '@/plugins/promotion/contracts/distribution.dto'
import type { DistributionRepository } from '@/plugins/promotion/repositories/interfaces/distribution.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/client'

const RELATION_SELECT = 'id,user_id,promoter_user_id,effective_at,inactive_at,created_at'

function getString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  return typeof value === 'string' ? value : null
}

function mapRelation(row: Record<string, unknown>): DistributionRelation {
  const id = getString(row, 'id')
  const userId = getString(row, 'user_id')
  const promoterUserId = getString(row, 'promoter_user_id')
  const effectiveAt = getString(row, 'effective_at')
  const createdAt = getString(row, 'created_at')

  if (!id || !userId || !promoterUserId || !effectiveAt || !createdAt) {
    throw new Error('Invalid distribution_relations row')
  }

  return {
    id,
    userId,
    promoterUserId,
    effectiveAt,
    inactiveAt: getString(row, 'inactive_at'),
    createdAt,
  }
}

/**
Function: createSupabaseDistributionRepository

Description: 创建基于 Supabase（Service Role）的分销关系仓储实现，负责 distribution_relations 表的读写（单级：user_id 唯一）

Parameters:

Returns:
    repository(DistributionRepository): DistributionRepository 的 Supabase 实现
*/
export function createSupabaseDistributionRepository(): DistributionRepository {
  const supabase = createSupabaseServiceRoleClient()

  return {
    async getRelationByUserId(ctx: RepoContext, params: { userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_relation_by_user_id', userId: params.userId })

      const { data, error } = await supabase
        .from('distribution_relations')
        .select(RELATION_SELECT)
        .eq('user_id', params.userId)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapRelation(data as unknown as Record<string, unknown>)
    },

    async findManyByPromoterUserId(ctx: RepoContext, params: { promoterUserId: string }) {
      const { logger } = ctx
      logger.info({ action: 'find_many_by_promoter_user_id', promoterUserId: params.promoterUserId })

      const { data, error } = await supabase
        .from('distribution_relations')
        .select(RELATION_SELECT)
        .eq('promoter_user_id', params.promoterUserId)

      if (error) throw error
      return (data ?? []).map((row) => mapRelation(row as unknown as Record<string, unknown>))
    },

    async bindRelation(ctx: RepoContext, params: { userId: string; promoterUserId: string; effectiveAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'bind_relation', userId: params.userId, promoterUserId: params.promoterUserId })

      const { data, error } = await supabase
        .from('distribution_relations')
        .insert({ user_id: params.userId, promoter_user_id: params.promoterUserId, effective_at: params.effectiveAt })
        .select(RELATION_SELECT)
        .single()

      if (!error) {
        return mapRelation(data as unknown as Record<string, unknown>)
      }

      if ((error as { code?: unknown }).code === '23505') {
        const existing = await this.getRelationByUserId(ctx, { userId: params.userId })
        if (existing) return existing
      }

      throw error
    },
  }
}
