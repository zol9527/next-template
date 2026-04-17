import type { SettlementRepository } from '@/plugins/promotion/repositories/interfaces/settlement.interface'
import type { AdminSettlement } from '@/plugins/promotion/contracts/settlements.dto'
import type { AdminCommissionRecord } from '@/plugins/promotion/contracts/commissions.dto'
import type { RepoContext } from '@/types/repo/repo-context'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/client'

const SETTLEMENT_SELECT = 'id,status,total_amount,currency_code,created_by,created_at,processed_at,updated_at'
const RECORD_JOIN_SELECT = `id,order_id,promoter_user_id,product_id,base_amount,rate,rate_source,commission_amount,status,settlement_id,created_at,updated_at,orders!inner(id,product_id,products!inner(name)),users!inner(username)`

function getString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  return typeof value === 'string' ? value : null
}

function getStringOrNumberAsString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return null
}

function mapCommissionRecord(row: Record<string, unknown>): AdminCommissionRecord {
  const id = getString(row, 'id')
  const orderId = getString(row, 'order_id')
  const promoterUserId = getString(row, 'promoter_user_id')
  const baseAmount = getStringOrNumberAsString(row, 'base_amount')
  const rate = getStringOrNumberAsString(row, 'rate')
  const commissionAmount = getStringOrNumberAsString(row, 'commission_amount')
  const status = getString(row, 'status')
  const createdAt = getString(row, 'created_at')
  const updatedAt = getString(row, 'updated_at')
  const rateSource = getString(row, 'rate_source') as 'promoter_level' | 'global_rule' | null

  const ordersData = row.orders as Record<string, unknown> | undefined
  const usersData = row.users as Record<string, unknown> | undefined
  const productId: string | null = ordersData ? getString(ordersData, 'product_id') : null
  const promoterUsername: string | null = usersData ? getString(usersData, 'username') : null

  let productName: string | null = null
  if (ordersData && typeof ordersData === 'object') {
    const productsData = (ordersData as Record<string, unknown>).products as Record<string, unknown> | undefined
    if (productsData) {
      productName = getString(productsData, 'name')
    }
  }

  if (!id || !orderId || !promoterUserId || !baseAmount || !rate || !commissionAmount || !status || !createdAt || !updatedAt) {
    throw new Error('Invalid commission_records row')
  }

  return {
    id,
    orderId,
    orderNo: null,
    promoterUserId,
    promoterUsername,
    productId,
    productName,
    baseAmount,
    rate,
    commissionAmount,
    status: status as 'frozen' | 'payable' | 'settling' | 'settled' | 'failed' | 'voided',
    settlementId: getString(row, 'settlement_id'),
    rateSource: rateSource || null,
    createdAt,
    updatedAt,
  }
}

function mapSettlement(row: Record<string, unknown>): AdminSettlement {
  const id = getString(row, 'id')
  const status = getString(row, 'status')
  const totalAmount = getStringOrNumberAsString(row, 'total_amount')
  const currencyCode = getString(row, 'currency_code')
  const createdBy = getString(row, 'created_by')
  const createdAt = getString(row, 'created_at')
  const updatedAt = getString(row, 'updated_at')

  if (!id || !status || !totalAmount || !currencyCode || !createdBy || !createdAt || !updatedAt) {
    throw new Error('Invalid settlements row')
  }

  return {
    id,
    status,
    totalAmount,
    currencyCode,
    createdBy,
    createdAt,
    processedAt: getString(row, 'processed_at'),
    updatedAt,
  }
}

