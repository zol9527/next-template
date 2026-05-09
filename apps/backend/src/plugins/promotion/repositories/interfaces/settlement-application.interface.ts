import type { RepoContext } from '@/types/repo/repo-context'
import type { AdminSettlementApplication, AdminSettlementApplicationListQuery } from '@/plugins/promotion/contracts/settlement-applications.dto'

export interface SettlementApplicationRepository {
  createApplication(ctx: RepoContext, params: {
    promoterUserId: string
    amount: string
    paymentMethod: string
    paymentAccount?: string | null
  }): Promise<AdminSettlementApplication>

  getApplicationById(ctx: RepoContext, params: { id: string }): Promise<AdminSettlementApplication | null>

  updateApplicationStatus(ctx: RepoContext, params: {
    id: string
    status: string
    reviewerId?: string | null
    rejectionReason?: string | null
    settlementId?: string | null
    updatedAt: string
  }): Promise<AdminSettlementApplication | null>

  listApplications(ctx: RepoContext, params: AdminSettlementApplicationListQuery & { promoterUserId?: string }): Promise<{ items: AdminSettlementApplication[]; nextCursor: string | null; totalCount?: number }>
}
