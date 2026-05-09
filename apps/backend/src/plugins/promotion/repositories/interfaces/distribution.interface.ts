import type { RepoContext } from '@/types/repo/repo-context'
import type { DistributionRelation } from '@/plugins/promotion/contracts/distribution.dto'

export interface DistributionRepository {
  getRelationByUserId(ctx: RepoContext, params: { userId: string }): Promise<DistributionRelation | null>

  /**
   * 根据推广员 ID 获取所有被推广的用户 ID 列表
   */
  findManyByPromoterUserId(ctx: RepoContext, params: { promoterUserId: string }): Promise<DistributionRelation[]>

  bindRelation(ctx: RepoContext, params: {
    userId: string
    promoterUserId: string
    effectiveAt: string
  }): Promise<DistributionRelation>
}
