import type { PromoterCodeRepository } from '@/plugins/promotion/repositories/interfaces/promoter-code.interface'
import type { PromoterCode } from '@/plugins/promotion/contracts/promoter-codes.dto'
import type { RepoContext } from '@/types/repo/repo-context'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/client'

const CODE_SELECT = 'id,code,promoter_user_id,type,status,usage_count,active_to,metadata,created_at,updated_at'

function getString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  return typeof value === 'string' ? value : null
}

function getNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key]
  return typeof value === 'number' ? value : null
}

// Function: mapCode
// Description: 将 Supabase 数据行映射为推广码对象
//
// Parameters:
//   row(Record<string, unknown>): Supabase 查询返回的数据行
//
// Returns:
//   PromoterCode: 推广码对象
function mapCode(row: Record<string, unknown>): PromoterCode {
  return {
    id: getString(row, 'id')!,
    code: getString(row, 'code')!.toUpperCase(),
    promoterUserId: getString(row, 'promoter_user_id')!,
    type: getString(row, 'type') as 'auto' | 'custom',
    status: getString(row, 'status') as 'active' | 'inactive' | 'disabled',
    usageCount: getNumber(row, 'usage_count') ?? 0,
    activeFrom: getString(row, 'active_from') ?? getString(row, 'created_at')!,
    activeTo: getString(row, 'active_to'),
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    createdAt: getString(row, 'created_at')!,
    updatedAt: getString(row, 'updated_at')!,
  }
}

/**
Function: createSupabasePromoterCodeRepository

Description: 创建基于 Supabase（Service Role）的推广码仓储实现

Parameters:

Returns:
    repository(PromoterCodeRepository): PromoterCodeRepository 的 Supabase 实现
*/
export function createSupabasePromoterCodeRepository(): PromoterCodeRepository {
  const supabase = createSupabaseServiceRoleClient()

  return {
    async checkCodeExists(ctx: RepoContext, params: { code: string }) {
      const { logger } = ctx
      logger.info({ action: 'check_code_exists', code: params.code })

      const { data, error } = await supabase.from('promoter_codes').select('id').eq('code', params.code.toUpperCase()).maybeSingle()
      if (error) throw error
      return data !== null
    },

    async getActiveCodesCount(ctx: RepoContext, params: { promoterUserId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_active_codes_count', promoterUserId: params.promoterUserId })

      const { count, error } = await supabase
        .from('promoter_codes')
        .select('id', { count: 'exact', head: true })
        .eq('promoter_user_id', params.promoterUserId)
        .eq('status', 'active')

      if (error) throw error
      return count ?? 0
    },

    async createCode(ctx: RepoContext, params: { code: string; promoterUserId: string; type: string; activeTo: string | null; metadata: Record<string, unknown> }) {
      const { logger } = ctx
      logger.info({ action: 'create_code', code: params.code, promoterUserId: params.promoterUserId })

      const { data, error } = await supabase
        .from('promoter_codes')
        .insert({
          code: params.code.toUpperCase(),
          promoter_user_id: params.promoterUserId,
          type: params.type,
          status: 'active',
          active_to: params.activeTo,
          metadata: params.metadata,
        })
        .select(CODE_SELECT)
        .single()

      if (error) throw error
      if (!data) throw new Error('Failed to create promoter code')
      return mapCode(data)
    },

    async getCodeByCode(ctx: RepoContext, params: { code: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_code_by_code', code: params.code })

      const { data, error } = await supabase.from('promoter_codes').select(CODE_SELECT).eq('code', params.code.toUpperCase()).maybeSingle()
      if (error) throw error
      if (!data) return null
      return mapCode(data)
    },

    async getCodeById(ctx: RepoContext, params: { id: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_code_by_id', id: params.id })

      const { data, error } = await supabase.from('promoter_codes').select(CODE_SELECT).eq('id', params.id).maybeSingle()
      if (error) throw error
      if (!data) return null
      return mapCode(data)
    },

    async listCodesByPromoterUserId(ctx: RepoContext, params: { promoterUserId: string; limit: number; cursor?: string | null; status: string | null }) {
      const { logger } = ctx
      logger.info({ action: 'list_codes_by_promoter_user_id', promoterUserId: params.promoterUserId })

      let query = supabase.from('promoter_codes').select(CODE_SELECT).eq('promoter_user_id', params.promoterUserId).order('created_at', { ascending: false })

      if (params.status) query = query.eq('status', params.status)
      if (params.cursor) query = query.lt('created_at', params.cursor)

      const { data, error } = await query.limit(params.limit)
      if (error) throw error

      const items = (data ?? []).map((r) => mapCode(r as Record<string, unknown>))
      const nextCursor = items.length === params.limit ? items[items.length - 1]?.createdAt ?? null : null

      return { items, nextCursor }
    },

    async updateCodeStatus(ctx: RepoContext, params: { id: string; status: string; updatedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'update_code_status', id: params.id, status: params.status })

      const { data, error } = await supabase
        .from('promoter_codes')
        .update({ status: params.status, updated_at: params.updatedAt })
        .eq('id', params.id)
        .select(CODE_SELECT)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapCode(data)
    },

    async deleteCode(ctx: RepoContext, params: { id: string }) {
      const { logger } = ctx
      logger.info({ action: 'delete_code', id: params.id })

      const { error } = await supabase.from('promoter_codes').delete().eq('id', params.id)
      if (error) throw error

      logger.info({ action: 'delete_code_success', id: params.id })
    },

    async incrementUsageCount(ctx: RepoContext, params: { id: string; updatedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'increment_usage_count', id: params.id })

      // Use RPC for atomic increment to prevent race conditions
      const { data, error } = await supabase
        .rpc('increment_promoter_code_usage_count', {
          p_id: params.id,
          p_updated_at: params.updatedAt,
        })
        .select(CODE_SELECT)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapCode(data)
    },

    async getTotalCodesCount(ctx: RepoContext, params: { promoterUserId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_total_codes_count', promoterUserId: params.promoterUserId })

      const { count, error } = await supabase
        .from('promoter_codes')
        .select('id', { count: 'exact', head: true })
        .eq('promoter_user_id', params.promoterUserId)

      if (error) throw error
      return count ?? 0
    },
  }
}
