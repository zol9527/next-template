import { prisma } from '@/lib/prisma'
import type { SettlementRepository } from '@/plugins/promotion/repositories/interfaces/settlement.interface'
import type { AdminSettlement } from '@/plugins/promotion/contracts/settlements.dto'
import type { RepoContext } from '@/types/repo/repo-context'

function mapSettlement(r: Record<string, unknown>): AdminSettlement {
  return {
    id: r.id as string,
    status: r.status as string,
    totalAmount: String(r.total_amount),
    currencyCode: r.currency_code as string,
    createdBy: r.created_by as string,
    createdAt: (r.created_at as Date)?.toISOString() ?? '',
    processedAt: r.processed_at as string | null,
    updatedAt: (r.updated_at as Date)?.toISOString() ?? '',
  }
}

export function createPrismaSettlementRepository(): SettlementRepository {
  return {
    async createSettlement(ctx: RepoContext, params: { status: string; totalAmount: string; currencyCode: string; createdBy: string }) {
      const { logger } = ctx
      logger.info({ action: 'create_settlement', totalAmount: params.totalAmount })

      const settlement = await prisma.settlement.create({
        data: {
          status: params.status,
          totalAmount: params.totalAmount,
          currencyCode: params.currencyCode,
          createdById: params.createdBy,
        },
      })
      return mapSettlement(settlement)
    },

    async addSettlementItems(ctx: RepoContext, params: { settlementId: string; commissionRecordIds: string[] }) {
      const { logger } = ctx
      logger.info({ action: 'add_settlement_items', settlementId: params.settlementId, count: params.commissionRecordIds.length })

      if (params.commissionRecordIds.length === 0) return
      await prisma.settlementItem.createMany({
        data: params.commissionRecordIds.map((commissionId) => ({
          settlementId: params.settlementId,
          commissionId,
        })),
      })
    },

    async setSettlementStatus(ctx: RepoContext, params: { settlementId: string; status: string; processedAt?: string; updatedAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'set_settlement_status', settlementId: params.settlementId, status: params.status })

      const updates: Record<string, unknown> = { updatedAt: new Date(params.updatedAt) }
      if (params.status) updates.status = params.status
      if (params.processedAt !== undefined) updates.processedAt = new Date(params.processedAt)

      const settlement = await prisma.settlement.update({
        where: { id: params.settlementId },
        data: updates,
      })
      return mapSettlement(settlement)
    },

    async getSettlementById(ctx: RepoContext, params: { settlementId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_settlement_by_id', settlementId: params.settlementId })

      const settlement = await prisma.settlement.findUnique({ where: { id: params.settlementId } })
      return settlement ? mapSettlement(settlement) : null
    },

    async listSettlements(ctx: RepoContext, params: { limit: number; cursor?: string | null; status?: string | null; settlementId?: string | null; settlementIds?: string[] }) {
      const { logger } = ctx
      logger.info({ action: 'list_settlements', limit: params.limit })

      const where: Record<string, unknown> = {}
      if (params.status) where.status = params.status
      if (params.settlementId) where.id = params.settlementId
      if (params.settlementIds && params.settlementIds.length > 0) where.id = { in: params.settlementIds }
      if (params.cursor) where.createdAt = { lt: new Date(params.cursor) }

      const settlements = await prisma.settlement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params.limit,
      })

      return {
        items: settlements.map(mapSettlement),
        nextCursor: settlements.length === params.limit ? settlements[settlements.length - 1]?.createdAt.toISOString() ?? null : null,
      }
    },

    async getSettlementCommissions(ctx: RepoContext, params: { settlementId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_settlement_commissions', settlementId: params.settlementId })

      const items = await prisma.settlementItem.findMany({
        where: { settlementId: params.settlementId },
        include: { commission: true },
        take: 100,
      })

      return items.map((i: { commission: { id: string; orderId: string; promoterUserId: string; baseAmount: { toString: () => string }; rate: { toString: () => string }; commissionAmount: { toString: () => string }; status: string; settlementId: string | null; rateSource: string | null; createdAt: Date; updatedAt: Date } }) => ({
        id: i.commission.id,
        orderId: i.commission.orderId,
        orderNo: null,
        promoterUserId: i.commission.promoterUserId,
        promoterUsername: null,
        productId: null,
        productName: null,
        baseAmount: String(i.commission.baseAmount),
        rate: String(i.commission.rate),
        commissionAmount: String(i.commission.commissionAmount),
        status: i.commission.status as 'frozen' | 'payable' | 'settling' | 'settled' | 'failed' | 'voided',
        settlementId: i.commission.settlementId,
        rateSource: i.commission.rateSource as 'promoter_level' | 'global_rule' | null,
        createdAt: i.commission.createdAt.toISOString(),
        updatedAt: i.commission.updatedAt.toISOString(),
      }))
    },
  }
}
