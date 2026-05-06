import type { FavoriteRepository } from '@/repositories/interfaces/core/favorite.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'

// ============ 收藏业务错误定义 ============

type FavoriteErrorCode = 'ALREADY_FAVORITED' | 'NOT_FOUND' | 'INTERNAL_ERROR'

export class FavoriteError extends Error {
  public readonly code: FavoriteErrorCode
  constructor(code: FavoriteErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

/**
 * 判断是否为 Prisma 唯一约束冲突错误 (P2002)
 * 作为并发场景下的安全兜底，防止重复收藏
 */
function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: string }
  return e.code === 'P2002'
}

// ============ 收藏服务工厂函数 ============

export function createFavoriteService(
  deps: {
    favorite: FavoriteRepository
  },
  ctx: ServiceContext
) {
  const { logger } = ctx

  // 构建 Repository 层上下文，绑定 traceId 和子 logger
  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    /**
     * 添加收藏
     *
     * 流程：
     * 1. 检查是否已收藏（防止重复）
     * 2. 创建收藏记录
     * 3. 捕获 Prisma P2002 唯一约束错误作为并发安全兜底
     *
     * 注意：不验证 targetId 是否存在（决策 D4，避免跨模块耦合）
     */
    async addFavorite(
      userId: string,
      targetType: string,
      targetId: string
    ): Promise<{ id: string; userId: string; targetType: string; targetId: string; createdAt: string }> {
      logger.info({ userId, targetType, targetId }, '添加收藏')

      // 检查是否已收藏
      const existing = await deps.favorite.findByUserAndTarget(repoCtx, {
        userId,
        targetType,
        targetId,
      })

      if (existing) {
        logger.warn({ userId, targetType, targetId, existingId: existing.id }, '重复收藏')
        throw new FavoriteError('ALREADY_FAVORITED', '已经收藏过该内容')
      }

      try {
        const favorite = await deps.favorite.create(repoCtx, {
          userId,
          targetType,
          targetId,
        })

        logger.info({ favoriteId: favorite.id }, '收藏添加成功')
        return favorite
      } catch (error) {
        // 并发安全兜底：捕获唯一约束冲突
        if (isUniqueConstraintError(error)) {
          logger.warn({ userId, targetType, targetId }, '并发场景下重复收藏（P2002 兜底）')
          throw new FavoriteError('ALREADY_FAVORITED', '已经收藏过该内容')
        }
        throw error
      }
    },

    /**
     * 移除收藏
     *
     * 物理删除（决策 D2），不使用软删除。
     * 通过 repository 层的 userId 参数进行所有权校验。
     */
    async removeFavorite(
      userId: string,
      favoriteId: string
    ): Promise<{ id: string }> {
      logger.info({ userId, favoriteId }, '移除收藏')

      // 删除并校验所有权（repository 层通过 userId 过滤）
      const deleted = await deps.favorite.deleteById(repoCtx, {
        id: favoriteId,
        userId,
      })

      if (!deleted) {
        logger.warn({ userId, favoriteId }, '收藏项不存在或无权删除')
        throw new FavoriteError('NOT_FOUND', '收藏项不存在或无权删除')
      }

      logger.info({ favoriteId }, '收藏移除成功')
      return { id: favoriteId }
    },

    /**
     * 获取用户收藏列表（cursor 分页）
     *
     * 返回格式：{ items, nextCursor, hasMore }
     * 不返回 totalCount（决策 D7）
     */
    async listFavorites(
      userId: string,
      query: {
        cursor?: string | null
        limit: number
        targetType?: string | null
      }
    ): Promise<{
      items: Array<{ id: string; userId: string; targetType: string; targetId: string; createdAt: string }>
      nextCursor: string | null
      hasMore: boolean
    }> {
      logger.info({ userId, limit: query.limit, targetType: query.targetType }, '获取收藏列表')

      const result = await deps.favorite.listByUser(repoCtx, {
        userId,
        ...query,
      })

      logger.info({ userId, count: result.items.length, hasMore: result.hasMore }, '收藏列表查询完成')
      return result
    },

    /**
     * 检查用户是否已收藏某目标
     *
     * 返回收藏状态和收藏 ID（已收藏时）
     */
    async checkFavorite(
      userId: string,
      targetType: string,
      targetId: string
    ): Promise<{ isFavorited: boolean; favoriteId?: string }> {
      logger.debug({ userId, targetType, targetId }, '检查收藏状态')

      const result = await deps.favorite.findByUserAndTarget(repoCtx, {
        userId,
        targetType,
        targetId,
      })

      return {
        isFavorited: !!result,
        favoriteId: result?.id,
      }
    },
  }
}
