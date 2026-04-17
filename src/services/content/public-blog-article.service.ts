import type { BlogArticleRepository } from '@/repositories/interfaces/content/blog-article.interface'
import type { BlogCategoryRepository } from '@/repositories/interfaces/content/blog-category.interface'
import type { BlogTagRepository } from '@/repositories/interfaces/content/blog-tag.interface'
import type { BlogArticleViewRepository } from '@/repositories/interfaces/content/blog-article-view.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import type { AdminArticle } from '@/contracts/dtos/admin/blog/articles.dto'
import type { AdminBlogCategory } from '@/contracts/dtos/admin/blog/categories.dto'
import type { AdminBlogTag } from '@/contracts/dtos/admin/blog/tags.dto'
import type {
  PublicBlogArticle,
  PublicBlogArticleListResponse,
  PublicBlogCategory,
  PublicBlogCategoryListResponse,
  PublicBlogTag,
  PublicBlogTagListResponse,
} from '@/contracts/dtos/public/blog/articles.dto'
import type { TrackViewResponse } from '@/contracts/dtos/public/blog/analytics.dto'

/**
Function: makeNotFoundError

Description: 创建带有 NOT_FOUND 错误码的 Error 对象

Parameters:
    message(string): 错误描述信息

Returns:
    error(Error & { code: 'NOT_FOUND' }): 带有 code 属性的错误对象
*/
function makeNotFoundError(message: string): Error & { code: 'NOT_FOUND' } {
  const error = new Error(message) as Error & { code: 'NOT_FOUND' }
  error.code = 'NOT_FOUND'
  return error
}

/**
Function: mapToPublicArticle

Description: 将后台文章 DTO 映射为公开文章 DTO，剥离管理端专属字段

Parameters:
    article(AdminArticle): 后台文章数据

Returns:
    result(PublicBlogArticle): 公开文章数据
*/
function mapToPublicArticle(article: AdminArticle): PublicBlogArticle {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: article.content,
    coverImage: article.coverImage,
    categoryName: article.categoryName,
    categorySlug: article.categorySlug ?? null,
    authorName: article.authorName,
    metaTitle: article.metaTitle,
    metaDescription: article.metaDescription,
    ogImage: article.ogImage,
    viewCount: article.viewCount,
    likeCount: article.likeCount,
    tagNames: article.tagNames ?? [],
    publishedAt: article.publishedAt,
    createdAt: article.createdAt,
  }
}

/**
Function: mapToPublicCategory

Description: 将后台分类 DTO 映射为公开分类 DTO

Parameters:
    category(AdminBlogCategory): 后台分类数据

Returns:
    result(PublicBlogCategory): 公开分类数据
*/
function mapToPublicCategory(category: AdminBlogCategory): PublicBlogCategory {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    articleCount: category.articleCount,
  }
}

/**
Function: mapToPublicTag

Description: 将后台标签 DTO 映射为公开标签 DTO

Parameters:
    tag(AdminBlogTag): 后台标签数据

Returns:
    result(PublicBlogTag): 公开标签数据
*/
function mapToPublicTag(tag: AdminBlogTag): PublicBlogTag {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    articleCount: tag.articleCount,
  }
}

// Service Factory

