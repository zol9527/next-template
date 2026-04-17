import type { BlogCategoryRepository } from '@/repositories/interfaces/content/blog-category.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import type {
  AdminBlogCategory,
  AdminBlogCategoryTreeResponse,
} from '@/contracts/dtos/admin/blog/categories.dto'
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

const MAX_CATEGORY_DEPTH = 5

async function calculateBlogCategoryDepth(
  categories: BlogCategoryRepository,
  repoCtx: RepoContext,
  categoryId: string | null,
): Promise<number> {
  if (!categoryId) return 0

  let depth = 0
  let currentId: string | null = categoryId

  while (currentId) {
    const category = await categories.findById(repoCtx, { categoryId: currentId })
    if (!category) break
    depth++
    currentId = category.parentId
  }

  return depth
}

/**
Function: createAdminBlogCategoryService

Description: 创建管理员博客分类服务，负责博客分类 CRUD 与删除规则校验；仅依赖仓储接口，不直接访问数据库

Parameters:
    deps({ categories: BlogCategoryRepository }): 依赖注入的 BlogCategoryRepository
    ctx(ServiceContext): Service 上下文

Returns:
    service(object): 提供 list/create/update/delete 的服务对象
*/
export function createAdminBlogCategoryService(
  deps: { categories: BlogCategoryRepository },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    async listCategories(params?: { search?: string }): Promise<AdminBlogCategoryTreeResponse> {
      const items = await deps.categories.list(repoCtx, params)
      return { items }
    },

    async createCategory(params: {
      name: string
      slug?: string | null
      description?: string | null
      parentId?: string | null
      sortOrder?: number
    }): Promise<AdminBlogCategory> {
      if (params.parentId) {
        const parent = await deps.categories.findById(repoCtx, { categoryId: params.parentId })
        if (!parent) {
          throw makeNotFoundError('父分类不存在')
        }

        const parentDepth = await calculateBlogCategoryDepth(deps.categories, repoCtx, params.parentId)
        if (parentDepth + 1 > MAX_CATEGORY_DEPTH) {
          throw makeConflictError(`分类层级不能超过 ${MAX_CATEGORY_DEPTH} 层`)
        }
      }

      const baseSlug = params.slug ?? generateSlug(params.name)
      const slug = await resolveSlugConflict(baseSlug, async (s) => {
        const existing = await deps.categories.findBySlug(repoCtx, { slug: s })
        return existing !== null
      })

      const created = await deps.categories.create(repoCtx, {
        name: params.name,
        slug,
        description: params.description,
        parentId: params.parentId ?? null,
        sortOrder: params.sortOrder,
      })

      logger.info({ action: 'admin_blog_category.create', categoryId: created.id })

      return created
    },

    async updateCategory(params: {
      categoryId: string
      name?: string
      slug?: string | null
      description?: string | null
      parentId?: string | null
      status?: string
      sortOrder?: number
    }): Promise<AdminBlogCategory | null> {
      if (params.parentId !== undefined && params.parentId) {
        if (params.parentId === params.categoryId) {
          throw makeConflictError('父分类不能是自身')
        }

        const parent = await deps.categories.findById(repoCtx, { categoryId: params.parentId })
        if (!parent) {
          throw makeNotFoundError('父分类不存在')
        }

        // 防止循环：不允许将某个节点的 parent 指向其后代
        const all = await deps.categories.list(repoCtx)
        const parentById = new Map(all.map((c) => [c.id, c.parentId]))

        let cursor: string | null = params.parentId
        while (cursor) {
          if (cursor === params.categoryId) {
            throw makeConflictError('不允许将分类移动到其子分类下（会形成循环）')
          }
          cursor = parentById.get(cursor) ?? null
        }

        const parentDepth = await calculateBlogCategoryDepth(deps.categories, repoCtx, params.parentId)
        if (parentDepth + 1 > MAX_CATEGORY_DEPTH) {
          throw makeConflictError(`分类层级不能超过 ${MAX_CATEGORY_DEPTH} 层`)
        }
      }

      let resolvedSlug = params.slug
      if (params.slug !== undefined) {
        const baseSlug = params.slug ?? generateSlug(params.name ?? '')
        resolvedSlug = await resolveSlugConflict(baseSlug, async (s) => {
          const existing = await deps.categories.findBySlug(repoCtx, { slug: s })
          return existing !== null && existing.id !== params.categoryId
        })
      } else if (params.name && params.slug === undefined) {
        // 名称变更但 slug 未显式指定时保持原有 slug 不变
      }

      const updated = await deps.categories.update(repoCtx, {
        categoryId: params.categoryId,
        name: params.name,
        slug: resolvedSlug,
        description: params.description,
        parentId: params.parentId,
        status: params.status,
        sortOrder: params.sortOrder,
      })

      if (!updated) return null

      logger.info({ action: 'admin_blog_category.update', categoryId: params.categoryId })
      return updated
    },

    async deleteCategory(categoryId: string): Promise<{ id: string }> {
      const exists = await deps.categories.findById(repoCtx, { categoryId })
      if (!exists) {
        throw makeNotFoundError('分类不存在')
      }

      const hasChildren = await deps.categories.hasChildCategories(repoCtx, { categoryId })
      if (hasChildren) {
        throw makeConflictError('分类存在子分类，请先迁移或删除子分类')
      }

      const articleCount = await deps.categories.countArticles(repoCtx, { categoryId })
      if (articleCount > 0) {
        throw makeConflictError('该分类下存在文章，无法删除')
      }

      await deps.categories.delete(repoCtx, { categoryId })

      logger.info({ action: 'admin_blog_category.delete', categoryId })
      return { id: categoryId }
    },
  }
}
