import type { CommissionRepository, CommissionRecordDto, CommissionRuleDto, OrderSettlementViewItem } from '@/plugins/promotion/repositories/interfaces/commission.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/client'

const RULE_SELECT = 'id,scope,scope_id,rate,active_from,active_to,created_at,updated_at'
const RECORD_SELECT =
  'id,order_id,promoter_user_id,base_amount,rate,rate_source,commission_amount,status,settlement_id,created_at,updated_at'

const RECORD_JOIN_SELECT = `id,order_id,promoter_user_id,base_amount,rate,rate_source,commission_amount,status,settlement_id,created_at,updated_at,order:orders!inner(id,order_no,product_id),promoter:users!inner(username),product:products!inner(name)`

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

function mapRule(row: Record<string, unknown>): CommissionRuleDto {
  const id = getString(row, 'id')
  const scope = getString(row, 'scope')
  const rate = getStringOrNumberAsString(row, 'rate')
  const activeFrom = getString(row, 'active_from')
  const createdAt = getString(row, 'created_at')
  const updatedAt = getString(row, 'updated_at')

  if (!id || !scope || !rate || !activeFrom || !createdAt || !updatedAt) {
    throw new Error('Invalid commission_rules row')
  }

  return {
    id,
    scope: scope as 'global' | 'product' | 'category',
    scopeId: getString(row, 'scope_id'),
    rate,
    activeFrom,
    activeTo: getString(row, 'active_to'),
    createdAt,
    updatedAt,
  }
}

interface CommissionRecordRow extends Record<string, unknown> {
  id: string
  order_id: string
  promoter_user_id: string
  base_amount: string | number
  rate: string | number
  rate_source: string | null
  commission_amount: string | number
  status: string
  settlement_id: string | null
  created_at: string
  updated_at: string
  order: { id: string; order_no: string; product_id: string } | null
  promoter: { username: string | null } | null
  product: { name: string } | null
}

