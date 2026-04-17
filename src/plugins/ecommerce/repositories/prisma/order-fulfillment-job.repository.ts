import { prisma } from '@/lib/prisma'
import type { OrderFulfillmentJobRepository } from '@/plugins/ecommerce/repositories/interfaces/order-fulfillment-job.interface'
import type { AdminOrderFulfillmentJob } from '@/plugins/ecommerce/contracts/order-fulfillment-jobs.dto'
import type { RepoContext } from '@/types/repo/repo-context'

function mapJob(j: Record<string, unknown>): AdminOrderFulfillmentJob {
  return {
    id: j.id as string,
    orderId: j.order_id as string,
    paymentId: j.payment_id as string,
    status: j.status as 'pending' | 'processing' | 'succeeded' | 'retrying' | 'manual_required',
    attemptCount: (j.attempt_count as number) ?? 0,
    availableAt: (j.available_at as Date)?.toISOString() ?? '',
    startedAt: null,
    finishedAt: null,
    lastError: (j.last_error as string) ?? null,
    lastErrorAt: null,
    manualRequiredAt: null,
    createdAt: (j.created_at as Date)?.toISOString() ?? '',
    updatedAt: (j.updated_at as Date)?.toISOString() ?? '',
  }
}

export function createPrismaOrderFulfillmentJobRepository(): OrderFulfillmentJobRepository {
  return {
    async listDueJobs(ctx: RepoContext, params: { limit: number; nowIso: string }) {
      const { logger } = ctx
      logger.info({ action: 'list_due_jobs', limit: params.limit, nowIso: params.nowIso })

      const jobs = await prisma.orderFulfillmentJob.findMany({
        where: {
          status: { in: ['pending', 'retrying'] },
          availableAt: { lte: new Date(params.nowIso) },
        },
        orderBy: { createdAt: 'asc' },
        take: params.limit,
      })
      return jobs.map(mapJob)
    },

    async tryMarkProcessing(ctx: RepoContext, params: { jobId: string; nowIso: string }) {
      const { logger } = ctx
      logger.info({ action: 'try_mark_processing', jobId: params.jobId })

      const job = await prisma.orderFulfillmentJob.updateMany({
        where: { id: params.jobId, status: { in: ['pending', 'retrying'] } },
        data: { status: 'processing', updatedAt: new Date(params.nowIso) },
      })
      if (job.count === 0) return null

      const updated = await prisma.orderFulfillmentJob.findUnique({ where: { id: params.jobId } })
      return updated ? mapJob(updated) : null
    },

    async markSucceeded(ctx: RepoContext, params: { jobId: string; nowIso: string }) {
      const { logger } = ctx
      logger.info({ action: 'mark_succeeded', jobId: params.jobId })

      const job = await prisma.orderFulfillmentJob.update({
        where: { id: params.jobId },
        data: { status: 'succeeded', updatedAt: new Date(params.nowIso) },
      })
      return mapJob(job)
    },

    async markRetrying(ctx: RepoContext, params: { jobId: string; nowIso: string; nextAvailableAtIso: string; lastError: string }) {
      const { logger } = ctx
      logger.info({ action: 'mark_retrying', jobId: params.jobId })

      const job = await prisma.orderFulfillmentJob.update({
        where: { id: params.jobId },
        data: {
          status: 'retrying',
          availableAt: new Date(params.nextAvailableAtIso),
          lastError: params.lastError,
          updatedAt: new Date(params.nowIso),
        },
      })
      return mapJob(job)
    },

    async markManualRequired(ctx: RepoContext, params: { jobId: string; nowIso: string; lastError: string }) {
      const { logger } = ctx
      logger.info({ action: 'mark_manual_required', jobId: params.jobId })

      const job = await prisma.orderFulfillmentJob.update({
        where: { id: params.jobId },
        data: { status: 'manual_required', lastError: params.lastError, updatedAt: new Date(params.nowIso) },
      })
      return mapJob(job)
    },

    async getJobById(ctx: RepoContext, params: { jobId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_job_by_id', jobId: params.jobId })

      const job = await prisma.orderFulfillmentJob.findUnique({ where: { id: params.jobId } })
      return job ? mapJob(job) : null
    },

    async upsertJobByPaymentId(ctx: RepoContext, params: { orderId: string; paymentId: string; updatedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'upsert_job_by_payment_id', orderId: params.orderId, paymentId: params.paymentId })

      const job = await prisma.orderFulfillmentJob.upsert({
        where: { paymentId: params.paymentId },
        update: { orderId: params.orderId, updatedAt: new Date(params.updatedAt) },
        create: { orderId: params.orderId, paymentId: params.paymentId },
      })
      return mapJob(job)
    },

    async getFulfillmentStatusByOrderId(ctx: RepoContext, params: { orderId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_fulfillment_status_by_order_id', orderId: params.orderId })

      const job = await prisma.orderFulfillmentJob.findFirst({
        where: { orderId: params.orderId },
        orderBy: { createdAt: 'desc' },
      })
      return job?.status ?? null
    },

    async applyFulfillment(ctx: RepoContext, params: { orderId: string; paymentId: string }) {
      const { logger } = ctx
      logger.info({ action: 'apply_fulfillment', orderId: params.orderId, paymentId: params.paymentId })

      await prisma.orderFulfillmentJob.upsert({
        where: { paymentId: params.paymentId },
        update: { orderId: params.orderId },
        create: { orderId: params.orderId, paymentId: params.paymentId },
      })

      return { entitlementInserted: true, commissionInserted: true }
    },
  }
}
