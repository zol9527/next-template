import { prisma } from '@/lib/prisma'
import type { BlogCategoryRepository } from '@/repositories/interfaces/content/blog-category.interface'
import type { AdminBlogCategory } from '@/contracts/dtos/admin/blog/categories.dto'
import type { RepoContext } from '@/types/repo/repo-context'

function mapToAdminBlogCategory(raw: {
  id: string
  name: string
  slug: string
  description: string | null
  parentId: string | null
  sortOrder: number
  status: string
  createdAt: Date
  updatedAt: Date
  _count?: { articles: number }
}): AdminBlogCategory {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    parentId: raw.parentId,
    sortOrder: raw.sortOrder,
    status: raw.status as AdminBlogCategory['status'],
    articleCount: raw._count?.articles ?? 0,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  }
}

export function createPrismaBlogCategoryRepository(): BlogCategoryRepository {
  return {
    async list(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-category.list', search: params?.search }, '获取博客分类列表')

      const where: Record<string, unknown> = {}
      if (params?.search) {
        where.name = { contains: params.search }
      }

      const categories = await prisma.blogCategory.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: {
          _count: {
            select: { articles: { where: { deletedAt: null, status: 'PUBLISHED' } } },
          },
        },
      })
      return categories.map(mapToAdminBlogCategory)
    },

    async findById(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-category.findById', categoryId: params.categoryId }, '根据 ID 查找博客分类')

      const category = await prisma.blogCategory.findUnique({
        where: { id: params.categoryId },
        include: {
          _count: {
            select: { articles: { where: { deletedAt: null, status: 'PUBLISHED' } } },
          },
        },
      })
      if (!category) return null
      return mapToAdminBlogCategory(category)
    },

    async findBySlug(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-category.findBySlug', slug: params.slug }, '根据 slug 查找博客分类')

      const category = await prisma.blogCategory.findUnique({
        where: { slug: params.slug },
        include: {
          _count: {
            select: { articles: { where: { deletedAt: null, status: 'PUBLISHED' } } },
          },
        },
      })
      if (!category) return null
      return mapToAdminBlogCategory(category)
    },

    async create(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-category.create', name: params.name }, '创建博客分类')

      const category = await prisma.blogCategory.create({
        data: {
          name: params.name,
          slug: params.slug ?? '',
          description: params.description ?? null,
          parentId: params.parentId ?? null,
          sortOrder: params.sortOrder ?? 0,
          status: (params.status ?? 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
        },
        include: {
          _count: {
            select: { articles: { where: { deletedAt: null, status: 'PUBLISHED' } } },
          },
        },
      })
      return mapToAdminBlogCategory(category)
    },

    async update(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-category.update', categoryId: params.categoryId }, '更新博客分类')

      const updates: Record<string, unknown> = {}
      if (params.name !== undefined) updates.name = params.name
      if (params.slug !== undefined) updates.slug = params.slug
      if (params.description !== undefined) updates.description = params.description
      if (params.parentId !== undefined) updates.parentId = params.parentId
      if (params.status !== undefined) updates.status = params.status
      if (params.sortOrder !== undefined) updates.sortOrder = params.sortOrder

      try {
        const category = await prisma.blogCategory.update({
          where: { id: params.categoryId },
          data: updates,
          include: {
            _count: {
              select: { articles: { where: { deletedAt: null, status: 'PUBLISHED' } } },
            },
          },
        })
        return mapToAdminBlogCategory(category)
      } catch {
        return null
      }
    },

    async delete(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-category.delete', categoryId: params.categoryId }, '删除博客分类')

      await prisma.blogCategory.delete({
        where: { id: params.categoryId },
      })
    },

    async countArticles(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-category.countArticles', categoryId: params.categoryId }, '统计分类下文章数量')

      return prisma.blogArticle.count({
        where: { categoryId: params.categoryId, deletedAt: null },
      })
    },

    async hasChildCategories(ctx, params) {
      const { logger } = ctx
      logger.info({ action: 'blog-category.hasChildCategories', categoryId: params.categoryId }, '检查是否有子分类')

      const count = await prisma.blogCategory.count({
        where: { parentId: params.categoryId },
      })
      return count > 0
    },
  }
}
