/**
 * Promoter Level Service
 * 推广员等级服务，提供等级查询、自动升级、手动调整等功能
 */

import type { PromoterLevel } from '@/plugins/promotion/contracts/promoter.dto'
import type { PromoterLevelRecord, PromoterRepository } from '@/plugins/promotion/repositories/interfaces/promoter.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'

/**
 * 推广员等级服务错误类
 */
export class PromoterLevelServiceError extends Error {
  public readonly code: 'INVALID_INPUT' | 'INVALID_STATE' | 'NOT_FOUND' | 'INTERNAL_ERROR'

  constructor(code: PromoterLevelServiceError['code'], message: string) {
    super(message)
    this.code = code
  }
}

/**
Function: createPromoterLevelService

Description: 创建推广员等级服务，负责等级查询、自动升级、手动调整等业务逻辑

Parameters:
	deps({ promoters: PromoterRepository }): 依赖注入的推广员仓储
	ctx(ServiceContext): Service 上下文

Returns:
	service(object): 提供等级相关方法
*/
export function createPromoterLevelService(
  deps: { promoters: PromoterRepository },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: logger.child({ layer: 'repository' }),
  }

  return {
    /**
    Function: listLevels

    Description: 获取所有推广员等级列表

    Returns:
      levels(PromoterLevel[]): 等级列表
    */
    async listLevels(): Promise<PromoterLevel[]> {
      return await deps.promoters.getAllLevels(repoCtx)
    },

    /**
    Function: getLevelById

    Description: 根据 ID 获取等级

    Parameters:
      levelId(string): 等级 ID

    Returns:
      level(PromoterLevel | null): 等级对象，不存在返回 null
    */
    async getLevelById(levelId: string): Promise<PromoterLevel | null> {
      return await deps.promoters.getLevelById(repoCtx, { levelId })
    },

    /**
    Function: updateLevel

    Description: 更新等级配置

    Parameters:
      params({ levelId: string, commissionRate?: string, minSalesAmount?: string, minSalesCount?: number, description?: string }): 更新参数

    Returns:
      level(PromoterLevel): 更新后的等级
    */
    async updateLevel(params: {
      levelId: string
      commissionRate?: string
      minSalesAmount?: string
      minSalesCount?: number
      description?: string
    }): Promise<PromoterLevel> {
      return await deps.promoters.updateLevel(repoCtx, params)
    },

    /**
    Function: getCurrentLevel

    Description: 获取用户当前等级

    Parameters:
      userId(string): 用户 ID

    Returns:
      level(PromoterLevel | null): 当前等级对象，不存在返回 null
    */
    async getCurrentLevel(userId: string): Promise<PromoterLevel | null> {
      const record = await deps.promoters.getCurrentLevelRecord(repoCtx, { userId })
      if (!record) return null

      return await deps.promoters.getLevelById(repoCtx, { levelId: record.promoterLevelId })
    },

    /**
    Function: checkAndUpgradeLevel

    Description: 检查并自动升级等级

    Parameters:
      userId(string): 用户 ID

    Returns:
      level(PromoterLevel | null): 新等级或当前等级
    */
    async checkAndUpgradeLevel(userId: string): Promise<PromoterLevel | null> {
      // 1. 获取当前等级
      const currentRecord = await deps.promoters.getCurrentLevelRecord(repoCtx, { userId })
      const currentLevel = currentRecord
        ? await deps.promoters.getLevelById(repoCtx, { levelId: currentRecord.promoterLevelId })
        : null

      // 2. 获取所有等级（按等级序号排序）
      const allLevels = await deps.promoters.getAllLevels(repoCtx)

      // 3. 获取推广员业绩
      const stats = await deps.promoters.getPromoterStats(repoCtx, { userId })
      if (!stats) {
        return currentLevel ?? null
      }

      // 4. 从高到低检查升级条件
      for (const level of allLevels.sort((a, b) => b.level - a.level)) {
        // 跳过当前或更低等级
        if (currentLevel && level.level <= currentLevel.level) continue

        // 检查条件：满足任一即可升级
        const meetsCount = stats.totalOrders >= level.minSalesCount
        const meetsAmount = Number(stats.totalSalesAmount) >= Number(level.minSalesAmount)

        if (meetsCount || meetsAmount) {
          // 先停用旧记录
          if (currentRecord) {
            await deps.promoters.deactivateCurrentLevelRecord(repoCtx, {
              userId,
              inactiveAt: new Date().toISOString(),
            })
          }

          // 创建新等级记录
          await deps.promoters.createLevelRecord(repoCtx, {
            userId,
            promoterLevelId: level.id,
            effectiveAt: new Date().toISOString(),
          })

          logger.info({
            action: 'promoter.level.upgrade',
            userId,
            fromLevel: currentLevel?.name ?? 'none',
            toLevel: level.name,
          })

          return level
        }
      }

      return currentLevel ?? null
    },

    /**
    Function: setLevel

    Description: 手动设置等级（管理员功能）

    Parameters:
      params({ userId: string, levelId: string, reason: string | undefined }): 设置参数

    Returns:
      record(PromoterLevelRecord): 等级记录
    */
    async setLevel(params: {
      userId: string
      levelId: string
      reason?: string
    }): Promise<PromoterLevelRecord> {
      // 1. 验证目标等级存在
      const targetLevel = await deps.promoters.getLevelById(repoCtx, { levelId: params.levelId })
      if (!targetLevel) {
        throw new PromoterLevelServiceError('NOT_FOUND', 'Target level not found')
      }

      const nowIso = new Date().toISOString()

      // 2. 停用当前有效记录
      await deps.promoters.deactivateCurrentLevelRecord(repoCtx, {
        userId: params.userId,
        inactiveAt: nowIso,
      })

      // 3. 创建新等级记录
      const record = await deps.promoters.createLevelRecord(repoCtx, {
        userId: params.userId,
        promoterLevelId: params.levelId,
        effectiveAt: nowIso,
      })

      logger.info({
        action: 'promoter.level.set',
        userId: params.userId,
        levelId: params.levelId,
        levelName: targetLevel.name,
        reason: params.reason,
      })

      return record
    },

    /**
    Function: initializeLevelForUser

    Description: 为用户初始化等级（首次成为推广员）

    Parameters:
      userId(string): 用户 ID

    Returns:
      level(PromoterLevel): 初始等级（青铜）
    */
    async initializeLevelForUser(userId: string): Promise<PromoterLevel> {
      // 检查是否已有等级
      const existing = await deps.promoters.getCurrentLevelRecord(repoCtx, { userId })
      if (existing) {
        const level = await deps.promoters.getLevelById(repoCtx, { levelId: existing.promoterLevelId })
        if (!level) {
          throw new PromoterLevelServiceError('INTERNAL_ERROR', 'Existing level not found')
        }
        return level
      }

      // 获取青铜等级（level = 1）
      const bronzeLevel = await deps.promoters.getLevelByNumber(repoCtx, { level: 1 })
      if (!bronzeLevel) {
        throw new PromoterLevelServiceError('INTERNAL_ERROR', 'Bronze level not found')
      }

      // 创建初始等级记录
      await deps.promoters.createLevelRecord(repoCtx, {
        userId,
        promoterLevelId: bronzeLevel.id,
        effectiveAt: new Date().toISOString(),
      })

      logger.info({
        action: 'promoter.level.initialize',
        userId,
        levelName: bronzeLevel.name,
      })

      return bronzeLevel
    },
  }
}
