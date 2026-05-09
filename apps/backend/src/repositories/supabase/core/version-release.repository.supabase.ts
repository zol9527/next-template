import { createSupabaseServiceRoleClient } from '@/lib/supabase/client'
import type { VersionReleaseRepository } from '@/repositories/interfaces/core/version-release.repository.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import type { VersionRelease } from '@/lib/prisma/generated/prisma'

const supabase = createSupabaseServiceRoleClient()

/**
Function: createSupabaseVersionReleaseRepository

Description: 创建基于 Supabase（Service Role）的版本发布记录仓储实现

Parameters:

Returns:
	repository(VersionReleaseRepository): VersionReleaseRepository 的 Supabase 实现
*/
export function createSupabaseVersionReleaseRepository(): VersionReleaseRepository {
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

      const { data: result, error } = await supabase
        .from('version_releases')
        .insert({
          version: data.version,
          title: data.title,
          description: data.description,
          released_at: data.releasedAt.toISOString(),
          updated_at: (data.updatedAt || data.releasedAt).toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return result as unknown as VersionRelease
    },

    async findByVersion(ctx: RepoContext, version: string) {
      const { logger } = ctx
      logger.info({ action: 'version_release.find_by_version', version }, '查找版本发布记录')

      const { data, error } = await supabase
        .from('version_releases')
        .select()
        .eq('version', version)
        .maybeSingle()

      if (error) throw error
      return data as VersionRelease | null
    },

    async findMany(ctx: RepoContext, params: {
      skip?: number
      take?: number
      orderBy?: { releasedAt: 'asc' | 'desc' }
    }) {
      const { logger } = ctx
      const { skip = 0, take = 20, orderBy = { releasedAt: 'desc' } } = params
      logger.info({ action: 'version_release.find_many', skip, take }, '查询版本发布列表')

      const { data, error } = await supabase
        .from('version_releases')
        .select()
        .order('released_at', { ascending: orderBy.releasedAt === 'asc' })
        .range(skip, skip + take - 1)

      if (error) throw error
      return (data || []) as VersionRelease[]
    },

    async count(ctx: RepoContext) {
      const { logger } = ctx
      logger.info({ action: 'version_release.count' }, '统计版本发布数量')

      const { count, error } = await supabase
        .from('version_releases')
        .select('*', { count: 'exact', head: true })

      if (error) throw error
      return count || 0
    },

    async exists(ctx: RepoContext, version: string) {
      const { logger } = ctx
      logger.info({ action: 'version_release.exists', version }, '检查版本是否存在')

      const { count, error } = await supabase
        .from('version_releases')
        .select('*', { count: 'exact', head: true })
        .eq('version', version)

      if (error) throw error
      return (count || 0) > 0
    },
  }
}
