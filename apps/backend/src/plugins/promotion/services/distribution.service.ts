import type { DistributionRelation } from '@/plugins/promotion/contracts/distribution.dto'
import type { DistributionRepository } from '@/plugins/promotion/repositories/interfaces/distribution.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'

export class DistributionServiceError extends Error {
  public readonly code: 'INVALID_INPUT' | 'INVALID_STATE'

  constructor(code: DistributionServiceError['code'], message: string) {
    super(message)
    this.code = code
  }
}

/**
 * Function: createDistributionService
 *
 * Description: 创建分销关系服务，提供绑定分销关系的幂等业务能力（不直接访问数据库）
 *
 * Parameters:
 * 	deps({ distributions: DistributionRepository }): 依赖注入的分销关系仓储
 * 	ctx(ServiceContext): Service 上下文
 *
 * Returns:
 * 	service(object): 提供 bindDistribution/getRelationForUser 等方法的服务对象
 */
export function createDistributionService(
  deps: { distributions: DistributionRepository },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    async getRelationForUser(params: { userId: string }): Promise<DistributionRelation | null> {
      return await deps.distributions.getRelationByUserId(repoCtx, { userId: params.userId })
    },

    async bindDistribution(params: { userId: string; promoterUserId: string }): Promise<DistributionRelation> {
      if (params.userId === params.promoterUserId) {
        throw new DistributionServiceError('INVALID_INPUT', 'Promoter cannot be self')
      }

      const existing = await deps.distributions.getRelationByUserId(repoCtx, { userId: params.userId })
      if (existing) {
        if (existing.promoterUserId === params.promoterUserId) {
          return existing
        }
        throw new DistributionServiceError('INVALID_STATE', 'Distribution relation already bound')
      }

      const effectiveAt = new Date().toISOString()
      const created = await deps.distributions.bindRelation(repoCtx, {
        userId: params.userId,
        promoterUserId: params.promoterUserId,
        effectiveAt,
      })

      logger.info({ action: 'distribution.bind', userId: params.userId, promoterUserId: params.promoterUserId })

      return created
    },
  }
}
