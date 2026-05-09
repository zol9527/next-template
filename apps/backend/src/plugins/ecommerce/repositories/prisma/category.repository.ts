import { prisma } from '@/lib/prisma'
import type { CategoryRepository } from '@/plugins/ecommerce/repositories/interfaces/category.interface'
import type { AdminCategory } from '@/plugins/ecommerce/contracts/admin-categories.dto'
import type { RepoContext } from '@/types/repo/repo-context'

function mapCategory(c: { id: string; parentId: string | null; name: string; slug: string | null; status: string; sortOrder: number; createdAt: Date; updatedAt: Date }): AdminCategory {
  return {
    id: c.id,
    parentId: c.parentId,
    name: c.name,
    slug: c.slug ?? undefined,
    status: c.status as 'active' | 'disabled',
    sortOrder: c.sortOrder,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

export function createPrismaCategoryRepository(): CategoryRepository {
  return {
    async listCategories(ctx: RepoContext, params?: { search?: string }) {
      const { logger } = ctx
      logger.info({ action: 'list_categories', search: params?.search })

      const where: Record<string, unknown> = {}
      if (params?.search) {
        where.name = { contains: params.search }
      }

      const categories = await prisma.category.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      })
      return categories.map(mapCategory)
    },

    async getCategoryById(ctx: RepoContext, params: { categoryId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_category_by_id', categoryId: params.categoryId })

      const category = await prisma.category.findUnique({ where: { id: params.categoryId } })
      if (!category) return null
      return mapCategory(category)
    },

    async existsCategoryNameInLevel(ctx: RepoContext, params: { name: string; parentId: string | null; excludeCategoryId?: string }) {
      const { logger } = ctx
      logger.info({ action: 'exists_category_name_in_level', name: params.name, parentId: params.parentId })

      const where: Record<string, unknown> = {
        name: params.name,
        ...(params.excludeCategoryId && { id: { not: params.excludeCategoryId } }),
      }

      // 明确处理 parentId 为 null 的情况（虽然 Prisma 会自动处理，但为了代码清晰性）
      if (params.parentId === null) {
        where.parentId = null
      } else {
        where.parentId = params.parentId
      }

      const count = await prisma.category.count({ where })
      return count > 0
    },

    async createCategory(ctx: RepoContext, params: { name: string; slug?: string | null; parentId?: string | null; status?: string; sortOrder?: number }) {
      const { logger } = ctx
      logger.info({ action: 'create_category', name: params.name })

      const category = await prisma.category.create({
        data: {
          name: params.name,
          slug: params.slug,
          parentId: params.parentId ?? null,
          status: params.status ?? 'active',
          sortOrder: params.sortOrder ?? 0,
        },
      })
      return mapCategory(category)
    },

    async updateCategory(ctx: RepoContext, params: { categoryId: string; name?: string; slug?: string | null; parentId?: string | null; status?: string; sortOrder?: number }) {
      const { logger } = ctx
      logger.info({ action: 'update_category', categoryId: params.categoryId })

      const updates: Record<string, unknown> = {}
      if (params.name !== undefined) updates.name = params.name
      if (params.slug !== undefined) updates.slug = params.slug
      if (params.parentId !== undefined) updates.parentId = params.parentId
      if (params.status !== undefined) updates.status = params.status
      if (params.sortOrder !== undefined) updates.sortOrder = params.sortOrder

      const category = await prisma.category.update({
        where: { id: params.categoryId },
        data: updates,
      })
      return mapCategory(category)
    },

    async deleteCategory(ctx: RepoContext, params: { categoryId: string }) {
      const { logger } = ctx
      logger.info({ action: 'delete_category', categoryId: params.categoryId })

      await prisma.category.delete({ where: { id: params.categoryId } })
    },

    async hasChildCategories(ctx: RepoContext, params: { categoryId: string }) {
      const { logger } = ctx
      logger.info({ action: 'has_child_categories', categoryId: params.categoryId })

      const count = await prisma.category.count({ where: { parentId: params.categoryId } })
      return count > 0
    },

    async countProductsInCategory(ctx: RepoContext, params: { categoryId: string }) {
      const { logger } = ctx
      logger.info({ action: 'count_products_in_category', categoryId: params.categoryId })

      return prisma.productCategory.count({ where: { categoryId: params.categoryId } })
    },
  }
}
