/**
 * Promoter Repository Implementation (Supabase)
 * 推广员仓储的 Supabase 实现
 */

import type { PromoterLevel } from '@/plugins/promotion/contracts/promoter.dto'
import type {
  PromoterLevelRecord,
  PromoterRepository,
  PromoterWithStats,
} from '@/plugins/promotion/repositories/interfaces/promoter.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/client'

const LEVEL_SELECT = 'id,name,level,commission_rate,min_sales_count,min_sales_amount,description,created_at,updated_at'
const LEVEL_RECORD_SELECT = 'id,user_id,promoter_level_id,effective_at,inactive_at,created_at'

function getString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  return typeof value === 'string' ? value : null
}

function getNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key]
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    if (!isNaN(parsed)) return parsed
  }
  return null
}

function getStringOrNumberAsString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return null
}

function mapPromoterLevel(row: Record<string, unknown>): PromoterLevel | null {
  const id = getString(row, 'id')
  const name = getString(row, 'name')
  const commissionRate = getStringOrNumberAsString(row, 'commission_rate')
  const minSalesAmount = getStringOrNumberAsString(row, 'min_sales_amount')
  const description = getString(row, 'description')
  const createdAt = getString(row, 'created_at')
  const updatedAt = getString(row, 'updated_at')
  const level = getNumber(row, 'level')
  const minSalesCount = getNumber(row, 'min_sales_count')

  if (!id || !name || !commissionRate || !minSalesAmount || !createdAt || !updatedAt || level === null || minSalesCount === null) {
    return null
  }

  return {
    id,
    name,
    level,
    commissionRate,
    minSalesCount,
    minSalesAmount,
    description,
    createdAt,
    updatedAt,
  }
}

function mapLevelRecord(row: Record<string, unknown>): PromoterLevelRecord | null {
  const id = getString(row, 'id')
  const userId = getString(row, 'user_id')
  const promoterLevelId = getString(row, 'promoter_level_id')
  const effectiveAt = getString(row, 'effective_at')
  const createdAt = getString(row, 'created_at')

  if (!id || !userId || !promoterLevelId || !effectiveAt || !createdAt) {
    return null
  }

  return {
    id,
    userId,
    promoterLevelId,
    effectiveAt,
    inactiveAt: getString(row, 'inactive_at'),
    createdAt,
  }
}

