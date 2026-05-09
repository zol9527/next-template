import type { RepoContext } from '@/types/repo/repo-context'
import type { AdminCategory } from '@/plugins/ecommerce/contracts/admin-categories.dto'

export interface CategoryRepository {
  listCategories(ctx: RepoContext, params?: { search?: string }): Promise<AdminCategory[]>
  getCategoryById(ctx: RepoContext, params: { categoryId: string }): Promise<AdminCategory | null>

  existsCategoryNameInLevel(
    ctx: RepoContext,
    params: {
      name: string
      parentId: string | null
      excludeCategoryId?: string
    }
  ): Promise<boolean>

  createCategory(ctx: RepoContext, params: {
    name: string
    slug?: string | null
    parentId?: string | null
    status?: string
    sortOrder?: number
  }): Promise<AdminCategory>

  updateCategory(ctx: RepoContext, params: {
    categoryId: string
    name?: string
    slug?: string | null
    parentId?: string | null
    status?: string
    sortOrder?: number
  }): Promise<AdminCategory | null>

  deleteCategory(ctx: RepoContext, params: { categoryId: string }): Promise<void>

  hasChildCategories(ctx: RepoContext, params: { categoryId: string }): Promise<boolean>
  countProductsInCategory(ctx: RepoContext, params: { categoryId: string }): Promise<number>
}
