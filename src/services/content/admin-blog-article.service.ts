import type { AdminArticle, AdminArticleListResponse, AdminArticleStatus } from '@/contracts/dtos/admin/blog/articles.dto'
import type { BlogArticleRepository } from '@/repositories/interfaces/content/blog-article.interface'
import type { BlogTagRepository } from '@/repositories/interfaces/content/blog-tag.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import { sanitizeHtml } from '@/lib/utils/sanitize-html.util'
import { generateSlug, resolveSlugConflict } from '@/lib/utils/slug.util'

/**
Function: createAdminBlogArticleService

Description: 创建管理员博客文章服务，负责文章 CRUD、发布/归档/软删除以及批量操作；仅依赖仓储接口，不直接访问数据库

Parameters:
    deps(object): 依赖注入
      articles(BlogArticleRepository): 文章仓储
      tags(BlogTagRepository): 标签仓储
    ctx(ServiceContext): Service 上下文

Returns:
    service(object): 提供 createArticle/updateArticle/publishArticle/archiveArticle/deleteArticle/getArticleById/getArticleBySlug/listArticles/batchUpdateStatus/batchSoftDelete/getStats 的服务对象
*/
export function createAdminBlogArticleService(
  deps: {
    articles: BlogArticleRepository
    tags: BlogTagRepository
  },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    /**
    Function: createArticle

    Description: 创建文章，自动生成 slug 并处理冲突，消毒 HTML 内容，默认状态为 DRAFT

    Parameters:
        params(object): 创建文章参数（title, content, excerpt, coverImage, categoryId, metaTitle, metaDescription, ogImage, sourceType, sourcePath, tagIds）

    Returns:
        Promise<AdminArticle>: 创建后的文章
    */
    async createArticle(params: {
      title: string
      content?: string | null
      excerpt?: string | null
      coverImage?: string | null
      categoryId?: string | null
      metaTitle?: string | null
      metaDescription?: string | null
      ogImage?: string | null
      sourceType?: string
      sourcePath?: string | null
      tagIds?: string[]
      authorId?: string | null
    }): Promise<AdminArticle> {
      const baseSlug = generateSlug(params.title)
      const slug = await resolveSlugConflict(baseSlug, (s) =>
        deps.articles.slugExists(repoCtx, { slug: s }),
      )

      const sanitizedContent = params.content ? sanitizeHtml(params.content) : null

      const created = await deps.articles.create(repoCtx, {
        title: params.title,
        slug,
        excerpt: params.excerpt ?? null,
        content: sanitizedContent,
        coverImage: params.coverImage ?? null,
        status: 'DRAFT',
        authorId: params.authorId ?? null,
        categoryId: params.categoryId ?? null,
        metaTitle: params.metaTitle ?? null,
        metaDescription: params.metaDescription ?? null,
        ogImage: params.ogImage ?? null,
        sourceType: params.sourceType ?? 'EDITOR',
        sourcePath: params.sourcePath ?? null,
      })

      if (params.tagIds && params.tagIds.length > 0) {
        await deps.tags.setArticleTags(repoCtx, {
          articleId: created.id,
          tagIds: params.tagIds,
        })
      }

      logger.info({
        action: 'admin_blog_article.create',
        articleId: created.id,
        slug,
        hasContent: Boolean(sanitizedContent),
        tagCount: params.tagIds?.length ?? 0,
      })

      return created
    },

    /**
    Function: updateArticle

    Description: 更新文章，验证文章存在，如果提供了 content 则进行 HTML 消毒

    Parameters:
        params(object): 更新文章参数（articleId, title, slug, content, excerpt, coverImage, categoryId, metaTitle, metaDescription, ogImage, sourceType, sourcePath, tagIds）

    Returns:
        Promise<AdminArticle | null>: 更新后的文章，不存在返回 null
    */
    async updateArticle(params: {
      articleId: string
      title?: string
      slug?: string | null
      content?: string | null
      excerpt?: string | null
      coverImage?: string | null
      categoryId?: string | null
      metaTitle?: string | null
      metaDescription?: string | null
      ogImage?: string | null
      sourceType?: string
      sourcePath?: string | null
      tagIds?: string[]
    }): Promise<AdminArticle | null> {
      const existing = await deps.articles.findById(repoCtx, { articleId: params.articleId })
      if (!existing) {
        const error = new Error('文章不存在') as Error & { code?: string }
        error.code = 'NOT_FOUND'
        throw error
      }

      const sanitizedContent = params.content !== undefined
        ? (params.content ? sanitizeHtml(params.content) : null)
        : undefined

      const updated = await deps.articles.update(repoCtx, {
        articleId: params.articleId,
        title: params.title,
        slug: params.slug,
        content: sanitizedContent,
        excerpt: params.excerpt,
        coverImage: params.coverImage,
        categoryId: params.categoryId,
        metaTitle: params.metaTitle,
        metaDescription: params.metaDescription,
        ogImage: params.ogImage,
        sourceType: params.sourceType,
        sourcePath: params.sourcePath,
      })

      if (!updated) return null

      if (params.tagIds !== undefined) {
        await deps.tags.setArticleTags(repoCtx, {
          articleId: updated.id,
          tagIds: params.tagIds,
        })
      }

      logger.info({
        action: 'admin_blog_article.update',
        articleId: params.articleId,
        contentUpdated: params.content !== undefined,
        tagsUpdated: params.tagIds !== undefined,
      })

      return updated
    },

    /**
    Function: publishArticle

    Description: 发布文章，验证文章存在且内容非空

    Parameters:
        articleId(string): 文章 ID

    Returns:
        Promise<AdminArticle>: 发布后的文章
    */
    async publishArticle(articleId: string): Promise<AdminArticle> {
      const article = await deps.articles.findById(repoCtx, { articleId })

      if (!article) {
        const error = new Error('文章不存在') as Error & { code?: string }
        error.code = 'NOT_FOUND'
        throw error
      }

      if (!article.content || article.content.trim() === '') {
        const error = new Error('文章内容不能为空，无法发布') as Error & { code?: string }
        error.code = 'INVALID_STATE'
        throw error
      }

      const updated = await deps.articles.update(repoCtx, {
        articleId,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      })

      if (!updated) {
        const error = new Error('文章发布失败') as Error & { code?: string }
        error.code = 'NOT_FOUND'
        throw error
      }

      logger.info({
        action: 'admin_blog_article.publish',
        articleId,
      })

      return updated
    },

    /**
    Function: archiveArticle

    Description: 归档文章，将状态更改为 ARCHIVED

    Parameters:
        articleId(string): 文章 ID

    Returns:
        Promise<AdminArticle | null>: 归档后的文章，不存在返回 null
    */
    async archiveArticle(articleId: string): Promise<AdminArticle | null> {
      const existing = await deps.articles.findById(repoCtx, { articleId })
      if (!existing) {
        const error = new Error('文章不存在') as Error & { code?: string }
        error.code = 'NOT_FOUND'
        throw error
      }

      const updated = await deps.articles.update(repoCtx, {
        articleId,
        status: 'ARCHIVED',
      })

      if (!updated) return null

      logger.info({
        action: 'admin_blog_article.archive',
        articleId,
      })

      return updated
    },

    /**
    Function: deleteArticle

    Description: 软删除文章

    Parameters:
        articleId(string): 文章 ID

    Returns:
        Promise<AdminArticle | null>: 软删除后的文章，不存在返回 null
    */
    async deleteArticle(articleId: string): Promise<AdminArticle | null> {
      const deleted = await deps.articles.softDelete(repoCtx, { articleId })

      if (!deleted) return null

      logger.info({
        action: 'admin_blog_article.delete',
        articleId,
      })

      return deleted
    },

    /**
    Function: getArticleById

    Description: 根据 ID 获取文章详情

    Parameters:
        articleId(string): 文章 ID

    Returns:
        Promise<AdminArticle | null>: 文章详情，不存在返回 null
    */
    async getArticleById(articleId: string): Promise<AdminArticle | null> {
      return deps.articles.findById(repoCtx, { articleId })
    },

    /**
    Function: getArticleBySlug

    Description: 根据 slug 获取文章详情

    Parameters:
        slug(string): 文章 slug

    Returns:
        Promise<AdminArticle | null>: 文章详情，不存在返回 null
    */
    async getArticleBySlug(slug: string): Promise<AdminArticle | null> {
      return deps.articles.findBySlug(repoCtx, { slug })
    },

    /**
    Function: listArticles

    Description: 分页查询文章列表，支持关键词、状态和分类筛选

    Parameters:
        params(object): 查询参数（limit, cursor, keyword, status, categoryId）

    Returns:
        Promise<AdminArticleListResponse>: 分页文章列表
    */
    async listArticles(params?: {
      limit?: number
      cursor?: string | null
      keyword?: string
      status?: AdminArticleStatus
      categoryId?: string
    }): Promise<AdminArticleListResponse> {
      const limit = Math.max(1, Math.min(params?.limit ?? 20, 50))
      const cursor = params?.cursor ?? null

      const page = await deps.articles.list(repoCtx, {
        limit,
        cursor,
        keyword: params?.keyword,
        status: params?.status,
        categoryId: params?.categoryId,
      })

      return {
        items: page.items,
        nextCursor: page.nextCursor,
        totalCount: page.totalCount,
      }
    },

    /**
    Function: batchUpdateStatus

    Description: 批量更新文章状态

    Parameters:
        params(object): 批量更新参数（articleIds, status）

    Returns:
        Promise<{ updatedCount: number, failedIds: string[] }>: 更新结果
    */
    async batchUpdateStatus(params: {
      articleIds: string[]
      status: AdminArticleStatus
    }): Promise<{ updatedCount: number; failedIds: string[] }> {
      logger.info({
        action: 'admin_blog_article.batch_update_status',
        count: params.articleIds.length,
        status: params.status,
      })

      const result = await deps.articles.batchUpdateStatus(repoCtx, {
        articleIds: params.articleIds,
        status: params.status,
      })

      logger.info({
        action: 'admin_blog_article.batch_update_status_completed',
        totalCount: params.articleIds.length,
        updatedCount: result.updatedCount,
        failedCount: result.failedIds.length,
      })

      return result
    },

    /**
    Function: batchSoftDelete

    Description: 批量软删除文章

    Parameters:
        params(object): 批量删除参数（articleIds）

    Returns:
        Promise<{ deletedCount: number, failedIds: string[] }>: 删除结果
    */
    async batchSoftDelete(params: {
      articleIds: string[]
    }): Promise<{ deletedCount: number; failedIds: string[] }> {
      logger.info({
        action: 'admin_blog_article.batch_soft_delete',
        count: params.articleIds.length,
      })

      const result = await deps.articles.batchSoftDelete(repoCtx, {
        articleIds: params.articleIds,
      })

      logger.info({
        action: 'admin_blog_article.batch_soft_delete_completed',
        totalCount: params.articleIds.length,
        deletedCount: result.deletedCount,
        failedCount: result.failedIds.length,
      })

      return result
    },

    /**
    Function: getStats

    Description: 获取文章统计数据

    Returns:
        Promise<{ totalArticles, publishedCount, draftCount, archivedCount, totalViews }>: 统计数据
    */
    async getStats(): Promise<{
      totalArticles: number
      publishedCount: number
      draftCount: number
      archivedCount: number
      totalViews: number
    }> {
      const stats = await deps.articles.getStats(repoCtx)

      logger.info({
        action: 'admin_blog_article.get_stats',
        stats,
      })

      return stats
    },
  }
}
