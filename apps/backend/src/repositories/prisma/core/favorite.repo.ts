import type { FavoriteRepository } from '@/repositories/interfaces/core/favorite.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import { prisma } from '@/lib/prisma'

/**
 * Function: transformFavorite
 *
 * Description: 将 Prisma Favorite 模型转换为 DTO
 *
 * Parameters:
 *   row: Prisma 返回的原始收藏数据
 *
 * Returns:
 *   转换后的 Favorite DTO
 */
function transformFavorite(row: {
  id: string
  userId: string
  targetType: string
  targetId: string
  createdAt: Date
}): { id: string; userId: string; targetType: string; targetId: string; createdAt: string } {
  return {
    id: row.id,
    userId: row.userId,
    targetType: row.targetType,
    targetId: row.targetId,
    createdAt: row.createdAt.toISOString(),
  }
}

/**
 * Function: createPrismaFavoriteRepository
 *
 * Description: 创建基于 Prisma 的收藏仓库实例，实现 FavoriteRepository 接口
 *
 * Returns:
 *   FavoriteRepository: 收藏仓库实例
 */
export function createPrismaFavoriteRepository(): FavoriteRepository {
  return {
    // 让 @@unique([userId, targetType, targetId]) 处理重复，service 层捕获 Prisma 唯一约束错误
    async create(
      ctx: RepoContext,
      params: { userId: string; targetType: string; targetId: string }
    ): Promise<{ id: string; userId: string; targetType: string; targetId: string; createdAt: string }> {
      ctx.logger.info(
        { userId: params.userId, targetType: params.targetType, targetId: params.targetId },
        'Creating favorite'
      )

      const favorite = await prisma.favorite.create({
        data: {
          userId: params.userId,
          targetType: params.targetType,
          targetId: params.targetId,
        },
      })

      return transformFavorite(favorite)
    },

    /**
     * 物理删除：使用 deleteMany 避免 not-found 抛异常，userId 确保归属校验
     */
    async deleteById(
      ctx: RepoContext,
      params: { id: string; userId: string }
    ): Promise<boolean> {
      ctx.logger.info({ id: params.id, userId: params.userId }, 'Deleting favorite')

      const result = await prisma.favorite.deleteMany({
        where: { id: params.id, userId: params.userId },
      })

      return result.count > 0
    },

    async findByUserAndTarget(
      ctx: RepoContext,
      params: { userId: string; targetType: string; targetId: string }
    ): Promise<{ id: string; userId: string; targetType: string; targetId: string; createdAt: string } | null> {
      ctx.logger.debug(
        { userId: params.userId, targetType: params.targetType, targetId: params.targetId },
        'Finding favorite by user and target'
      )

      const favorite = await prisma.favorite.findFirst({
        where: {
          userId: params.userId,
          targetType: params.targetType,
          targetId: params.targetId,
        },
      })

      return favorite ? transformFavorite(favorite) : null
    },

    async listByUser(
      ctx: RepoContext,
      params: {
        userId: string
        cursor?: string | null
        limit: number
        targetType?: string | null
      }
    ): Promise<{
      items: Array<{ id: string; userId: string; targetType: string; targetId: string; createdAt: string }>
      nextCursor: string | null
      hasMore: boolean
    }> {
      ctx.logger.debug(
        { userId: params.userId, cursor: params.cursor, limit: params.limit, targetType: params.targetType },
        'Listing favorites by user'
      )

      // 安全限制：单次最多获取 50 条
      const safeLimit = Math.min(params.limit, 50)

      const where: Record<string, unknown> = { userId: params.userId }
      if (params.targetType) {
        where.targetType = params.targetType
      }
      if (params.cursor) {
        where.createdAt = { lt: new Date(params.cursor) }
      }

      // 多取一条用于判断是否还有更多数据
      const favorites = await prisma.favorite.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: safeLimit + 1,
      })

      const hasMore = favorites.length > safeLimit
      const items = hasMore ? favorites.slice(0, safeLimit) : favorites
      const nextCursor =
        hasMore && items.length > 0
          ? items[items.length - 1]?.createdAt.toISOString() ?? null
          : null

      return {
        items: items.map(transformFavorite),
        nextCursor,
        hasMore,
      }
    },

    async countByTarget(
      ctx: RepoContext,
      params: { targetType: string; targetId: string }
    ): Promise<number> {
      ctx.logger.debug(
        { targetType: params.targetType, targetId: params.targetId },
        'Counting favorites by target'
      )

      return prisma.favorite.count({
        where: {
          targetType: params.targetType,
          targetId: params.targetId,
        },
      })
    },
  }
}