function mapRecord(row: CommissionRecordRow | Record<string, unknown>): CommissionRecordDto {
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

  const orderData = (row as CommissionRecordRow).order
  const promoterData = (row as CommissionRecordRow).promoter
  const productData = (row as CommissionRecordRow).product

  const productId: string | null = orderData ? getString(orderData, 'product_id') : null
  const orderNo: string | null = orderData ? getString(orderData, 'order_no') : null
  const productName: string | null = productData ? getString(productData, 'name') : null
  const promoterUsername: string | null = promoterData ? getString(promoterData, 'username') : null

  if (!id || !orderId || !promoterUserId || !baseAmount || !rate || !commissionAmount || !status || !createdAt || !updatedAt) {
    throw new Error('Invalid commission_records row')
  }

  return {
    id,
    orderId,
    orderNo,
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

/**
Function: createSupabaseCommissionRepository

Description: 创建基于 Supabase（Service Role）的佣金仓储实现，负责 commission_rules / commission_records 的读写

Parameters:

Returns:
    repository(CommissionRepository): CommissionRepository 的 Supabase 实现
*/
export function createSupabaseCommissionRepository(): CommissionRepository {
  const supabase = createSupabaseServiceRoleClient()

  return {
    async getActiveGlobalRule(ctx: RepoContext, params: { nowIso: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_active_global_rule', nowIso: params.nowIso })

      const { data, error } = await supabase
        .from('commission_rules')
        .select(RULE_SELECT)
        .eq('scope', 'global')
        .lte('active_from', params.nowIso)
        .or(`active_to.is.null,active_to.gt.${params.nowIso}`)
        .order('active_from', { ascending: false })
        .limit(1)

      if (error) throw error
      const row = (data ?? [])[0]
      if (!row) return null
      return mapRule(row as unknown as Record<string, unknown>)
    },

    async listCommissionRules(ctx: RepoContext, params: { scope?: string | null; scopeId?: string | null }) {
      const { logger } = ctx
      logger.info({ action: 'list_commission_rules', scope: params.scope })

      let query = supabase.from('commission_rules').select(RULE_SELECT).order('created_at', { ascending: false })

      if (params.scope) query = query.eq('scope', params.scope)
      if (params.scopeId) query = query.eq('scope_id', params.scopeId)

      const { data, error } = await query
      if (error) throw error
      return (data ?? []).map((row) => mapRule(row as unknown as Record<string, unknown>))
    },

    async createCommissionRule(ctx: RepoContext, params: { scope: string; scopeId: string | null; rate: string; activeFrom: string; activeTo: string | null }) {
      const { logger } = ctx
      logger.info({ action: 'create_commission_rule', scope: params.scope })

      const { data, error } = await supabase
        .from('commission_rules')
        .insert({
          scope: params.scope,
          scope_id: params.scopeId,
          rate: params.rate,
          active_from: params.activeFrom,
          active_to: params.activeTo,
        })
        .select(RULE_SELECT)
        .single()

      if (error) throw error
      return mapRule(data as unknown as Record<string, unknown>)
    },

    async updateCommissionRule(ctx: RepoContext, params: { id: string; rate?: string; activeFrom?: string; activeTo?: string | null; updatedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'update_commission_rule', id: params.id })

      const updates: Record<string, unknown> = {
        updated_at: params.updatedAt,
      }
      if (params.rate !== undefined) updates.rate = params.rate
      if (params.activeFrom !== undefined) updates.active_from = params.activeFrom
      if (params.activeTo !== undefined) updates.active_to = params.activeTo

      const { data, error } = await supabase
        .from('commission_rules')
        .update(updates)
        .eq('id', params.id)
        .select(RULE_SELECT)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapRule(data as unknown as Record<string, unknown>)
    },

    async deleteCommissionRule(ctx: RepoContext, params: { id: string }) {
      const { logger } = ctx
      logger.info({ action: 'delete_commission_rule', id: params.id })

      const { error } = await supabase.from('commission_rules').delete().eq('id', params.id)
      if (error) throw error
      return true
    },

    async getCommissionByOrderId(ctx: RepoContext, params: { orderId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_commission_by_order_id', orderId: params.orderId })

      const { data, error } = await supabase
        .from('commission_records')
        .select(RECORD_SELECT)
        .eq('order_id', params.orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapRecord(data as unknown as Record<string, unknown>)
    },

    async getCommissionByOrderAndPromoter(ctx: RepoContext, params: { orderId: string; promoterUserId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_commission_by_order_and_promoter', orderId: params.orderId, promoterUserId: params.promoterUserId })

      const { data, error } = await supabase
        .from('commission_records')
        .select(RECORD_SELECT)
        .eq('order_id', params.orderId)
        .eq('promoter_user_id', params.promoterUserId)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapRecord(data as unknown as Record<string, unknown>)
    },

    async getCommissionRecordsByIds(ctx: RepoContext, params: { commissionRecordIds: string[] }) {
      const { logger } = ctx
      logger.info({ action: 'get_commission_records_by_ids', count: params.commissionRecordIds.length })

      const { data, error } = await supabase
        .from('commission_records')
        .select(RECORD_SELECT)
        .in('id', params.commissionRecordIds)

      if (error) throw error
      return (data ?? []).map((row) => mapRecord(row as unknown as Record<string, unknown>))
    },

    async createCommissionRecord(ctx: RepoContext, params: {
      orderId: string
      promoterUserId: string
      baseAmount: string
      rate: string
      commissionAmount: string
      status: string
      rateSource?: 'promoter_level' | 'global_rule' | null
    }) {
      const { logger } = ctx
      logger.info({ action: 'create_commission_record', orderId: params.orderId, promoterUserId: params.promoterUserId })

      const { data, error } = await supabase
        .from('commission_records')
        .insert({
          order_id: params.orderId,
          promoter_user_id: params.promoterUserId,
          base_amount: params.baseAmount,
          rate: params.rate,
          commission_amount: params.commissionAmount,
          status: params.status,
          rate_source: params.rateSource ?? null,
        })
        .select(RECORD_SELECT)
        .single()

      if (error) throw error
      return mapRecord(data as unknown as Record<string, unknown>)
    },

    async updateCommissionStatus(ctx: RepoContext, params: { commissionRecordId: string; status: string; settlementId?: string | null; updatedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'update_commission_status', commissionRecordId: params.commissionRecordId, status: params.status })

      const updates: Record<string, unknown> = {
        status: params.status,
        updated_at: params.updatedAt,
      }
      if (params.settlementId !== undefined) updates.settlement_id = params.settlementId

      const { data, error } = await supabase
        .from('commission_records')
        .update(updates)
        .eq('id', params.commissionRecordId)
        .select(RECORD_SELECT)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapRecord(data as unknown as Record<string, unknown>)
    },

    async updateCommissionRecord(ctx: RepoContext, params: {
      id: string
      baseAmount?: string
      commissionAmount?: string
      status?: string
      updatedAt: string
    }) {
      const { logger } = ctx
      logger.info({ action: 'update_commission_record', id: params.id })

      const updates: Record<string, unknown> = {
        updated_at: params.updatedAt,
      }
      if (params.baseAmount !== undefined) updates.base_amount = params.baseAmount
      if (params.commissionAmount !== undefined) updates.commission_amount = params.commissionAmount
      if (params.status !== undefined) updates.status = params.status

      const { data, error } = await supabase
        .from('commission_records')
        .update(updates)
        .eq('id', params.id)
        .select(RECORD_SELECT)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return mapRecord(data as unknown as Record<string, unknown>)
    },

    async listCommissionRecords(ctx: RepoContext, params: {
      limit: number
      cursor?: string | null
      status?: string | null
      promoterUserId?: string | null
      orderId?: string | null
      orderNo?: string | null
      keyword?: string | null
    }) {
      const { logger } = ctx
      logger.info({ action: 'list_commission_records', limit: params.limit, status: params.status, keyword: params.keyword, orderNo: params.orderNo })

      // 使用 count 查询获取总数
      // 注意：由于 Supabase count 查询不支持关联查询，keyword 和 orderNo 过滤器在 count 中被忽略
      // 当使用这些过滤器时，totalCount 会显示所有符合简单条件的记录数
      let countQuery = supabase.from('commission_records').select('id', { count: 'exact', head: true })

      if (params.status) countQuery = countQuery.eq('status', params.status)
      if (params.promoterUserId) countQuery = countQuery.eq('promoter_user_id', params.promoterUserId)
      if (params.orderId) countQuery = countQuery.eq('order_id', params.orderId)
      // keyword 和 orderNo 需要关联查询（join），Supabase count 查询不支持
      // 当这些参数存在时，totalCount 不会反映这些过滤器的效果

      const { count: totalCount, error: countError } = await countQuery
      if (countError) {
        logger.warn({ action: 'list_commission_records_count_failed', error: countError.message })
      }

      // 主查询
      let query = supabase.from('commission_records').select(RECORD_JOIN_SELECT).order('created_at', { ascending: false })

      if (params.status) query = query.eq('status', params.status)
      if (params.promoterUserId) query = query.eq('promoter_user_id', params.promoterUserId)
      if (params.orderId) query = query.eq('order_id', params.orderId)
      if (params.orderNo) query = query.ilike('order.order_no', `%${params.orderNo}%`)
      if (params.keyword) {
        query = query.or(`order.order_no.ilike.%${params.keyword}%,promoter.username.ilike.%${params.keyword}%`)
      }
      if (params.cursor) query = query.lt('created_at', params.cursor)

      const { data, error } = await query.limit(params.limit)
      if (error) throw error

      const items = (data ?? []).map((row) => mapRecord(row as unknown as Record<string, unknown>))
      const nextCursor = items.length === params.limit ? items[items.length - 1]?.createdAt ?? null : null

      return { items, nextCursor, totalCount: totalCount ?? 0 }
    },

    async attachSettlementAndMarkSettled(ctx: RepoContext, params: { commissionRecordIds: string[]; settlementId: string; updatedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'attach_settlement_and_mark_settled', count: params.commissionRecordIds.length })

      const { data, error } = await supabase
        .from('commission_records')
        .update({
          settlement_id: params.settlementId,
          status: 'settled',
          updated_at: params.updatedAt,
        })
        .in('id', params.commissionRecordIds)
        .select(RECORD_SELECT)

      if (error) throw error
      return (data ?? []).map((row) => mapRecord(row as unknown as Record<string, unknown>))
    },

    async listOrderSettlementView(ctx: RepoContext, params: {
      limit: number
      cursor?: string | null
      status?: string | null
      orderNo?: string | null
      keyword?: string | null
    }) {
      const { logger } = ctx
      logger.info({ action: 'list_order_settlement_view', limit: params.limit })

      // 联合查询 commission_records、orders、users 等表
      const joinSelect = `id,order_id,promoter_user_id,base_amount,commission_amount,status,rate,settlement_id,created_at,orders!inner(id,order_no,created_at),users!inner(username)`

      let query = supabase.from('commission_records').select(joinSelect).order('created_at', { ascending: false })

      if (params.status) query = query.eq('status', params.status)
      if (params.orderNo) query = query.ilike('orders.order_no', `%${params.orderNo}%`)
      if (params.keyword) {
        query = query.or(`orders.order_no.ilike.%${params.keyword}%,users.username.ilike.%${params.keyword}%`)
      }
      if (params.cursor) query = query.lt('created_at', params.cursor)

      const { data, error } = await query.limit(params.limit)
      if (error) throw error

      const items: OrderSettlementViewItem[] = (data ?? []).map((row) => {
        const ordersData = row.orders as unknown as Record<string, unknown> | undefined
        const usersData = row.users as unknown as Record<string, unknown> | undefined

        return {
          orderId: getString(row, 'order_id') ?? '',
          orderNo: ordersData ? getString(ordersData, 'order_no') : null,
          commissionId: getString(row, 'id') ?? '',
          promoterUserId: getString(row, 'promoter_user_id') ?? '',
          promoterUsername: usersData ? getString(usersData, 'username') : null,
          productId: null,
          productName: null,
          commissionAmount: getStringOrNumberAsString(row, 'commission_amount') ?? '0',
          commissionStatus: getString(row, 'status') as 'frozen' | 'payable' | 'settling' | 'settled' | 'failed' | 'voided',
          rate: getStringOrNumberAsString(row, 'rate') ?? '0',
          settlementId: getString(row, 'settlement_id'),
          settlementStatus: null,
          applicationId: null,
          applicationStatus: null,
          orderCreatedAt: ordersData ? getString(ordersData, 'created_at') ?? '' : '',
          commissionCreatedAt: getString(row, 'created_at') ?? '',
        }
      })

      const nextCursor = items.length === params.limit ? items[items.length - 1]?.commissionCreatedAt ?? null : null
      // 注意：totalCount 需要单独查询获取，这里暂返回 0 作为占位
      const totalCount = 0

      return { items, nextCursor, totalCount }
    },

    async getDistinctSettlementIdsByPromoter(ctx: RepoContext, params: { promoterUserId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_distinct_settlement_ids_by_promoter', promoterUserId: params.promoterUserId })

      const { data, error } = await supabase
        .from('commission_records')
        .select('settlement_id')
        .eq('promoter_user_id', params.promoterUserId)
        .not('settlement_id', 'is', null)

      if (error) throw error

      const ids = [...new Set((data ?? []).map((r) => r.settlement_id).filter(Boolean))] as string[]
      return ids
    },

    async sumPayableCommissions(ctx: RepoContext, params: { promoterUserId: string }) {
      const { logger } = ctx
      logger.info({ action: 'sum_payable_commissions', promoterUserId: params.promoterUserId })

      const { data, error } = await supabase
        .from('commission_records')
        .select('commission_amount')
        .eq('promoter_user_id', params.promoterUserId)
        .eq('status', 'payable')

      if (error) throw error

      const total = (data ?? []).reduce((sum, r) => sum + Number(r.commission_amount ?? 0), 0)
      return total.toString()
    },

    async getPayableCommissionIdsByPromoter(ctx: RepoContext, params: { promoterUserId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_payable_commission_ids_by_promoter', promoterUserId: params.promoterUserId })

      const { data, error } = await supabase
        .from('commission_records')
        .select('id')
        .eq('promoter_user_id', params.promoterUserId)
        .eq('status', 'payable')
        .limit(100)

      if (error) throw error

      return (data ?? []).map((r) => r.id)
    },
  }
}
