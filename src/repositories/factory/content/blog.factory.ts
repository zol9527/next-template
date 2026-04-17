/**
 * Blog Repositories
 *
 * @module repositories/factory/blog
 * @description 博客业务相关的 Repository 工厂函数
 *
 * 包含:
 * - BlogArticleRepository: 博客文章管理
 * - BlogCategoryRepository: 博客分类
 * - BlogTagRepository: 博客标签
 * - BlogArticleViewRepository: 文章浏览记录
 */

import type { BlogArticleRepository } from '@/repositories/interfaces/content/blog-article.interface'
import type { BlogCategoryRepository } from '@/repositories/interfaces/content/blog-category.interface'
import type { BlogTagRepository } from '@/repositories/interfaces/content/blog-tag.interface'
import type { BlogArticleViewRepository } from '@/repositories/interfaces/content/blog-article-view.interface'
import { createPrismaBlogArticleRepository } from '@/repositories/prisma/content/blog-article.repository'
import { createPrismaBlogCategoryRepository } from '@/repositories/prisma/content/blog-category.repository'
import { createPrismaBlogTagRepository } from '@/repositories/prisma/content/blog-tag.repository'
import { createPrismaBlogArticleViewRepository } from '@/repositories/prisma/content/blog-article-view.repository'
import { getProvider, PROVIDER_NAMES } from '../core/core.factory'

export async function createBlogArticleRepository(): Promise<BlogArticleRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaBlogArticleRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}

export async function createBlogCategoryRepository(): Promise<BlogCategoryRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaBlogCategoryRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}

export async function createBlogTagRepository(): Promise<BlogTagRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaBlogTagRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}

export async function createBlogArticleViewRepository(): Promise<BlogArticleViewRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaBlogArticleViewRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}
