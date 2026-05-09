import { prisma } from '@/lib/prisma'
import type { DistributionRepository } from '@/plugins/promotion/repositories/interfaces/distribution.interface'
import type { DistributionRelation } from '@/plugins/promotion/contracts/distribution.dto'
import type { RepoContext } from '@/types/repo/repo-context'

function mapRelation(r: Record<string, unknown>): DistributionRelation {
  return {
    id: r.id as string,
    userId: (r.userId ?? r.user_id) as string,
    promoterUserId: (r.promoterUserId ?? r.promoter_user_id) as string,
    effectiveAt: ((r.effectiveAt ?? r.effective_at) as Date)?.toISOString() ?? '',
    inactiveAt: (r.inactiveAt ?? r.inactive_at) as string | null,
    createdAt: ((r.createdAt ?? r.created_at) as Date)?.toISOString() ?? '',
  }
}

export function createPrismaDistributionRepository(): DistributionRepository {
  return {
    async getRelationByUserId(ctx: RepoContext, params: { userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_relation_by_user_id', userId: params.userId })

      const relation = await prisma.distributionRelation.findUnique({ where: { userId: params.userId } })
      return relation ? mapRelation(relation) : null
    },

    async findManyByPromoterUserId(ctx: RepoContext, params: { promoterUserId: string }) {
      const { logger } = ctx
      logger.info({ action: 'find_many_by_promoter_user_id', promoterUserId: params.promoterUserId })

      const relations = await prisma.distributionRelation.findMany({
        where: { promoterUserId: params.promoterUserId },
        select: { userId: true },
      })
      return relations.map((r) => mapRelation(r as unknown as Record<string, unknown>))
    },

    async bindRelation(ctx: RepoContext, params: { userId: string; promoterUserId: string; effectiveAt: string }) {
      const { logger } = ctx
      logger.info({ action: 'bind_relation', userId: params.userId, promoterUserId: params.promoterUserId })

      try {
        const relation = await prisma.distributionRelation.create({
          data: {
            userId: params.userId,
            promoterUserId: params.promoterUserId,
            effectiveAt: new Date(params.effectiveAt),
          },
        })
        return mapRelation(relation)
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') {
          const existing = await this.getRelationByUserId(ctx, { userId: params.userId })
          if (existing) return existing
        }
        throw error
      }
    },
  }
}