/**
Function: createPublicBlogArticleService

Description: 创建公开博客文章服务，负责已发布文章的查询、浏览追踪、分类和标签列表；仅依赖仓储接口，不直接访问数据库

Parameters:
    deps(object): 依赖注入
      articles(BlogArticleRepository): 文章仓储
      categories(BlogCategoryRepository): 分类仓储
      tags(BlogTagRepository): 标签仓储
      views(BlogArticleViewRepository): 文章浏览记录仓储
    ctx(ServiceContext): Service 上下文

Returns:
    service(object): 提供 listPublishedArticles / getArticleBySlug / trackView / listCategories / listTags 的服务对象
*/
export function createPublicBlogArticleService(
  deps: {
    articles: BlogArticleRepository
    categories: BlogCategoryRepository
    tags: BlogTagRepository
    views: BlogArticleViewRepository
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
    Function: listPublishedArticles

    Description: 获取已发布文章列表，支持关键词搜索和分类/标签筛选

    Parameters:
        params(object, optional):
          limit(number, optional): 分页大小，默认 20
          cursor(string | null, optional): 分页游标
          keyword(string, optional): 搜索关键词
          categorySlug(string, optional): 分类 Slug 筛选
          tagSlug(string, optional): 标签 Slug 筛选（预留）

    Returns:
        result(PublicBlogArticleListResponse): 分页文章列表
    */
    async listPublishedArticles(params?: {
      limit?: number
      cursor?: string | null
      keyword?: string
      categorySlug?: string
      tagSlug?: string
    }): Promise<PublicBlogArticleListResponse> {
      const limit = params?.limit ?? 20
      const cursor = params?.cursor ?? null

      let categoryId: string | undefined
      if (params?.categorySlug) {
        const category = await deps.categories.findBySlug(repoCtx, { slug: params.categorySlug })
        if (!category) {
          return { items: [], nextCursor: null, total: 0 }
        }
        categoryId = category.id
      }

      let tagId: string | undefined
      if (params?.tagSlug) {
        const tag = await deps.tags.findBySlug(repoCtx, { slug: params.tagSlug })
        if (!tag) {
          return { items: [], nextCursor: null, total: 0 }
        }
        tagId = tag.id
      }

      // TODO: tagIds 过滤应在 repository 层实现以支持正确分页
      const expandedLimit = tagId ? Math.min(limit * 3, 50) : limit
      const page = await deps.articles.list(repoCtx, {
        limit: expandedLimit,
        cursor,
        keyword: params?.keyword,
        status: 'PUBLISHED',
        categoryId,
      })

      let filteredItems = page.items
      if (tagId) {
        filteredItems = page.items.filter(
          a => a.tagIds?.includes(tagId),
        )
      }
      const items = filteredItems.slice(0, limit).map(mapToPublicArticle)

      logger.info({
        action: 'public_blog_article.list_published',
        limit,
        keyword: params?.keyword,
        categorySlug: params?.categorySlug,
        tagSlug: params?.tagSlug,
        resultCount: items.length,
        total: page.totalCount,
      })

      return { items, nextCursor: page.nextCursor, total: page.totalCount }
    },

    /**
    Function: getArticleBySlug

    Description: 根据 Slug 获取已发布文章详情，非 PUBLISHED 状态返回 null

    Parameters:
        slug(string): 文章 URL 标识

    Returns:
        result(PublicBlogArticle | null): 文章详情，未找到或非已发布返回 null
    */
    async getArticleBySlug(slug: string): Promise<PublicBlogArticle | null> {
      const article = await deps.articles.findBySlug(repoCtx, { slug })
      if (!article || article.status !== 'PUBLISHED') {
        return null
      }

      logger.info({
        action: 'public_blog_article.get_by_slug',
        slug,
        articleId: article.id,
      })

      return mapToPublicArticle(article)
    },

    /**
    Function: trackView

    Description: 记录文章浏览并原子性递增 viewCount

    Parameters:
        params(object):
          articleId(string): 文章 ID
          viewerId(string | null, optional): 访客 ID
          ip(string | null, optional): 访客 IP
          userAgent(string | null, optional): 访客 User-Agent
          referer(string | null, optional): 来源页面
          readTime(number, optional): 阅读时长（秒）

    Returns:
        result(TrackViewResponse): { recorded, viewCount }

    Throws:
        NOT_FOUND: 文章不存在
    */
    async trackView(params: {
      articleId: string
      viewerId?: string | null
      ip?: string | null
      userAgent?: string | null
      referer?: string | null
      readTime?: number
    }): Promise<TrackViewResponse> {
      const { articleId, viewerId, ip, userAgent, referer, readTime } = params

      const article = await deps.articles.findById(repoCtx, { articleId })
      if (!article) {
        throw makeNotFoundError(`Article not found: ${articleId}`)
      }

      await deps.views.create(repoCtx, {
        articleId,
        viewerId: viewerId ?? null,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
        referer: referer ?? null,
        readTime,
      })

      // 原子递增 viewCount
      await deps.articles.incrementViewCount(repoCtx, { articleId })

      const updated = await deps.articles.findById(repoCtx, { articleId })

      logger.info({
        action: 'public_blog_article.track_view',
        articleId,
        viewerId,
        readTime,
        viewCount: updated?.viewCount,
      })

      return {
        recorded: true,
        viewCount: updated?.viewCount ?? article.viewCount + 1,
      }
    },

    /**
    Function: listCategories

    Description: 获取公开分类列表

    Returns:
        result(PublicBlogCategoryListResponse): 分类列表
    */
    async listCategories(): Promise<PublicBlogCategoryListResponse> {
      const categories = await deps.categories.list(repoCtx)
      // 只返回 ACTIVE 状态且有已发布文章的分类
      const items = categories
        .filter(c => c.status === 'ACTIVE' && (c.articleCount ?? 0) > 0)
        .map(mapToPublicCategory)

      logger.info({
        action: 'public_blog_article.list_categories',
        count: items.length,
      })

      return { items }
    },

    /**
    Function: listTags

    Description: 获取公开标签列表

    Returns:
        result(PublicBlogTagListResponse): 标签列表
    */
    async listTags(): Promise<PublicBlogTagListResponse> {
      const tags = await deps.tags.list(repoCtx)
      // 只返回有已发布文章的标签
      const items = tags
        .filter(t => (t.articleCount ?? 0) > 0)
        .map(mapToPublicTag)

      logger.info({
        action: 'public_blog_article.list_tags',
        count: items.length,
      })

      return { items }
    },
  }
}
