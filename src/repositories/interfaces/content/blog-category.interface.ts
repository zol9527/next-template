import type { RepoContext } from '@/types/repo/repo-context'
import type { AdminBlogCategory } from '@/contracts/dtos/admin/blog/categories.dto'

export interface BlogCategoryRepository {
  list(ctx: RepoContext, params?: { search?: string }): Promise<AdminBlogCategory[]>

  findById(ctx: RepoContext, params: { categoryId: string }): Promise<AdminBlogCategory | null>

  findBySlug(ctx: RepoContext, params: { slug: string }): Promise<AdminBlogCategory | null>

  create(ctx: RepoContext, params: {
    name: string
    slug?: string
    description?: string | null
    parentId?: string | null
    sortOrder?: number
    status?: string
  }): Promise<AdminBlogCategory>

  update(ctx: RepoContext, params: {
    categoryId: string
    name?: string
    slug?: string | null
    description?: string | null
    parentId?: string | null
    status?: string
    sortOrder?: number
  }): Promise<AdminBlogCategory | null>

  delete(ctx: RepoContext, params: { categoryId: string }): Promise<void>

  countArticles(ctx: RepoContext, params: { categoryId: string }): Promise<number>

  hasChildCategories(ctx: RepoContext, params: { categoryId: string }): Promise<boolean>
}