/**
Function: createSupabasePromoterRepository

Description: 创建基于 Supabase（Service Role）的推广员仓储实现

Parameters:
	无

Returns:
	repository(PromoterRepository): PromoterRepository 的 Supabase 实现
*/
export function createSupabasePromoterRepository(): PromoterRepository {
  const supabase = createSupabaseServiceRoleClient()

  return {
    async getUserById(ctx: RepoContext, params: { userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_user_by_id', userId: params.userId })

      const { data, error } = await supabase
        .from('users')
        .select('username, avatar_url')
        .eq('id', params.userId)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return {
        username: (data as unknown as Record<string, unknown>).username as string | null,
        avatarUrl: (data as unknown as Record<string, unknown>).avatar_url as string | null,
      }
    },

    async getAllLevels(ctx: RepoContext) {
      const { logger } = ctx
      logger.info({ action: 'get_all_levels' })

      const { data, error } = await supabase
        .from('promoter_levels')
        .select(LEVEL_SELECT)
        .order('level', { ascending: true })

      if (error) throw error
      return (data as unknown as Record<string, unknown>[])
        .map(mapPromoterLevel)
        .filter((level): level is PromoterLevel => level !== null)
    },

    async getLevelById(ctx: RepoContext, params: { levelId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_level_by_id', levelId: params.levelId })

      const { data, error } = await supabase
        .from('promoter_levels')
        .select(LEVEL_SELECT)
        .eq('id', params.levelId)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return mapPromoterLevel(data as unknown as Record<string, unknown>)
    },

    async getLevelByNumber(ctx: RepoContext, params: { level: number }) {
      const { logger } = ctx
      logger.info({ action: 'get_level_by_number', level: params.level })

      const { data, error } = await supabase
        .from('promoter_levels')
        .select(LEVEL_SELECT)
        .eq('level', params.level)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return mapPromoterLevel(data as unknown as Record<string, unknown>)
    },

    async updateLevel(ctx: RepoContext, params: { levelId: string; commissionRate?: string; minSalesAmount?: string; minSalesCount?: number; description?: string }) {
      const { logger } = ctx
      logger.info({ action: 'update_level', levelId: params.levelId })

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (params.commissionRate !== undefined) updates.commission_rate = params.commissionRate
      if (params.minSalesAmount !== undefined) updates.min_sales_amount = params.minSalesAmount
      if (params.minSalesCount !== undefined) updates.min_sales_count = params.minSalesCount
      if (params.description !== undefined) updates.description = params.description

      const { data, error } = await supabase
        .from('promoter_levels')
        .update(updates)
        .eq('id', params.levelId)
        .select(LEVEL_SELECT)
        .single()

      if (error) throw error
      const level = mapPromoterLevel(data as unknown as Record<string, unknown>)
      if (!level) throw new Error('Failed to update level')
      return level
    },

    async getCurrentLevelRecord(ctx: RepoContext, params: { userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_current_level_record', userId: params.userId })

      const { data, error } = await supabase
        .from('promoter_level_records')
        .select(LEVEL_RECORD_SELECT)
        .eq('user_id', params.userId)
        .is('inactive_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapLevelRecord(data as unknown as Record<string, unknown>)
    },

    async createLevelRecord(ctx: RepoContext, params: { userId: string; promoterLevelId: string; effectiveAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'create_level_record', userId: params.userId, levelId: params.promoterLevelId })

      const { data, error } = await supabase
        .from('promoter_level_records')
        .insert({
          user_id: params.userId,
          promoter_level_id: params.promoterLevelId,
          effective_at: params.effectiveAt,
        })
        .select(LEVEL_RECORD_SELECT)
        .single()

      if (error) throw error
      const record = mapLevelRecord(data as unknown as Record<string, unknown>)
      if (!record) throw new Error('Failed to create level record')
      return record
    },

    async deactivateCurrentLevelRecord(ctx: RepoContext, params: { userId: string; inactiveAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'deactivate_current_level_record', userId: params.userId })

      const record = await this.getCurrentLevelRecord(ctx, { userId: params.userId })
      if (!record) return false

      const { error } = await supabase
        .from('promoter_level_records')
        .update({ inactive_at: params.inactiveAt })
        .eq('id', record.id)

      if (error) throw error
      return true
    },

    async getPromoterStats(ctx: RepoContext, params: { userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_promoter_stats', userId: params.userId })

      const { data: commissionData, error: commissionError } = await supabase
        .from('commission_records')
        .select('commission_amount, status')
        .eq('promoter_user_id', params.userId)

      if (commissionError) throw commissionError

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id, price_amount')
        .eq('user_id', params.userId)

      if (orderError) throw orderError

      let totalCommission = '0', payableCommission = '0', frozenCommission = '0', settledCommission = '0'
      let totalOrders = 0, totalSalesAmount = '0'

      commissionData?.forEach((c) => {
        const amount = parseFloat((c.commission_amount as string) || '0')
        if (c.status === 'frozen') frozenCommission = (parseFloat(frozenCommission) + amount).toFixed(2)
        else if (c.status === 'payable') payableCommission = (parseFloat(payableCommission) + amount).toFixed(2)
        else if (c.status === 'settled') settledCommission = (parseFloat(settledCommission) + amount).toFixed(2)
        if (['payable', 'settled', 'frozen'].includes(c.status as string)) {
          totalCommission = (parseFloat(totalCommission) + amount).toFixed(2)
        }
      })

      orderData?.forEach((o) => {
        totalOrders += 1
        totalSalesAmount = (parseFloat(totalSalesAmount) + parseFloat((o.price_amount as string) || '0')).toFixed(2)
      })

      return {
        totalCommission,
        payableCommission,
        frozenCommission,
        settledCommission,
        totalOrders,
        totalSalesAmount,
      }
    },

    async listPromotersWithStats(ctx: RepoContext, params: { limit: number; cursor?: string | null; level?: number | null; keyword?: string | null }) {
      const { logger } = ctx
      logger.info({ action: 'list_promoters_with_stats', limit: params.limit })

      const { data: userData, error: userError, count } = await supabase
        .from('users')
        .select('id, username, avatar_url, created_at', { count: 'exact' })
        .ilike('username', `%${params.keyword || ''}%`)
        .order('created_at', { ascending: false })
        .limit(params.limit)

      if (userError) throw userError

      const items: PromoterWithStats[] = []
      for (const user of (userData ?? []) as Array<{ id: string; username: string | null; avatar_url: string | null; created_at: string }>) {
        const stats = await this.getPromoterStats(ctx, { userId: user.id })
        const levelRecord = await this.getCurrentLevelRecord(ctx, { userId: user.id })
        const level = levelRecord ? await this.getLevelById(ctx, { levelId: levelRecord.promoterLevelId }) : null

        items.push({
          ...stats,
          userId: user.id,
          username: user.username,
          avatarUrl: user.avatar_url,
          currentLevel: level || { id: '', name: '', level: 0, commissionRate: '0', minSalesCount: 0, minSalesAmount: '0', description: null, createdAt: '', updatedAt: '' },
          subPromoterCount: 0,
          levelUpdatedAt: levelRecord?.effectiveAt || user.created_at,
          createdAt: user.created_at,
        })
      }

      return { items, nextCursor: null, totalCount: count ?? 0 }
    },

    async getSubPromoterCount(ctx: RepoContext, params: { promoterUserId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_sub_promoter_count', promoterUserId: params.promoterUserId })

      const { count, error } = await supabase
        .from('distribution_relations')
        .select('id', { count: 'exact', head: true })
        .eq('promoter_user_id', params.promoterUserId)

      if (error) throw error
      return count ?? 0
    },
  }
}
