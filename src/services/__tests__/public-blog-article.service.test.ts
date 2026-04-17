import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPublicBlogArticleService } from '@/services/content/public-blog-article.service'
import type { ServiceContext } from '@/types/service/service-context'
import type { BlogArticleRepository } from '@/repositories/interfaces/content/blog-article.interface'
import type { BlogCategoryRepository } from '@/repositories/interfaces/content/blog-category.interface'
import type { BlogTagRepository } from '@/repositories/interfaces/content/blog-tag.interface'
import type { BlogArticleViewRepository } from '@/repositories/interfaces/content/blog-article-view.interface'
import type { AdminArticle } from '@/contracts/dtos/admin/blog/articles.dto'

// ============================================================================
// Fixtures
// ============================================================================

function createMockArticle(overrides: Partial<AdminArticle> = {}): AdminArticle {
  return {
    id: 'article-001',
    title: '测试文章',
    slug: 'test-article',
    excerpt: '摘要',
    content: '<p>正文内容</p>',
    coverImage: null,
    status: 'PUBLISHED',
    categoryId: 'cat-001',
    categoryName: '技术',
    authorId: 'author-001',
    authorName: '张三',
    metaTitle: null,
    metaDescription: null,
    ogImage: null,
    sourceType: 'EDITOR',
    viewCount: 10,
    likeCount: 3,
    tagNames: ['TypeScript', 'Next.js'],
    tagIds: ['tag-001', 'tag-002'],
    publishedAt: '2025-01-01T00:00:00Z',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    deletedAt: null,
    ...overrides,
  }
}

function createMockLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  }
}

