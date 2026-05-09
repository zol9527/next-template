import type { RepoContext } from '@/types/repo/repo-context'
import type { VersionRelease } from '@/lib/prisma/generated/prisma'

/**
 * VersionReleaseRepository
 *
 * 版本发布记录数据访问接口
 * 提供版本发布记录的 CRUD 操作
 */
export interface VersionReleaseRepository {
  /**
   * 创建版本发布记录
   */
  create(ctx: RepoContext, data: {
    version: string
    title: string
    description: string
    releasedAt: Date
  }): Promise<VersionRelease>

  /**
   * 根据版本号查找版本发布记录
   */
  findByVersion(ctx: RepoContext, version: string): Promise<VersionRelease | null>

  /**
   * 分页查询版本发布记录列表
   */
  findMany(ctx: RepoContext, params: {
    skip?: number
    take?: number
    orderBy?: { releasedAt: 'asc' | 'desc' }
  }): Promise<VersionRelease[]>

  /**
   * 统计版本发布记录总数
   */
  count(ctx: RepoContext): Promise<number>

  /**
   * 检查版本号是否已存在
   */
  exists(ctx: RepoContext, version: string): Promise<boolean>
}
