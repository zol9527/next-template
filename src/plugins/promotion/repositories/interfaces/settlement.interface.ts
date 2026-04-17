import type { RepoContext } from '@/types/repo/repo-context'
import type { AdminSettlement } from '@/plugins/promotion/contracts/settlements.dto'
import type { AdminCommissionRecord } from '@/plugins/promotion/contracts/commissions.dto'

export interface SettlementRepository {
  createSettlement(ctx: RepoContext, params: {
    status: string
    totalAmount: string
    currencyCode: string
    createdBy: string
  }): Promise<AdminSettlement>

  addSettlementItems(ctx: RepoContext, params: { settlementId: string; commissionRecordIds: string[] }): Promise<void>

  setSettlementStatus(ctx: RepoContext, params: { settlementId: string; status: string; processedAt?: string | null; updatedAt: string }): Promise<AdminSettlement | null>

  getSettlementById(ctx: RepoContext, params: { settlementId: string }): Promise<AdminSettlement | null>

  listSettlements(ctx: RepoContext, params: {
    limit: number
    cursor?: string | null
    status?: string | null
    settlementId?: string | null
    settlementIds?: string[]
  }): Promise<{ items: AdminSettlement[]; nextCursor: string | null }>

  getSettlementCommissions(ctx: RepoContext, params: { settlementId: string }): Promise<AdminCommissionRecord[]>
}
