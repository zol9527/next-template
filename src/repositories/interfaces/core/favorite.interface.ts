import type { RepoContext } from '@/types/repo/repo-context'

export interface FavoriteRepository {
  /** 添加收藏 */
  create(ctx: RepoContext, params: {
    userId: string
    targetType: string  // 'course' | 'product' | 'article' — validated by Zod
    targetId: string
  }): Promise<{ id: string; userId: string; targetType: string; targetId: string; createdAt: string }>

  /** 删除收藏（物理删除） */
  deleteById(ctx: RepoContext, params: {
    id: string
    userId: string  // for ownership check
  }): Promise<boolean>

  /** 查找用户对某 target 的收藏 */
  findByUserAndTarget(ctx: RepoContext, params: {
    userId: string
    targetType: string
    targetId: string
  }): Promise<{ id: string; userId: string; targetType: string; targetId: string; createdAt: string } | null>

  /** 用户收藏列表（cursor 分页，按 createdAt 倒序） */
  listByUser(ctx: RepoContext, params: {
    userId: string
    cursor?: string | null
    limit: number
    targetType?: string | null
  }): Promise<{
    items: Array<{ id: string; userId: string; targetType: string; targetId: string; createdAt: string }>
    nextCursor: string | null
    hasMore: boolean
  }>

  /** 统计 target 的收藏数 */
  countByTarget(ctx: RepoContext, params: {
    targetType: string
    targetId: string
  }): Promise<number>
}
