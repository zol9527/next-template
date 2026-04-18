import { prisma } from '@/lib/prisma'
import type { BlogArticleRepository } from '@/repositories/interfaces/content/blog-article.interface'
import type { AdminArticle } from '@/contracts/dtos/admin/blog/articles.dto'
import type { RepoContext } from '@/types/repo/repo-context'

// 文章关联字段的 include 配置，所有查询复用
const ARTICLE_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  author: { select: { id: true, nickname: true } },
  tags: { select: { tagId: true, tag: { select: { id: true, name: true, slug: true } } } },
} as const

function mapToAdminArticle(raw: {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  coverImage: string | null
  status: string
  authorId: string | null
  categoryId: string | null
  metaTitle: string | null
  metaDescription: string | null
  ogImage: string | null
  sourceType: string
  sourcePath: string | null
  viewCount: number
  likeCount: number
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  // 关联字段
  category?: { id: string; name: string; slug: string } | null
  author?: { id: string; nickname: string | null } | null
  tags?: { tagId: string; tag: { id: string; name: string; slug: string } }[]
}): AdminArticle {
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    excerpt: raw.excerpt,
    content: raw.content,
    coverImage: raw.coverImage,
    status: raw.status as AdminArticle['status'],
    categoryId: raw.categoryId,
    categoryName: raw.category?.name ?? null,
    categorySlug: raw.category?.slug ?? null,
    authorId: raw.authorId,
    authorName: raw.author?.nickname ?? null,
    metaTitle: raw.metaTitle,
    metaDescription: raw.metaDescription,
    ogImage: raw.ogImage,
    sourceType: raw.sourceType as AdminArticle['sourceType'],
    viewCount: raw.viewCount,
    likeCount: raw.likeCount,
    tagIds: raw.tags?.map((t) => t.tagId) ?? [],
    tagNames: raw.tags?.map((t) => t.tag.name) ?? [],
    publishedAt: raw.publishedAt?.toISOString() ?? null,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
    deletedAt: raw.deletedAt?.toISOString() ?? null,
  }
}

