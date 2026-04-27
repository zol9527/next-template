/**
 * Optional Seed Module: 06-test-blog
 * 创建博客测试数据
 *
 * Function: seedTestBlog
 *
 * Description: 创建博客分类、标签和文章数据
 *
 * Parameters:
 *   db(Object): 数据库客户端对象
 *   logger(Object): 日志记录器
 *
 * Returns:
 *   result(Object): { categories, tags, articles }
 */

import { randomUUID } from 'node:crypto'

export const meta = { id: 'test-blog', name: '博客测试数据', description: '创建博客分类、标签和文章', type: 'optional', category: 'test-data', dependsOn: ['admin'], plugin: null }

// 管理员用户 ID（来自 02-admin.mjs）
const ADMIN_USER_ID = 'b5bd0ecf-69af-4c48-a89a-eb3d9bef0f91'

// 分类数据
const CATEGORIES = [
  { name: '技术分享', slug: 'tech-sharing', description: '技术相关文章', parentSlug: null },
  { name: '前端开发', slug: 'frontend-dev', description: '前端技术文章', parentSlug: 'tech-sharing' },
  { name: '后端架构', slug: 'backend-architecture', description: '后端架构文章', parentSlug: 'tech-sharing' },
  { name: '产品思考', slug: 'product-thinking', description: '产品设计相关文章', parentSlug: null },
  { name: '团队动态', slug: 'team-updates', description: '团队最新动态', parentSlug: null },
]

// 标签数据
const TAGS = [
  { name: 'React', slug: 'react' },
  { name: 'TypeScript', slug: 'typescript' },
  { name: 'Next.js', slug: 'nextjs' },
  { name: 'Node.js', slug: 'nodejs' },
  { name: '架构设计', slug: 'architecture-design' },
  { name: '性能优化', slug: 'performance-optimization' },
  { name: 'DevOps', slug: 'devops' },
  { name: '用户体验', slug: 'ux' },
]

// 文章数据
const ARTICLES = [
  // PUBLISHED articles
  {
    title: 'Next.js 15 App Router 完全指南',
    slug: 'nextjs-15-app-router-guide',
    excerpt: '深入解析 Next.js 15 App Router 的核心概念和使用技巧',
    content: '<h2>Next.js 15 App Router 简介</h2><p>Next.js 15 带来了全新的 App Router 架构...</p><p>本文将带你深入了解 RSC、Server Actions 等核心特性。</p>',
    status: 'PUBLISHED',
    categorySlug: 'frontend-dev',
    tagSlugs: ['nextjs', 'typescript', 'react'],
    publishedAt: new Date('2025-01-15'),
  },
  {
    title: 'TypeScript 5.0 新特性解析',
    slug: 'typescript-5-new-features',
    excerpt: 'TypeScript 5.0 带来了诸多新特性，本文详细介绍',
    content: '<h2>TypeScript 5.0</h2><p>const type parameters、Decorators 等新特性...</p>',
    status: 'PUBLISHED',
    categorySlug: 'frontend-dev',
    tagSlugs: ['typescript', 'react'],
    publishedAt: new Date('2025-02-20'),
  },
  {
    title: '微服务架构设计实践',
    slug: 'microservices-architecture-practice',
    excerpt: '从零开始设计高可用的微服务架构',
    content: '<h2>微服务架构</h2><p>服务拆分、API Gateway、服务发现...</p>',
    status: 'PUBLISHED',
    categorySlug: 'backend-architecture',
    tagSlugs: ['architecture-design', 'nodejs'],
    publishedAt: new Date('2025-03-10'),
  },
  // DRAFT articles
  {
    title: 'React Server Components 深入理解',
    slug: 'react-server-components-deep-dive',
    excerpt: 'RSC 如何改变 React 应用开发方式',
    content: '<h2>React Server Components</h2><p>服务端组件与客户端组件的区别...</p>',
    status: 'DRAFT',
    categorySlug: 'frontend-dev',
    tagSlugs: ['react', 'nextjs'],
  },
  {
    title: 'Node.js 性能优化指南',
    slug: 'nodejs-performance-optimization',
    excerpt: '提升 Node.js 应用性能的实用技巧',
    content: '<h2>性能优化</h2><p>内存管理、异步优化、集群模式...</p>',
    status: 'DRAFT',
    categorySlug: 'backend-architecture',
    tagSlugs: ['nodejs', 'performance-optimization'],
    publishedAt: null,
  },
  // ARCHIVED article
  {
    title: 'Docker 容器化部署实战',
    slug: 'docker-container-deployment',
    excerpt: '使用 Docker 和 Docker Compose 部署 Node.js 应用',
    content: '<h2>Docker 部署</h2><p>Dockerfile 编写、Docker Compose 编排...</p>',
    status: 'ARCHIVED',
    categorySlug: 'backend-architecture',
    tagSlugs: ['devops', 'nodejs'],
    publishedAt: new Date('2024-06-15'),
  },
]

