import { prisma } from '@/lib/prisma'
import type { SettlementApplicationRepository } from '@/plugins/promotion/repositories/interfaces/settlement-application.interface'
import type { AdminSettlementApplication, AdminSettlementApplicationListQuery } from '@/plugins/promotion/contracts/settlement-applications.dto'
import type { RepoContext } from '@/types/repo/repo-context'

function mapApplication(r: Record<string, unknown>): AdminSettlementApplication {
  return {
    id: r.id as string,
    promoterUserId: r.promoter_user_id as string,
    amount: String(r.amount),
    status: r.status as 'pending' | 'approved' | 'rejected' | 'paid' | 'failed',
    paymentMethod: r.payment_method as string,
    paymentAccount: r.payment_account as string | null,
    rejectionReason: r.rejection_reason as string | null,
    settlementId: r.settlement_id as string | null,
    createdAt: (r.created_at as Date)?.toISOString() ?? '',
    updatedAt: (r.updated_at as Date)?.toISOString() ?? '',
    reviewerId: r.reviewer_id as string | null,
  }
}

export function createPrismaSettlementApplicationRepository(): SettlementApplicationRepository {
  return {
    async createApplication(ctx: RepoContext, params: { promoterUserId: string; amount: string; paymentMethod: string; paymentAccount?: string | null }) {
      const { logger } = ctx
      logger.info({ action: 'create_application', promoterUserId: params.promoterUserId, amount: params.amount })

      const application = await prisma.settlementApplication.create({
        data: {
          promoterUserId: params.promoterUserId,
          amount: params.amount,
          paymentMethod: params.paymentMethod,
          paymentAccount: params.paymentAccount ?? null,
        },
      })
      return mapApplication(application)
    },

    async getApplicationById(ctx: RepoContext, params: { id: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_application_by_id', id: params.id })

      const application = await prisma.settlementApplication.findUnique({ where: { id: params.id } })
      return application ? mapApplication(application) : null
    },

    async updateApplicationStatus(ctx: RepoContext, params: { id: string; status: string; updatedAt: string; rejectionReason?: string | undefined; reviewerId?: string | undefined; settlementId?: string | undefined }) {
      const { logger } = ctx
      logger.info({ action: 'update_application_status', id: params.id, status: params.status })

      const updates: Record<string, unknown> = { updatedAt: new Date(params.updatedAt) }
      if (params.status) updates.status = params.status
      if (params.rejectionReason !== undefined) updates.rejectionReason = params.rejectionReason
      if (params.reviewerId !== undefined) updates.reviewerId = params.reviewerId
      if (params.settlementId !== undefined) updates.settlementId = params.settlementId

      const application = await prisma.settlementApplication.update({
        where: { id: params.id },
        data: updates,
      })
      return mapApplication(application)
    },

    async listApplications(ctx: RepoContext, params: AdminSettlementApplicationListQuery & { promoterUserId?: string }) {
      const { logger } = ctx
      logger.info({ action: 'list_applications', limit: params.limit })

      const where: Record<string, unknown> = {}
      if (params.status) where.status = params.status
      if (params.cursor) where.createdAt = { lt: new Date(params.cursor) }
      if (params.promoterUserId) where.promoterUserId = params.promoterUserId

      const applications = await prisma.settlementApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params.limit,
      })

      return {
        items: applications.map(mapApplication),
        nextCursor: applications.length === params.limit ? applications[applications.length - 1]?.createdAt.toISOString() ?? null : null,
      }
    },
  }
}