export function createPrismaBlogArticleRepository(): BlogArticleRepository {
  return {
    async create(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-article.create', title: params.title }, '创建博客文章')

      const article = await prisma.blogArticle.create({
        data: {
          title: params.title,
          slug: params.slug,
          excerpt: params.excerpt ?? null,
          content: params.content ?? null,
          coverImage: params.coverImage ?? null,
          status: (params.status ?? 'DRAFT') as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
          authorId: params.authorId ?? null,
          categoryId: params.categoryId ?? null,
          metaTitle: params.metaTitle ?? null,
          metaDescription: params.metaDescription ?? null,
          ogImage: params.ogImage ?? null,
          sourceType: (params.sourceType ?? 'EDITOR') as 'EDITOR' | 'MARKDOWN' | 'API',
          sourcePath: params.sourcePath ?? null,
        },
        include: ARTICLE_INCLUDE,
      })
      return mapToAdminArticle(article)
    },

    async findById(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-article.findById', articleId: params.articleId }, '根据 ID 查找博客文章')

      const article = await prisma.blogArticle.findUnique({
        where: { id: params.articleId, deletedAt: null },
        include: ARTICLE_INCLUDE,
      })
      if (!article) return null
      return mapToAdminArticle(article)
    },

    async findBySlug(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-article.findBySlug', slug: params.slug }, '根据 slug 查找博客文章')

      const article = await prisma.blogArticle.findUnique({
        where: { slug: params.slug, deletedAt: null },
        include: ARTICLE_INCLUDE,
      })
      if (!article) return null
      return mapToAdminArticle(article)
    },

    async update(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-article.update', articleId: params.articleId }, '更新博客文章')

      const updates: Record<string, unknown> = {}
      if (params.title !== undefined) updates.title = params.title
      if (params.slug !== undefined) updates.slug = params.slug
      if (params.excerpt !== undefined) updates.excerpt = params.excerpt
      if (params.content !== undefined) updates.content = params.content
      if (params.coverImage !== undefined) updates.coverImage = params.coverImage
      if (params.status !== undefined) updates.status = params.status
      if (params.categoryId !== undefined) updates.categoryId = params.categoryId
      if (params.metaTitle !== undefined) updates.metaTitle = params.metaTitle
      if (params.metaDescription !== undefined) updates.metaDescription = params.metaDescription
      if (params.ogImage !== undefined) updates.ogImage = params.ogImage
      if (params.sourceType !== undefined) updates.sourceType = params.sourceType
      if (params.sourcePath !== undefined) updates.sourcePath = params.sourcePath
      if (params.publishedAt !== undefined) updates.publishedAt = params.publishedAt

      try {
        const article = await prisma.blogArticle.update({
          where: { id: params.articleId, deletedAt: null },
          data: updates,
          include: ARTICLE_INCLUDE,
        })
        return mapToAdminArticle(article)
      } catch {
        return null
      }
    },

    async softDelete(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-article.softDelete', articleId: params.articleId }, '软删除博客文章')

      try {
        const article = await prisma.blogArticle.update({
          where: { id: params.articleId },
          data: { deletedAt: new Date() },
        })
        return mapToAdminArticle(article)
      } catch {
        return null
      }
    },

    async list(ctx, params) {
      const { logger } = ctx
      const safeLimit = Math.max(1, Math.min(params.limit, 50))
      logger.info({ action: 'blog-article.list', limit: safeLimit, keyword: params.keyword }, '获取博客文章列表')

      const where: Record<string, unknown> = {
        deletedAt: null,
      }

      if (params.keyword) {
        where.title = { contains: params.keyword }
      }
      if (params.status) {
        where.status = params.status
      }
      if (params.categoryId) {
        where.categoryId = params.categoryId
      }
      if (params.tagId) {
        where.tags = {
          some: {
            tagId: params.tagId,
          },
        }
      }

      const cursorWhere: Record<string, unknown> = { ...where }
      if (params.cursor) {
        cursorWhere.createdAt = { lt: new Date(params.cursor) }
      }

      const [articles, totalCount] = await Promise.all([
        prisma.blogArticle.findMany({
          where: cursorWhere,
          orderBy: { createdAt: 'desc' },
          take: safeLimit + 1,
          include: ARTICLE_INCLUDE,
        }),
        prisma.blogArticle.count({ where }),
      ])

      const hasMore = articles.length > safeLimit
      const items = hasMore ? articles.slice(0, safeLimit) : articles
      const nextCursor = hasMore && items.length > 0
        ? items[items.length - 1]?.createdAt.toISOString() ?? null
        : null

      return {
        items: items.map(mapToAdminArticle),
        nextCursor,
        totalCount,
      }
    },

    async slugExists(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-article.slugExists', slug: params.slug }, '检查 slug 是否已存在')

      const where: Record<string, unknown> = { slug: params.slug }
      if (params.excludeId) {
        where.NOT = { id: params.excludeId }
      }

      const count = await prisma.blogArticle.count({ where })
      return count > 0
    },

    async batchUpdateStatus(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-article.batchUpdateStatus', count: params.articleIds.length, status: params.status }, '批量更新文章状态')

      const result = await prisma.blogArticle.updateMany({
        where: {
          id: { in: params.articleIds },
          deletedAt: null,
        },
        data: { status: params.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' },
      })

      const failedIds = params.articleIds.length - result.count > 0
        ? params.articleIds.slice(result.count)
        : []

      return {
        updatedCount: result.count,
        failedIds,
      }
    },

    async batchSoftDelete(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-article.batchSoftDelete', count: params.articleIds.length }, '批量软删除文章')

      const result = await prisma.blogArticle.updateMany({
        where: {
          id: { in: params.articleIds },
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      })

      const failedIds = params.articleIds.length - result.count > 0
        ? params.articleIds.slice(result.count)
        : []

      return {
        deletedCount: result.count,
        failedIds,
      }
    },

    async incrementViewCount(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-article.incrementViewCount', articleId: params.articleId }, '递增文章浏览计数')

      await prisma.blogArticle.update({
        where: { id: params.articleId },
        data: { viewCount: { increment: 1 } },
      })
    },

    async getStats(ctx) {
      const { logger } = ctx
      logger.info({ action: 'blog-article.getStats' }, '获取文章统计')

      const [totalArticles, publishedCount, draftCount, archivedCount, totalViewsResult] = await Promise.all([
        prisma.blogArticle.count({ where: { deletedAt: null } }),
        prisma.blogArticle.count({ where: { deletedAt: null, status: 'PUBLISHED' } }),
        prisma.blogArticle.count({ where: { deletedAt: null, status: 'DRAFT' } }),
        prisma.blogArticle.count({ where: { deletedAt: null, status: 'ARCHIVED' } }),
        prisma.blogArticle.aggregate({
          where: { deletedAt: null },
          _sum: { viewCount: true },
        }),
      ])

      return {
        totalArticles,
        publishedCount,
        draftCount,
        archivedCount,
        totalViews: totalViewsResult._sum.viewCount ?? 0,
      }
    },
  }
}
