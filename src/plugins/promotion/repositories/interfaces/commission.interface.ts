import type { RepoContext } from '@/types/repo/repo-context'
import type { AdminCommissionRecord } from '@/plugins/promotion/contracts/commissions.dto'
import type { AdminCommissionRule } from '@/plugins/promotion/contracts/commission-rules.dto'
import type { AdminOrderSettlementViewItem } from '@/plugins/ecommerce/contracts/order-settlement-view.dto'

// 使用统一的类型
export type CommissionRuleDto = AdminCommissionRule
export type CommissionRecordDto = AdminCommissionRecord
export type OrderSettlementViewItem = AdminOrderSettlementViewItem

export interface CommissionRepository {
  getActiveGlobalRule(ctx: RepoContext, params: { nowIso: string }): Promise<CommissionRuleDto | null>

  listCommissionRules(ctx: RepoContext, params: {
    scope?: string | null
    scopeId?: string | null
  }): Promise<CommissionRuleDto[]>

  createCommissionRule(ctx: RepoContext, params: {
    scope: string
    scopeId: string | null
    rate: string
    activeFrom: string
    activeTo: string | null
  }): Promise<CommissionRuleDto>

  updateCommissionRule(ctx: RepoContext, params: {
    id: string
    rate?: string
    activeFrom?: string
    activeTo?: string | null
    updatedAt: string
  }): Promise<CommissionRuleDto | null>

  deleteCommissionRule(ctx: RepoContext, params: { id: string }): Promise<boolean>

  getCommissionByOrderId(ctx: RepoContext, params: { orderId: string }): Promise<CommissionRecordDto | null>

  getCommissionByOrderAndPromoter(ctx: RepoContext, params: { orderId: string; promoterUserId: string }): Promise<CommissionRecordDto | null>

  getCommissionRecordsByIds(ctx: RepoContext, params: { commissionRecordIds: string[] }): Promise<CommissionRecordDto[]>

  createCommissionRecord(ctx: RepoContext, params: {
    orderId: string
    promoterUserId: string
    baseAmount: string
    rate: string
    commissionAmount: string
    status: string
    rateSource?: 'promoter_level' | 'global_rule' | null
  }): Promise<CommissionRecordDto>

  updateCommissionStatus(ctx: RepoContext, params: {
    commissionRecordId: string
    status: string
    settlementId?: string | null
    updatedAt: string
  }): Promise<CommissionRecordDto | null>

  updateCommissionRecord(ctx: RepoContext, params: {
    id: string
    baseAmount?: string
    commissionAmount?: string
    status?: string
    updatedAt: string
  }): Promise<CommissionRecordDto | null>

  attachSettlementAndMarkSettled(ctx: RepoContext, params: {
    commissionRecordIds: string[]
    settlementId: string
    updatedAt: string
  }): Promise<CommissionRecordDto[]>

  listCommissionRecords(ctx: RepoContext, params: {
    limit: number
    cursor?: string | null
    status?: string | null
    promoterUserId?: string | null
    orderId?: string | null
    orderNo?: string | null
    keyword?: string | null
  }): Promise<{ items: CommissionRecordDto[]; nextCursor: string | null; totalCount: number }>

  listOrderSettlementView(ctx: RepoContext, params: {
    limit: number
    cursor?: string | null
    status?: string | null
    orderNo?: string | null
    keyword?: string | null
  }): Promise<{ items: OrderSettlementViewItem[]; nextCursor: string | null; totalCount: number }>

  /**
   * 获取推广员关联的去重 settlementId 列表（用于 ABAC 过滤）
   * 直接查询 commission_record 的 settlementId 列，避免加载完整记录
   */
  getDistinctSettlementIdsByPromoter(ctx: RepoContext, params: { promoterUserId: string }): Promise<string[]>

  /**
   * 计算推广员可结算佣金总额（SUM 聚合，避免加载所有记录）
   * 返回值为 Decimal 字符串，若无可结算记录则返回 '0'
   */
  sumPayableCommissions(ctx: RepoContext, params: { promoterUserId: string }): Promise<string>

  /**
   * 获取推广员所有 payable 状态的佣金记录 ID 列表
   * 仅查询 ID 列，避免加载完整记录
   */
  getPayableCommissionIdsByPromoter(ctx: RepoContext, params: { promoterUserId: string }): Promise<string[]>
}
