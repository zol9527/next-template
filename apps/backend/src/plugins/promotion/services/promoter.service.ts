/**
 * Promoter Service
 * 推广员服务，提供推广员信息查询、业绩统计等功能
 */

import type { PromoterProfile, PromoterStats } from '@/plugins/promotion/contracts/promoter.dto'
import type { PromoterCommissionsResponse } from '@/plugins/promotion/contracts/promoter.dto'
import type { PromoterLevel } from '@/plugins/promotion/contracts/promoter.dto'
import type { PromoterRepository, PromoterWithStats } from '@/plugins/promotion/repositories/interfaces/promoter.interface'
import type { CommissionRepository } from '@/plugins/promotion/repositories/interfaces/commission.interface'
import type { DistributionRepository } from '@/plugins/promotion/repositories/interfaces/distribution.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'

/**
 * 推广员服务错误类
 */
export class PromoterServiceError extends Error {
  public readonly code: 'NOT_FOUND' | 'INVALID_STATE' | 'INTERNAL_ERROR'

  constructor(code: PromoterServiceError['code'], message: string) {
    super(message)
    this.code = code
  }
}

/**
Function: createPromoterService

Description: 创建推广员服务，负责推广员信息查询、业绩统计、佣金记录等业务逻辑

Parameters:
	deps({ promoters: PromoterRepository, commissions: CommissionRepository, distributions: DistributionRepository }): 依赖注入
	ctx(ServiceContext): Service 上下文

Returns:
	service(object): 提供推广员相关方法
*/
export function createPromoterService(
  deps: {
    promoters: PromoterRepository
    commissions: CommissionRepository
    distributions: DistributionRepository
  },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    /**
    Function: getProfile

    Description: 获取推广员个人信息（包含当前等级和业绩）

    Parameters:
      userId(string): 用户 ID

    Returns:
      profile(PromoterProfile): 推广员个人信息
    */
    async getProfile(userId: string): Promise<PromoterProfile> {
      // 1. 获取当前等级
      const levelRecord = await deps.promoters.getCurrentLevelRecord(repoCtx, { userId })
      let currentLevel: PromoterLevel | null = null

      if (levelRecord) {
        currentLevel = await deps.promoters.getLevelById(repoCtx, { levelId: levelRecord.promoterLevelId })
      }

      // 如果没有等级记录，获取青铜等级作为默认
      if (!currentLevel) {
        currentLevel = await deps.promoters.getLevelByNumber(repoCtx, { level: 1 })
      }

      if (!currentLevel) {
        throw new PromoterServiceError('INTERNAL_ERROR', 'Promoter levels not initialized')
      }

      // 2. 获取业绩统计
      const stats = await deps.promoters.getPromoterStats(repoCtx, { userId })

      // 3. 获取下级推广员数量
      const subPromoterCount = await deps.promoters.getSubPromoterCount(repoCtx, { promoterUserId: userId })

      // 4. 获取用户信息
      const userInfo = await deps.promoters.getUserById(repoCtx, { userId })

      // 5. 组装返回数据
      return {
        userId,
        username: userInfo?.username ?? null,
        avatarUrl: userInfo?.avatarUrl ?? null,
        currentLevel,
        totalCommission: stats?.totalCommission ?? '0',
        payableCommission: stats?.payableCommission ?? '0',
        frozenCommission: stats?.frozenCommission ?? '0',
        settledCommission: stats?.settledCommission ?? '0',
        totalOrders: stats?.totalOrders ?? 0,
        totalSalesAmount: stats?.totalSalesAmount ?? '0',
        subPromoterCount,
        levelUpdatedAt: levelRecord?.effectiveAt ?? currentLevel.createdAt,
      }
    },

    /**
    Function: getStats

    Description: 获取业绩统计

    Parameters:
      userId(string): 用户 ID

    Returns:
      stats(PromoterStats): 业绩统计数据
    */
    async getStats(userId: string): Promise<PromoterStats> {
      const stats = await deps.promoters.getPromoterStats(repoCtx, { userId })

      return stats ?? {
        totalCommission: '0',
        payableCommission: '0',
        frozenCommission: '0',
        settledCommission: '0',
        totalOrders: 0,
        totalSalesAmount: '0',
      }
    },

    /**
    Function: listCommissions

    Description: 获取佣金记录列表

    Parameters:
      params({ userId: string, limit: number, cursor: string | null, status: string | undefined }): 查询参数

    Returns:
      data(PromoterCommissionsResponse): 佣金记录列表
    */
    async listCommissions(params: {
      userId: string
      limit: number
      cursor?: string | null
      status?: string | null
    }): Promise<PromoterCommissionsResponse> {
      // 直接调用 commissions repository
      const result = await deps.commissions.listCommissionRecords(repoCtx, {
        limit: params.limit,
        cursor: params.cursor ?? null,
        status: params.status ?? null,
        promoterUserId: params.userId,
      })

      // 转换为 PromoterCommissionRecord 格式
      const records = result.items.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        orderNo: undefined,
        baseAmount: item.baseAmount,
        rate: item.rate,
        commissionAmount: item.commissionAmount,
        status: item.status as
          | 'frozen'
          | 'payable'
          | 'settling'
          | 'settled'
          | 'failed'
          | 'voided',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }))

      return {
        records,
        nextCursor: result.nextCursor,
      }
    },

    /**
    Function: ensurePromoterStatus

    Description: 确保用户具有推广员状态（有等级记录）

    Parameters:
      userId(string): 用户 ID

    Returns:
      level(PromoterLevel): 推广员等级
    */
    async ensurePromoterStatus(userId: string): Promise<PromoterLevel> {
      const existingRecord = await deps.promoters.getCurrentLevelRecord(repoCtx, { userId })

      if (existingRecord) {
        const level = await deps.promoters.getLevelById(repoCtx, { levelId: existingRecord.promoterLevelId })
        if (!level) {
          throw new PromoterServiceError('INTERNAL_ERROR', 'Existing level not found')
        }
        return level
      }

      // 初始化为青铜等级
      const bronzeLevel = await deps.promoters.getLevelByNumber(repoCtx, { level: 1 })
      if (!bronzeLevel) {
        throw new PromoterServiceError('INTERNAL_ERROR', 'Bronze level not found')
      }

      await deps.promoters.createLevelRecord(repoCtx, {
        userId,
        promoterLevelId: bronzeLevel.id,
        effectiveAt: new Date().toISOString(),
      })

      logger.info({ action: 'promoter.created', userId, levelId: bronzeLevel.id })

      return bronzeLevel
    },

    /**
    Function: listPromotersWithStats

    Description: 获取推广员列表（带统计信息）

    Parameters:
      params({ limit: number, cursor: string | null, level: number | null, keyword: string | null }): 查询参数

    Returns:
      data({ items: PromoterWithStats[], nextCursor: string | null }): 推广员列表
    */
    async listPromotersWithStats(params: {
      limit: number
      cursor?: string | null
      level?: number | null
      keyword?: string | null
      promoterUserId?: string
    }) {
      // 推广员 ABAC 过滤：只看自己的推广员信息
      if (params.promoterUserId) {
        const stats = await deps.promoters.getPromoterStats(repoCtx, { userId: params.promoterUserId })
        const levelRecord = await deps.promoters.getCurrentLevelRecord(repoCtx, { userId: params.promoterUserId })
        const level = levelRecord ? await deps.promoters.getLevelById(repoCtx, { levelId: levelRecord.promoterLevelId }) : null
        const userInfo = await deps.promoters.getUserById(repoCtx, { userId: params.promoterUserId })
        const subPromoterCount = await deps.promoters.getSubPromoterCount(repoCtx, { promoterUserId: params.promoterUserId })

        const emptyLevel: PromoterLevel = {
          id: '', name: '', level: 0, commissionRate: '0',
          minSalesCount: 0, minSalesAmount: '0', description: null, createdAt: '', updatedAt: '',
        }

        const item: PromoterWithStats = {
          ...stats,
          userId: params.promoterUserId,
          username: userInfo?.username ?? null,
          avatarUrl: userInfo?.avatarUrl ?? null,
          currentLevel: level ?? emptyLevel,
          subPromoterCount,
          levelUpdatedAt: levelRecord?.effectiveAt ?? '',
          createdAt: '',
        }

        return { items: [item], nextCursor: null, totalCount: 1 }
      }

      return await deps.promoters.listPromotersWithStats(repoCtx, params)
    },
  }
}
