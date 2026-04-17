import type { BlogTagRepository } from '@/repositories/interfaces/content/blog-tag.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import type {
  AdminBlogTag,
  AdminBlogTagListResponse,
} from '@/contracts/dtos/admin/blog/tags.dto'
import { generateSlug, resolveSlugConflict } from '@/lib/utils/slug.util'

function makeConflictError(message: string): Error & { code: 'CONFLICT' } {
  const error = new Error(message) as Error & { code: 'CONFLICT' }
  error.code = 'CONFLICT'
  return error
}

function makeNotFoundError(message: string): Error & { code: 'NOT_FOUND' } {
  const error = new Error(message) as Error & { code: 'NOT_FOUND' }
  error.code = 'NOT_FOUND'
  return error
}

/**
Function: createAdminBlogTagService

Description: 创建管理员博客标签服务，负责标签 CRUD、名称标准化与批量查找或创建；仅依赖仓储接口，不直接访问数据库

Parameters:
    deps({ tags: BlogTagRepository }): 依赖注入的 BlogTagRepository
    ctx(ServiceContext): Service 上下文

Returns:
    service(object): 提供 list/create/update/delete/batchFindOrCreateTags 的服务对象
*/
export function createAdminBlogTagService(
  deps: { tags: BlogTagRepository },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    async listTags(params?: { keyword?: string }): Promise<AdminBlogTagListResponse> {
      const items = await deps.tags.list(repoCtx, params)
      return { items }
    },

    async createTag(params: { name: string; slug?: string }): Promise<AdminBlogTag> {
      const normalizedName = params.name.toLowerCase().trim()

      const existing = await deps.tags.findByName(repoCtx, { name: normalizedName })
      if (existing) {
        throw makeConflictError('标签名称已存在')
      }

      const baseSlug = params.slug ?? generateSlug(normalizedName)
      const slug = await resolveSlugConflict(baseSlug, async (s) => {
        const found = await deps.tags.findBySlug(repoCtx, { slug: s })
        return found !== null
      })

      const created = await deps.tags.create(repoCtx, {
        name: normalizedName,
        slug,
      })

      logger.info({ action: 'admin_blog_tag.create', tagId: created.id })

      return created
    },

    async updateTag(params: {
      tagId: string
      name?: string
      slug?: string
    }): Promise<AdminBlogTag | null> {
      if (params.name) {
        const normalizedName = params.name.toLowerCase().trim()

        const existing = await deps.tags.findByName(repoCtx, { name: normalizedName })
        if (existing && existing.id !== params.tagId) {
          throw makeConflictError('标签名称已存在')
        }

        const baseSlug = params.slug ?? generateSlug(normalizedName)
        const slug = await resolveSlugConflict(baseSlug, async (s) => {
          const found = await deps.tags.findBySlug(repoCtx, { slug: s })
          return found !== null && found.id !== params.tagId
        })

        const updated = await deps.tags.update(repoCtx, {
          tagId: params.tagId,
          name: normalizedName,
          slug,
        })

        if (!updated) return null

        logger.info({ action: 'admin_blog_tag.update', tagId: params.tagId })
        return updated
      }

      if (params.slug) {
        const slug = await resolveSlugConflict(params.slug, async (s) => {
          const found = await deps.tags.findBySlug(repoCtx, { slug: s })
          return found !== null && found.id !== params.tagId
        })

        const updated = await deps.tags.update(repoCtx, {
          tagId: params.tagId,
          slug,
        })

        if (!updated) return null

        logger.info({ action: 'admin_blog_tag.update', tagId: params.tagId })
        return updated
      }

      return null
    },

    async deleteTag(tagId: string): Promise<{ id: string }> {
      const exists = await deps.tags.findById(repoCtx, { tagId })
      if (!exists) {
        throw makeNotFoundError('标签不存在')
      }

      await deps.tags.delete(repoCtx, { tagId })

      logger.info({ action: 'admin_blog_tag.delete', tagId })
      return { id: tagId }
    },

    async batchFindOrCreateTags(params: { names: string[] }): Promise<{ tags: AdminBlogTag[] }> {
      const normalizedNames = params.names.map((n) => n.toLowerCase().trim())

      const result = await deps.tags.batchFindOrCreate(repoCtx, { names: normalizedNames })

      logger.info({
        action: 'admin_blog_tag.batch_find_or_create',
        count: result.length,
      })

      return { tags: result }
    },
  }
}