function createMockContext(): ServiceContext {
  return {
    traceId: 'trace-test-001',
    logger: createMockLogger() as unknown as ServiceContext['logger'],
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('createPublicBlogArticleService', () => {
  let ctx: ServiceContext
  let articles: {
    list: ReturnType<typeof vi.fn>
    findBySlug: ReturnType<typeof vi.fn>
    findById: ReturnType<typeof vi.fn>
    incrementViewCount: ReturnType<typeof vi.fn>
  }
  let categories: {
    list: ReturnType<typeof vi.fn>
    findBySlug: ReturnType<typeof vi.fn>
    countArticles: ReturnType<typeof vi.fn>
  }
  let tags: {
    list: ReturnType<typeof vi.fn>
  }
  let views: {
    create: ReturnType<typeof vi.fn>
    countByArticleId: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ctx = createMockContext()

    articles = {
      list: vi.fn(),
      findBySlug: vi.fn(),
      findById: vi.fn(),
      incrementViewCount: vi.fn(),
    }

    categories = {
      list: vi.fn(),
      findBySlug: vi.fn(),
      countArticles: vi.fn(),
    }

    tags = {
      list: vi.fn(),
    }

    views = {
      create: vi.fn(),
      countByArticleId: vi.fn(),
    }
  })

  function createService() {
    return createPublicBlogArticleService(
      {
        articles: articles as unknown as BlogArticleRepository,
        categories: categories as unknown as BlogCategoryRepository,
        tags: tags as unknown as BlogTagRepository,
        views: views as unknown as BlogArticleViewRepository,
      },
      ctx,
    )
  }

  // --------------------------------------------------------------------------
  // listPublishedArticles
  // --------------------------------------------------------------------------

  describe('listPublishedArticles', () => {
    it('returns published articles with default pagination', async () => {
      const mockArticle = createMockArticle()
      articles.list.mockResolvedValue({
        items: [mockArticle],
        nextCursor: 'cursor-2',
        totalCount: 1,
      })

      const service = createService()
      const result = await service.listPublishedArticles()

      expect(articles.list).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          limit: 20,
          status: 'PUBLISHED',
        }),
      )
      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe('article-001')
      expect(result.items[0].title).toBe('测试文章')
      expect(result.nextCursor).toBe('cursor-2')
      expect(result.total).toBe(1)
    })

    it('strips admin-only fields from articles', async () => {
      const mockArticle = createMockArticle()
      articles.list.mockResolvedValue({
        items: [mockArticle],
        nextCursor: null,
        totalCount: 1,
      })

      const service = createService()
      const result = await service.listPublishedArticles()

      const item = result.items[0]
      expect(item).not.toHaveProperty('status')
      expect(item).not.toHaveProperty('sourceType')
      expect(item).not.toHaveProperty('authorId')
      expect(item).not.toHaveProperty('deletedAt')
      expect(item).not.toHaveProperty('tagIds')
    })

    it('resolves categorySlug to categoryId', async () => {
      categories.findBySlug.mockResolvedValue({
        id: 'cat-tech',
        name: '技术',
        slug: 'tech',
        description: null,
        parentId: null,
        sortOrder: 0,
        status: 'ACTIVE',
      })
      articles.list.mockResolvedValue({
        items: [],
        nextCursor: null,
        totalCount: 0,
      })

      const service = createService()
      await service.listPublishedArticles({ categorySlug: 'tech' })

      expect(categories.findBySlug).toHaveBeenCalledWith(
        expect.any(Object),
        { slug: 'tech' },
      )
      expect(articles.list).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          categoryId: 'cat-tech',
          status: 'PUBLISHED',
        }),
      )
    })

    it('returns empty list when categorySlug not found', async () => {
      categories.findBySlug.mockResolvedValue(null)

      const service = createService()
      const result = await service.listPublishedArticles({ categorySlug: 'nonexistent' })

      expect(articles.list).not.toHaveBeenCalled()
      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
    })

    it('always passes status PUBLISHED to repo', async () => {
      articles.list.mockResolvedValue({
        items: [],
        nextCursor: null,
        totalCount: 0,
      })

      const service = createService()
      await service.listPublishedArticles({ limit: 10, keyword: 'test' })

      expect(articles.list).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ status: 'PUBLISHED' }),
      )
    })
  })

  // --------------------------------------------------------------------------
  // getArticleBySlug
  // --------------------------------------------------------------------------

  describe('getArticleBySlug', () => {
    it('returns mapped article for published article', async () => {
      articles.findBySlug.mockResolvedValue(createMockArticle())

      const service = createService()
      const result = await service.getArticleBySlug('test-article')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('article-001')
      expect(result!.slug).toBe('test-article')
    })

    it('returns null when article not found', async () => {
      articles.findBySlug.mockResolvedValue(null)

      const service = createService()
      const result = await service.getArticleBySlug('nonexistent')

      expect(result).toBeNull()
    })

    it('returns null for DRAFT article', async () => {
      articles.findBySlug.mockResolvedValue(
        createMockArticle({ status: 'DRAFT' }),
      )

      const service = createService()
      const result = await service.getArticleBySlug('draft-article')

      expect(result).toBeNull()
    })

    it('returns null for ARCHIVED article', async () => {
      articles.findBySlug.mockResolvedValue(
        createMockArticle({ status: 'ARCHIVED' }),
      )

      const service = createService()
      const result = await service.getArticleBySlug('archived-article')

      expect(result).toBeNull()
    })

    it('uses tagNames defaulting to empty array when undefined', async () => {
      articles.findBySlug.mockResolvedValue(
        createMockArticle({ tagNames: undefined }),
      )

      const service = createService()
      const result = await service.getArticleBySlug('no-tags')

      expect(result!.tagNames).toEqual([])
    })
  })

  // --------------------------------------------------------------------------
  // trackView
  // --------------------------------------------------------------------------

  describe('trackView', () => {
    it('creates view record and increments viewCount', async () => {
      const article = createMockArticle({ viewCount: 10 })
      const updatedArticle = createMockArticle({ viewCount: 11 })

      articles.findById
        .mockResolvedValueOnce(article)
        .mockResolvedValueOnce(updatedArticle)
      views.create.mockResolvedValue(undefined)
      articles.incrementViewCount.mockResolvedValue(undefined)

      const service = createService()
      const result = await service.trackView({
        articleId: 'article-001',
        viewerId: 'user-001',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        referer: 'https://example.com',
        readTime: 30,
      })

      expect(views.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          articleId: 'article-001',
          viewerId: 'user-001',
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          referer: 'https://example.com',
          readTime: 30,
        }),
      )
      expect(articles.incrementViewCount).toHaveBeenCalledWith(
        expect.any(Object),
        { articleId: 'article-001' },
      )
      expect(result).toEqual({ recorded: true, viewCount: 11 })
    })

    it('throws NOT_FOUND when article does not exist', async () => {
      articles.findById.mockResolvedValue(null)

      const service = createService()
      await expect(
        service.trackView({ articleId: 'nonexistent' }),
      ).rejects.toThrow('Article not found: nonexistent')

      await expect(
        service.trackView({ articleId: 'nonexistent' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    })

    it('handles null optional params with defaults', async () => {
      articles.findById
        .mockResolvedValueOnce(createMockArticle())
        .mockResolvedValueOnce(createMockArticle({ viewCount: 11 }))

      const service = createService()
      const result = await service.trackView({
        articleId: 'article-001',
      })

      expect(views.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          viewerId: null,
          ip: null,
          userAgent: null,
          referer: null,
        }),
      )
      expect(result.recorded).toBe(true)
    })

    it('falls back to incremented viewCount when updated article is null', async () => {
      const article = createMockArticle({ viewCount: 5 })
      articles.findById
        .mockResolvedValueOnce(article)
        .mockResolvedValueOnce(null)

      const service = createService()
      const result = await service.trackView({ articleId: 'article-001' })

      expect(result.viewCount).toBe(6)
    })
  })

  // --------------------------------------------------------------------------
  // listCategories
  // --------------------------------------------------------------------------

  describe('listCategories', () => {
    it('returns mapped categories', async () => {
      categories.list.mockResolvedValue([
        {
          id: 'cat-001',
          name: '技术',
          slug: 'tech',
          description: '技术文章',
          parentId: null,
          sortOrder: 0,
          status: 'ACTIVE',
          articleCount: 5,
        },
        {
          id: 'cat-002',
          name: '生活',
          slug: 'life',
          description: null,
          parentId: null,
          sortOrder: 1,
          status: 'ACTIVE',
          articleCount: 3,
        },
      ])

      const service = createService()
      const result = await service.listCategories()

      expect(result.items).toHaveLength(2)
      expect(result.items[0]).toEqual({
        id: 'cat-001',
        name: '技术',
        slug: 'tech',
        description: '技术文章',
        articleCount: 5,
      })
      expect(result.items[1]).toEqual({
        id: 'cat-002',
        name: '生活',
        slug: 'life',
        description: null,
        articleCount: 3,
      })
    })

    it('returns empty list when no categories', async () => {
      categories.list.mockResolvedValue([])

      const service = createService()
      const result = await service.listCategories()

      expect(result.items).toEqual([])
    })
  })

  // --------------------------------------------------------------------------
  // listTags
  // --------------------------------------------------------------------------

  describe('listTags', () => {
    it('returns mapped tags', async () => {
      tags.list.mockResolvedValue([
        { id: 'tag-001', name: 'TypeScript', slug: 'typescript', articleCount: 10 },
        { id: 'tag-002', name: 'Next.js', slug: 'nextjs', articleCount: 8 },
      ])

      const service = createService()
      const result = await service.listTags()

      expect(result.items).toHaveLength(2)
      expect(result.items[0]).toEqual({
        id: 'tag-001',
        name: 'TypeScript',
        slug: 'typescript',
        articleCount: 10,
      })
    })

    it('returns empty list when no tags', async () => {
      tags.list.mockResolvedValue([])

      const service = createService()
      const result = await service.listTags()

      expect(result.items).toEqual([])
    })
  })
})
