import type { RepoContext } from '@/types/repo/repo-context'
import type { AdminBlogTag } from '@/contracts/dtos/admin/blog/tags.dto'

export interface BlogTagRepository {
  list(ctx: RepoContext, params?: { keyword?: string }): Promise<AdminBlogTag[]>

  findById(ctx: RepoContext, params: { tagId: string }): Promise<AdminBlogTag | null>

  findBySlug(ctx: RepoContext, params: { slug: string }): Promise<AdminBlogTag | null>

  findByName(ctx: RepoContext, params: { name: string }): Promise<AdminBlogTag | null>

  create(ctx: RepoContext, params: {
    name: string
    slug?: string
  }): Promise<AdminBlogTag>

  update(ctx: RepoContext, params: {
    tagId: string
    name?: string
    slug?: string
  }): Promise<AdminBlogTag | null>

  delete(ctx: RepoContext, params: { tagId: string }): Promise<void>

  batchFindOrCreate(ctx: RepoContext, params: { names: string[] }): Promise<AdminBlogTag[]>

  setArticleTags(ctx: RepoContext, params: { articleId: string; tagIds: string[] }): Promise<void>
  getArticleTagIds(ctx: RepoContext, params: { articleId: string }): Promise<string[]>
}