export default async function seedTestBlog(db, logger, ctx) {
  logger.info('开始创建博客测试数据...')

  // 从上下文获取 admin 结果，回退到硬编码 ID（确保独立运行时也能工作）
  const adminResult = ctx.getResult('admin')
  const authorId = adminResult?.id || ADMIN_USER_ID

  // 1. 创建分类
  logger.info('创建博客分类...')
  const categoryIdMap = new Map()
  const categories = []

  for (const cat of CATEGORIES) {
    const existing = await db.blogCategory.findFirst({
      where: { slug: cat.slug }
    })

    if (existing) {
      const updated = await db.blogCategory.update({
        where: { id: existing.id },
        data: {
          name: cat.name,
          description: cat.description,
          status: 'ACTIVE',
        }
      })
      logger.info(`更新分类: ${cat.name}`)
      categoryIdMap.set(cat.slug, updated.id)
      categories.push(updated)
    } else {
      const created = await db.blogCategory.create({
        data: {
          id: randomUUID(),
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          status: 'ACTIVE',
        }
      })
      logger.success(`创建分类: ${cat.name}`)
      categoryIdMap.set(cat.slug, created.id)
      categories.push(created)
    }
  }

  // 2. 更新子分类的 parentId
  logger.info('设置分类层级关系...')
  for (const cat of CATEGORIES) {
    if (cat.parentSlug) {
      const parentId = categoryIdMap.get(cat.parentSlug)
      const childId = categoryIdMap.get(cat.slug)
      if (parentId && childId) {
        await db.blogCategory.update({
          where: { id: childId },
          data: { parentId }
        })
        logger.info(`设置 ${cat.name} 的父分类为 ${cat.parentSlug}`)
      }
    }
  }

  // 3. 创建标签
  logger.info('创建博客标签...')
  const tagIdMap = new Map()
  const tags = []

  for (const tag of TAGS) {
    const existing = await db.blogTag.findFirst({
      where: { slug: tag.slug }
    })

    if (existing) {
      logger.info(`标签已存在: ${tag.name}`)
      tagIdMap.set(tag.slug, existing.id)
      tags.push(existing)
    } else {
      const created = await db.blogTag.create({
        data: {
          id: randomUUID(),
          name: tag.name,
          slug: tag.slug,
        }
      })
      logger.success(`创建标签: ${tag.name}`)
      tagIdMap.set(tag.slug, created.id)
      tags.push(created)
    }
  }

  // 4. 创建文章
  logger.info('创建博客文章...')
  const articles = []
  let created = 0
  let updated = 0

  for (const article of ARTICLES) {
    const categoryId = categoryIdMap.get(article.categorySlug)

    const existing = await db.blogArticle.findFirst({
      where: { slug: article.slug }
    })

    if (existing) {
      // 更新文章
      const updatedArticle = await db.blogArticle.update({
        where: { id: existing.id },
        data: {
          title: article.title,
          excerpt: article.excerpt,
          content: article.content,
          status: article.status,
          categoryId,
          publishedAt: article.publishedAt,
        }
      })
      logger.info(`更新文章: ${article.title}`)
      articles.push(updatedArticle)
      updated++

      // 更新标签关联
      if (article.tagSlugs) {
        // 删除旧关联
        await db.blogArticleTag.deleteMany({
          where: { articleId: existing.id }
        })
        // 创建新关联
        for (const tagSlug of article.tagSlugs) {
          const tagId = tagIdMap.get(tagSlug)
          if (tagId) {
            await db.blogArticleTag.create({
              data: { articleId: existing.id, tagId }
            })
          }
        }
      }
    } else {
      // 创建文章
      const createdArticle = await db.blogArticle.create({
        data: {
          id: randomUUID(),
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          content: article.content,
          status: article.status,
          authorId: authorId,
          categoryId,
          sourceType: 'EDITOR',
          publishedAt: article.publishedAt,
        }
      })
      logger.success(`创建文章: ${article.title}`)
      articles.push(createdArticle)
      created++

      // 创建标签关联
      if (article.tagSlugs) {
        for (const tagSlug of article.tagSlugs) {
          const tagId = tagIdMap.get(tagSlug)
          if (tagId) {
            await db.blogArticleTag.create({
              data: { articleId: createdArticle.id, tagId }
            })
          }
        }
      }
    }
  }

  logger.success('博客测试数据创建完成', {
    categories: categories.length,
    tags: tags.length,
    articles: articles.length,
    created,
    updated
  })

  return { categories, tags, articles }
}
