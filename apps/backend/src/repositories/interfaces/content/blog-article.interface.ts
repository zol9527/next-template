import type { RepoContext } from '@/types/repo/repo-context'
import type { AdminArticle } from '@/contracts/dtos/admin/blog/articles.dto'

export interface BlogArticleRepository {
  create(ctx: RepoContext, params: {
    title: string
    slug: string
    excerpt?: string | null
    content?: string | null
    coverImage?: string | null
    status?: string
    authorId?: string | null
    categoryId?: string | null
    metaTitle?: string | null
    metaDescription?: string | null
    ogImage?: string | null
    sourceType?: string
    sourcePath?: string | null
  }): Promise<AdminArticle>

  findById(ctx: RepoContext, params: { articleId: string }): Promise<AdminArticle | null>

  findBySlug(ctx: RepoContext, params: { slug: string }): Promise<AdminArticle | null>

  update(ctx: RepoContext, params: {
    articleId: string
    title?: string
    slug?: string | null
    excerpt?: string | null
    content?: string | null
    coverImage?: string | null
    status?: string
    categoryId?: string | null
    metaTitle?: string | null
    metaDescription?: string | null
    ogImage?: string | null
    sourceType?: string
    sourcePath?: string | null
    publishedAt?: Date | null
  }): Promise<AdminArticle | null>

  softDelete(ctx: RepoContext, params: { articleId: string }): Promise<AdminArticle | null>

  list(ctx: RepoContext, params: {
    limit: number
    cursor?: string | null
    keyword?: string
    status?: string
    categoryId?: string
    tagId?: string
  }): Promise<{ items: AdminArticle[]; nextCursor: string | null; totalCount: number }>

  slugExists(ctx: RepoContext, params: { slug: string; excludeId?: string }): Promise<boolean>

  // 批量操作
  batchUpdateStatus(ctx: RepoContext, params: { articleIds: string[]; status: string }): Promise<{ updatedCount: number; failedIds: string[] }>
  batchSoftDelete(ctx: RepoContext, params: { articleIds: string[] }): Promise<{ deletedCount: number; failedIds: string[] }>

  incrementViewCount(ctx: RepoContext, params: { articleId: string }): Promise<void>

  getStats(ctx: RepoContext): Promise<{
    totalArticles: number
    publishedCount: number
    draftCount: number
    archivedCount: number
    totalViews: number
  }>
}