/**
Function: createSupabaseSettlementRepository

Description: 创建基于 Supabase（Service Role）的结算仓储实现，负责 settlements / settlement_items 的写入与状态推进

Parameters:

Returns:
    repository(SettlementRepository): SettlementRepository 的 Supabase 实现
*/
export function createSupabaseSettlementRepository(): SettlementRepository {
  const supabase = createSupabaseServiceRoleClient()

  return {
    async createSettlement(ctx: RepoContext, params: { status: string; totalAmount: string; currencyCode: string; createdBy: string }) {
      const { logger } = ctx
      logger.info({ action: 'create_settlement', totalAmount: params.totalAmount })

      const { data, error } = await supabase
        .from('settlements')
        .insert({
          status: params.status,
          total_amount: params.totalAmount,
          currency_code: params.currencyCode,
          created_by: params.createdBy,
        })
        .select(SETTLEMENT_SELECT)
        .single()

      if (error) throw error
      return mapSettlement(data as unknown as Record<string, unknown>)
    },

    async addSettlementItems(ctx: RepoContext, params: { settlementId: string; commissionRecordIds: string[] }) {
      const { logger } = ctx
      logger.info({ action: 'add_settlement_items', settlementId: params.settlementId, count: params.commissionRecordIds.length })

      const uniqueIds = Array.from(new Set(params.commissionRecordIds)).filter(Boolean)
      if (uniqueIds.length === 0) return

      const rows = uniqueIds.map((commissionRecordId) => ({
        settlement_id: params.settlementId,
        commission_record_id: commissionRecordId,
      }))

      const { error } = await supabase.from('settlement_items').insert(rows)
      if (error) throw error
    },

    async setSettlementStatus(ctx: RepoContext, params: { settlementId: string; status: string; processedAt?: string; updatedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'set_settlement_status', settlementId: params.settlementId, status: params.status })

      const updates: Record<string, unknown> = {
        status: params.status,
        updated_at: params.updatedAt,
      }

      if (params.processedAt !== undefined) updates.processed_at = params.processedAt

      const { data, error } = await supabase
        .from('settlements')
        .update(updates)
        .eq('id', params.settlementId)
        .select(SETTLEMENT_SELECT)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapSettlement(data as unknown as Record<string, unknown>)
    },

    async getSettlementById(ctx: RepoContext, params: { settlementId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_settlement_by_id', settlementId: params.settlementId })

      const { data, error } = await supabase.from('settlements').select(SETTLEMENT_SELECT).eq('id', params.settlementId).maybeSingle()
      if (error) throw error
      if (!data) return null
      return mapSettlement(data as unknown as Record<string, unknown>)
    },

    async listSettlements(ctx: RepoContext, params: { limit: number; cursor?: string | null; status?: string | null; settlementId?: string | null; settlementIds?: string[] }) {
      const { logger } = ctx
      logger.info({ action: 'list_settlements', limit: params.limit })

      const safeLimit = Math.max(1, Math.min(params.limit, 50))
      let query = supabase.from('settlements').select(SETTLEMENT_SELECT).order('created_at', { ascending: false })

      if (params.settlementId) {
        query = query.eq('id', params.settlementId)
        const { data, error } = await query.limit(1)
        if (error) throw error
        const items = (data ?? []).map((r) => mapSettlement(r as unknown as Record<string, unknown>))
        return { items, nextCursor: null }
      }

      if (params.status) query = query.eq('status', params.status)
      if (params.cursor) query = query.lt('created_at', params.cursor)
      if (params.settlementIds && params.settlementIds.length > 0) query = query.in('id', params.settlementIds)

      const { data, error } = await query.limit(safeLimit)
      if (error) throw error

      const items = (data ?? []).map((r) => mapSettlement(r as unknown as Record<string, unknown>))
      const nextCursor = items.length === safeLimit ? items[items.length - 1]?.createdAt ?? null : null

      return { items, nextCursor }
    },

    async getSettlementCommissions(ctx: RepoContext, params: { settlementId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_settlement_commissions', settlementId: params.settlementId })

      const { data: itemsData, error: itemsError } = await supabase
        .from('settlement_items')
        .select('commission_record_id')
        .eq('settlement_id', params.settlementId)

      if (itemsError) throw itemsError
      if (!itemsData || itemsData.length === 0) return []

      const commissionRecordIds = itemsData.map((item) => item.commission_record_id)

      const { data: commissionsData, error: commissionsError } = await supabase
        .from('commission_records')
        .select(RECORD_JOIN_SELECT)
        .in('id', commissionRecordIds)
        .order('created_at', { ascending: false })

      if (commissionsError) throw commissionsError

      return (commissionsData ?? []).map((r) => mapCommissionRecord(r as unknown as Record<string, unknown>))
    },
  }
}
