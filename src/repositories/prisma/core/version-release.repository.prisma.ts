import { prisma } from '@/lib/prisma'
import type { VersionReleaseRepository } from '@/repositories/interfaces/core/version-release.repository.interface'
import type { RepoContext } from '@/types/repo/repo-context'

/**
Function: createPrismaVersionReleaseRepository

Description: 创建基于 Prisma 的版本发布记录仓储实现

Parameters:

Returns:
	repository(VersionReleaseRepository): VersionReleaseRepository 的 Prisma 实现
*/
export function createPrismaVersionReleaseRepository(): VersionReleaseRepository {
  return {
    async create(ctx: RepoContext, data: {
      version: string
      title: string
      description: string
      releasedAt: Date
      updatedAt?: Date
    }) {
      const { logger } = ctx
      logger.info({ action: 'version_release.create', version: data.version }, '创建版本发布记录')
      return prisma.versionRelease.create({ data })
    },

    async findByVersion(ctx: RepoContext, version: string) {
      const { logger } = ctx
      logger.info({ action: 'version_release.find_by_version', version }, '查找版本发布记录')
      return prisma.versionRelease.findUnique({ where: { version } })
    },

    async findMany(ctx: RepoContext, params: {
      skip?: number
      take?: number
      orderBy?: { releasedAt: 'asc' | 'desc' }
    }) {
      const { logger } = ctx
      const { skip = 0, take = 20, orderBy = { releasedAt: 'desc' } } = params
      logger.info({ action: 'version_release.find_many', skip, take }, '查询版本发布列表')
      return prisma.versionRelease.findMany({ skip, take, orderBy })
    },

    async count(ctx: RepoContext) {
      const { logger } = ctx
      logger.info({ action: 'version_release.count' }, '统计版本发布数量')
      return prisma.versionRelease.count()
    },

    async exists(ctx: RepoContext, version: string) {
      const { logger } = ctx
      logger.info({ action: 'version_release.exists', version }, '检查版本是否存在')
      const count = await prisma.versionRelease.count({ where: { version } })
      return count > 0
    },
  }
}
