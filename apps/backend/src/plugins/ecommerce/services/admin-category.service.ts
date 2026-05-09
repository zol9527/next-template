import type {
  AdminCategory,
  AdminCategoryStatus,
  AdminCategoryTreeResponse,
} from '@/plugins/ecommerce/contracts/admin-categories.dto'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import type { CategoryRepository } from '@/plugins/ecommerce/repositories/interfaces/category.interface'

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

async function calculateCategoryDepth(
  categories: CategoryRepository,
  repoCtx: RepoContext,
  categoryId: string | null
): Promise<number> {
  if (!categoryId) return 0

  let depth = 0
  let currentId: string | null = categoryId

  while (currentId) {
    const category = await categories.getCategoryById(repoCtx, { categoryId: currentId })
    if (!category) break
    depth++
    currentId = category.parentId
  }

  return depth
}

/**
Function: createAdminCategoryService

Description: 创建管理员分类服务（US2），负责分类 CRUD 与删除规则校验；仅依赖仓储接口，不直接访问数据库

Parameters:
    deps({ categories: CategoryRepository }): 依赖注入的 CategoryRepository
    ctx(ServiceContext): Service 上下文

Returns:
    service(object): 提供 list/create/update/delete 的服务对象
*/
export function createAdminCategoryService(
  deps: { categories: CategoryRepository },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    async listCategories(params?: { search?: string }): Promise<AdminCategoryTreeResponse> {
      const items = await deps.categories.listCategories(repoCtx, params)
      return { items }
    },

    async createCategory(params: {
      name: string
      slug?: string | null
      parentId?: string | null
      sortOrder?: number
    }): Promise<AdminCategory> {
      if (params.parentId) {
        const parent = await deps.categories.getCategoryById(repoCtx, { categoryId: params.parentId })
        if (!parent) {
          throw makeNotFoundError('父分类不存在')
        }

        const parentDepth = await calculateCategoryDepth(deps.categories, repoCtx, params.parentId)
        if (parentDepth + 1 >= MAX_CATEGORY_DEPTH) {
          throw makeConflictError(`分类层级不能超过 ${MAX_CATEGORY_DEPTH} 层`)
        }
      }

      // 检查同级分类名称是否已存在
      const nameExists = await deps.categories.existsCategoryNameInLevel(
        repoCtx,
        { name: params.name, parentId: params.parentId ?? null }
      )
      if (nameExists) {
        throw makeConflictError('同级分类名称已存在')
      }

      const created = await deps.categories.createCategory(repoCtx, {
        name: params.name,
        slug: params.slug,
        parentId: params.parentId ?? null,
        status: 'active',
        sortOrder: params.sortOrder,
      })

      logger.info({ action: 'admin_category.create', categoryId: created.id, parentId: created.parentId })

      return created
    },

    async updateCategory(params: {
      categoryId: string
      name?: string
      slug?: string | null
      parentId?: string | null
      status?: AdminCategoryStatus
      sortOrder?: number
    }): Promise<AdminCategory | null> {
      if (params.parentId !== undefined && params.parentId) {
        if (params.parentId === params.categoryId) {
          throw makeConflictError('父分类不能是自身')
        }

        const parent = await deps.categories.getCategoryById(repoCtx, { categoryId: params.parentId })
        if (!parent) {
          throw makeNotFoundError('父分类不存在')
        }

        // 防止循环：不允许将某个节点的 parent 指向其后代
        const all = await deps.categories.listCategories(repoCtx)
        const parentById = new Map(all.map((c) => [c.id, c.parentId]))

        let cursor: string | null = params.parentId
        while (cursor) {
          if (cursor === params.categoryId) {
            throw makeConflictError('不允许将分类移动到其子分类下（会形成循环）')
          }
          cursor = parentById.get(cursor) ?? null
        }

        const parentDepth = await calculateCategoryDepth(deps.categories, repoCtx, params.parentId)
        if (parentDepth + 1 >= MAX_CATEGORY_DEPTH) {
          throw makeConflictError(`分类层级不能超过 ${MAX_CATEGORY_DEPTH} 层`)
        }
      }

      // 如果更新了名称，检查同级分类名称是否已存在（排除自身）
      if (params.name) {
        // 确定新的父分类（如果未指定，保持原有父分类）
        let newParentId: string | null = params.parentId !== undefined ? params.parentId : null

        // 如果没有指定新的父分类，需要获取当前的父分类
        if (params.parentId === undefined) {
          const current = await deps.categories.getCategoryById(repoCtx, { categoryId: params.categoryId })
          if (!current) {
            throw makeNotFoundError('分类不存在')
          }
          newParentId = current.parentId ?? null
        }

        const nameExists = await deps.categories.existsCategoryNameInLevel(
          repoCtx,
          { name: params.name, parentId: newParentId, excludeCategoryId: params.categoryId }
        )
        if (nameExists) {
          throw makeConflictError('同级分类名称已存在')
        }
      }

      const updated = await deps.categories.updateCategory(repoCtx, {
        categoryId: params.categoryId,
        name: params.name,
        slug: params.slug,
        parentId: params.parentId,
        status: params.status,
        sortOrder: params.sortOrder,
      })

      if (!updated) return null

      logger.info({ action: 'admin_category.update', categoryId: params.categoryId })
      return updated
    },

    async deleteCategory(categoryId: string): Promise<{ id: string }> {
      const exists = await deps.categories.getCategoryById(repoCtx, { categoryId })
      if (!exists) {
        throw makeNotFoundError('分类不存在')
      }

      const hasChildren = await deps.categories.hasChildCategories(repoCtx, { categoryId })
      if (hasChildren) {
        throw makeConflictError('分类存在子分类，请先迁移或删除子分类后再删除')
      }

      const productCount = await deps.categories.countProductsInCategory(repoCtx, { categoryId })
      if (productCount > 0) {
        throw makeConflictError('分类已关联商品，请先解除商品归类后再删除')
      }

      await deps.categories.deleteCategory(repoCtx, { categoryId })

      logger.info({ action: 'admin_category.delete', categoryId })
      return { id: categoryId }
    },
  }
}
