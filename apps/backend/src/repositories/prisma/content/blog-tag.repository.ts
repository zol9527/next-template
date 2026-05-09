import { prisma } from '@/lib/prisma'
import type { BlogTagRepository } from '@/repositories/interfaces/content/blog-tag.interface'
import type { AdminBlogTag } from '@/contracts/dtos/admin/blog/tags.dto'
import type { RepoContext } from '@/types/repo/repo-context'

function mapToAdminBlogTag(raw: {
  id: string
  name: string
  slug: string
  createdAt: Date
  _count?: { articles: number }
}): AdminBlogTag {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    articleCount: raw._count?.articles ?? 0,
    createdAt: raw.createdAt.toISOString(),
  }
}

export function createPrismaBlogTagRepository(): BlogTagRepository {
  return {
    async list(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-tag.list', keyword: params?.keyword }, '获取博客标签列表')

      const where: Record<string, unknown> = {}
      if (params?.keyword) {
        where.name = { contains: params.keyword }
      }

      const tags = await prisma.blogTag.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { articles: { where: { article: { deletedAt: null, status: 'PUBLISHED' } } } },
          },
        },
      })
      return tags.map(mapToAdminBlogTag)
    },

    async findById(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-tag.findById', tagId: params.tagId }, '根据 ID 查找标签')

      const tag = await prisma.blogTag.findUnique({
        where: { id: params.tagId },
      })
      if (!tag) return null
      return mapToAdminBlogTag(tag)
    },

    async findBySlug(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-tag.findBySlug', slug: params.slug }, '根据 slug 查找标签')

      const tag = await prisma.blogTag.findUnique({
        where: { slug: params.slug },
      })
      if (!tag) return null
      return mapToAdminBlogTag(tag)
    },

    async findByName(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-tag.findByName', name: params.name }, '根据名称查找标签')

      const tag = await prisma.blogTag.findFirst({
        where: { name: params.name },
      })
      if (!tag) return null
      return mapToAdminBlogTag(tag)
    },

    async create(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-tag.create', name: params.name }, '创建博客标签')

      const tag = await prisma.blogTag.create({
        data: {
          name: params.name,
          slug: params.slug ?? '',
        },
      })
      return mapToAdminBlogTag(tag)
    },

    async update(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-tag.update', tagId: params.tagId }, '更新博客标签')

      const updates: Record<string, unknown> = {}
      if (params.name !== undefined) updates.name = params.name
      if (params.slug !== undefined) updates.slug = params.slug

      try {
        const tag = await prisma.blogTag.update({
          where: { id: params.tagId },
          data: updates,
        })
        return mapToAdminBlogTag(tag)
      } catch {
        return null
      }
    },

    async delete(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-tag.delete', tagId: params.tagId }, '删除博客标签')

      await prisma.blogTag.delete({
        where: { id: params.tagId },
      })
    },

    async batchFindOrCreate(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-tag.batchFindOrCreate', count: params.names.length }, '批量查找或创建标签')

      const results: AdminBlogTag[] = []

      for (const name of params.names) {
        const existing = await prisma.blogTag.findFirst({
          where: { name },
        })

        if (existing) {
          results.push(mapToAdminBlogTag(existing))
        } else {
          const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\u4e00-\u9fff-]/g, '')
          const created = await prisma.blogTag.create({
            data: { name, slug },
          })
          results.push(mapToAdminBlogTag(created))
        }
      }

      return results
    },

    async setArticleTags(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-tag.setArticleTags', articleId: params.articleId, count: params.tagIds.length }, '设置文章标签关联')

      await prisma.blogArticleTag.deleteMany({
        where: { articleId: params.articleId },
      })

      if (params.tagIds.length > 0) {
        await prisma.blogArticleTag.createMany({
          data: params.tagIds.map((tagId) => ({
            articleId: params.articleId,
            tagId,
          })),
        })
      }
    },

    async getArticleTagIds(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-tag.getArticleTagIds', articleId: params.articleId }, '获取文章关联标签 ID')

      const records = await prisma.blogArticleTag.findMany({
        where: { articleId: params.articleId },
        select: { tagId: true },
      })
      return records.map((r: { tagId: string }) => r.tagId)
    },
  }
}
