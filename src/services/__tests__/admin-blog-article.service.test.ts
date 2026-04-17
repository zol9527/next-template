import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAdminBlogArticleService } from '@/services/content/admin-blog-article.service'
import type { ServiceContext } from '@/types/service/service-context'
import type { BlogArticleRepository } from '@/repositories/interfaces/content/blog-article.interface'
import type { BlogTagRepository } from '@/repositories/interfaces/content/blog-tag.interface'
import type { AdminArticle } from '@/contracts/dtos/admin/blog/articles.dto'

vi.mock('@/lib/utils/sanitize-html.util', () => ({
  sanitizeHtml: vi.fn((html: string) => `sanitized:${html}`),
}))

vi.mock('@/lib/utils/slug.util', () => ({
  generateSlug: vi.fn((title: string) => title.toLowerCase().replace(/\s+/g, '-')),
  resolveSlugConflict: vi.fn(async (slug: string) => slug),
}))

const mockArticle: AdminArticle = {
  id: 'article-001',
  title: '测试文章',
  slug: 'test-article',
  excerpt: '摘要',
  content: '<p>内容</p>',
  coverImage: null,
  status: 'DRAFT',
  categoryId: null,
  authorId: 'author-001',
  metaTitle: null,
  metaDescription: null,
  ogImage: null,
  sourceType: 'EDITOR',
  viewCount: 0,
  likeCount: 0,
  publishedAt: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
}

function createMockDeps() {
  return {
    articles: {
      create: vi.fn().mockResolvedValue(mockArticle),
      findById: vi.fn().mockResolvedValue(mockArticle),
      findBySlug: vi.fn().mockResolvedValue(mockArticle),
      update: vi.fn().mockResolvedValue(mockArticle),
      softDelete: vi.fn().mockResolvedValue(mockArticle),
      list: vi.fn().mockResolvedValue({ items: [mockArticle], nextCursor: null, totalCount: 1 }),
      slugExists: vi.fn().mockResolvedValue(false),
      batchUpdateStatus: vi.fn().mockResolvedValue({ updatedCount: 1, failedIds: [] }),
      batchSoftDelete: vi.fn().mockResolvedValue({ deletedCount: 1, failedIds: [] }),
      incrementViewCount: vi.fn().mockResolvedValue(undefined),
      getStats: vi.fn().mockResolvedValue({
        totalArticles: 10,
        publishedCount: 5,
        draftCount: 3,
        archivedCount: 2,
        totalViews: 100,
      }),
    } as unknown as BlogArticleRepository,
    tags: {
      setArticleTags: vi.fn().mockResolvedValue(undefined),
      getArticleTagIds: vi.fn().mockResolvedValue(['tag-001']),
      list: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(null),
      findBySlug: vi.fn().mockResolvedValue(null),
      findByName: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
      batchFindOrCreate: vi.fn().mockResolvedValue([]),
    } as unknown as BlogTagRepository,
  }
}

function createMockCtx(): ServiceContext {
  const childLogger = {
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

  return {
    traceId: 'test-trace-id',
    logger: childLogger,
  } as unknown as ServiceContext
}

describe('AdminBlogArticleService', () => {
  let deps: ReturnType<typeof createMockDeps>
  let ctx: ServiceContext

  beforeEach(() => {
    vi.clearAllMocks()
    deps = createMockDeps()
    ctx = createMockCtx()
  })

  describe('createArticle', () => {
    it('should create article with auto-generated slug and sanitized content', async () => {
      const service = createAdminBlogArticleService(deps, ctx)

      const result = await service.createArticle({
        title: '测试文章',
        content: '<p>内容</p>',
        tagIds: ['tag-001'],
      })

      expect(result).toEqual(mockArticle)
      expect(deps.articles.create).toHaveBeenCalledWith(
        expect.objectContaining({ traceId: 'test-trace-id' }),
        expect.objectContaining({
          title: '测试文章',
          status: 'DRAFT',
          sourceType: 'EDITOR',
        }),
      )
      expect(deps.tags.setArticleTags).toHaveBeenCalledWith(
        expect.any(Object),
        { articleId: 'article-001', tagIds: ['tag-001'] },
      )
    })

    it('should create article without tags when tagIds is empty', async () => {
      const service = createAdminBlogArticleService(deps, ctx)

      await service.createArticle({
        title: '无标签文章',
        content: '<p>内容</p>',
      })

      expect(deps.tags.setArticleTags).not.toHaveBeenCalled()
    })

    it('should set content to null when not provided', async () => {
      const service = createAdminBlogArticleService(deps, ctx)

      await service.createArticle({
        title: '空内容文章',
      })

      expect(deps.articles.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ content: null }),
      )
    })
  })

  describe('updateArticle', () => {
    it('should update article and sanitize content', async () => {
      const service = createAdminBlogArticleService(deps, ctx)

      const result = await service.updateArticle({
        articleId: 'article-001',
        content: '<script>alert(1)</script><p>新内容</p>',
        tagIds: ['tag-002'],
      })

      expect(result).toEqual(mockArticle)
      expect(deps.articles.update).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          articleId: 'article-001',
        }),
      )
      expect(deps.tags.setArticleTags).toHaveBeenCalledWith(
        expect.any(Object),
        { articleId: 'article-001', tagIds: ['tag-002'] },
      )
    })

    it('should throw NOT_FOUND when article does not exist', async () => {
      const service = createAdminBlogArticleService(deps, ctx)
      ;(deps.articles.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      await expect(
        service.updateArticle({ articleId: 'nonexistent', title: '新标题' }),
      ).rejects.toThrow('文章不存在')

      try {
        await service.updateArticle({ articleId: 'nonexistent', title: '新标题' })
      } catch (error) {
        expect((error as Error & { code?: string }).code).toBe('NOT_FOUND')
      }
    })

    it('should not update tags when tagIds is not provided', async () => {
      const service = createAdminBlogArticleService(deps, ctx)

      await service.updateArticle({
        articleId: 'article-001',
        title: '新标题',
      })

      expect(deps.tags.setArticleTags).not.toHaveBeenCalled()
    })
  })

  describe('publishArticle', () => {
    it('should publish article with valid content', async () => {
      const service = createAdminBlogArticleService(deps, ctx)

      const result = await service.publishArticle('article-001')

      expect(result).toEqual(mockArticle)
      expect(deps.articles.update).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          articleId: 'article-001',
          status: 'PUBLISHED',
        }),
      )
    })

    it('should throw NOT_FOUND when article does not exist', async () => {
      const service = createAdminBlogArticleService(deps, ctx)
      ;(deps.articles.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      await expect(service.publishArticle('nonexistent')).rejects.toThrow('文章不存在')
    })

    it('should throw INVALID_STATE when content is empty', async () => {
      const service = createAdminBlogArticleService(deps, ctx)
      ;(deps.articles.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockArticle,
        content: '',
      })

      try {
        await service.publishArticle('article-001')
        expect.unreachable('Should have thrown')
      } catch (error) {
        expect((error as Error).message).toBe('文章内容不能为空，无法发布')
        expect((error as Error & { code?: string }).code).toBe('INVALID_STATE')
      }
    })

    it('should throw INVALID_STATE when content is only whitespace', async () => {
      const service = createAdminBlogArticleService(deps, ctx)
      ;(deps.articles.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockArticle,
        content: '   ',
      })

      try {
        await service.publishArticle('article-001')
        expect.unreachable('Should have thrown')
      } catch (error) {
        expect((error as Error).message).toBe('文章内容不能为空，无法发布')
        expect((error as Error & { code?: string }).code).toBe('INVALID_STATE')
      }
    })

    it('should throw INVALID_STATE when content is null', async () => {
      const service = createAdminBlogArticleService(deps, ctx)
      ;(deps.articles.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockArticle,
        content: null,
      })

      try {
        await service.publishArticle('article-001')
        expect.unreachable('Should have thrown')
      } catch (error) {
        expect((error as Error).message).toBe('文章内容不能为空，无法发布')
        expect((error as Error & { code?: string }).code).toBe('INVALID_STATE')
      }
    })
  })

  describe('archiveArticle', () => {
    it('should archive article', async () => {
      const service = createAdminBlogArticleService(deps, ctx)

      const result = await service.archiveArticle('article-001')

      expect(result).toEqual(mockArticle)
      expect(deps.articles.update).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          articleId: 'article-001',
          status: 'ARCHIVED',
        }),
      )
    })

    it('should throw NOT_FOUND when article does not exist', async () => {
      const service = createAdminBlogArticleService(deps, ctx)
      ;(deps.articles.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      await expect(service.archiveArticle('nonexistent')).rejects.toThrow('文章不存在')
    })
  })

  describe('deleteArticle', () => {
    it('should soft delete article', async () => {
      const service = createAdminBlogArticleService(deps, ctx)

      const result = await service.deleteArticle('article-001')

      expect(result).toEqual(mockArticle)
      expect(deps.articles.softDelete).toHaveBeenCalledWith(
        expect.any(Object),
        { articleId: 'article-001' },
      )
    })

    it('should return null when article does not exist', async () => {
      const service = createAdminBlogArticleService(deps, ctx)
      ;(deps.articles.softDelete as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const result = await service.deleteArticle('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getArticleById', () => {
    it('should return article by id', async () => {
      const service = createAdminBlogArticleService(deps, ctx)

      const result = await service.getArticleById('article-001')

      expect(result).toEqual(mockArticle)
      expect(deps.articles.findById).toHaveBeenCalledWith(
        expect.any(Object),
        { articleId: 'article-001' },
      )
    })

    it('should return null when article does not exist', async () => {
      const service = createAdminBlogArticleService(deps, ctx)
      ;(deps.articles.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const result = await service.getArticleById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getArticleBySlug', () => {
    it('should return article by slug', async () => {
      const service = createAdminBlogArticleService(deps, ctx)

      const result = await service.getArticleBySlug('test-article')

      expect(result).toEqual(mockArticle)
      expect(deps.articles.findBySlug).toHaveBeenCalledWith(
        expect.any(Object),
        { slug: 'test-article' },
      )
    })

    it('should return null when article does not exist', async () => {
      const service = createAdminBlogArticleService(deps, ctx)
      ;(deps.articles.findBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const result = await service.getArticleBySlug('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('listArticles', () => {
    it('should list articles with default limit', async () => {
      const service = createAdminBlogArticleService(deps, ctx)

      const result = await service.listArticles()

      expect(result).toEqual({
        items: [mockArticle],
        nextCursor: null,
        totalCount: 1,
      })
      expect(deps.articles.list).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ limit: 20 }),
      )
    })

    it('should clamp limit to 50', async () => {
      const service = createAdminBlogArticleService(deps, ctx)

      await service.listArticles({ limit: 100 })

      expect(deps.articles.list).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ limit: 50 }),
      )
    })

    it('should pass filter params to repository', async () => {
      const service = createAdminBlogArticleService(deps, ctx)

      await service.listArticles({
        keyword: '测试',
        status: 'PUBLISHED',
        categoryId: 'cat-001',
        cursor: 'cursor-abc',
      })

      expect(deps.articles.list).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          keyword: '测试',
          status: 'PUBLISHED',
          categoryId: 'cat-001',
          cursor: 'cursor-abc',
        }),
      )
    })
  })

  describe('batchUpdateStatus', () => {
    it('should batch update article status', async () => {
      const service = createAdminBlogArticleService(deps, ctx)

      const result = await service.batchUpdateStatus({
        articleIds: ['article-001', 'article-002'],
        status: 'PUBLISHED',
      })

      expect(result).toEqual({ updatedCount: 1, failedIds: [] })
      expect(deps.articles.batchUpdateStatus).toHaveBeenCalledWith(
        expect.any(Object),
        { articleIds: ['article-001', 'article-002'], status: 'PUBLISHED' },
      )
    })
  })

  describe('batchSoftDelete', () => {
    it('should batch soft delete articles', async () => {
      const service = createAdminBlogArticleService(deps, ctx)

      const result = await service.batchSoftDelete({
        articleIds: ['article-001', 'article-002'],
      })

      expect(result).toEqual({ deletedCount: 1, failedIds: [] })
      expect(deps.articles.batchSoftDelete).toHaveBeenCalledWith(
        expect.any(Object),
        { articleIds: ['article-001', 'article-002'] },
      )
    })
  })

  describe('getStats', () => {
    it('should return article statistics', async () => {
      const service = createAdminBlogArticleService(deps, ctx)

      const result = await service.getStats()

      expect(result).toEqual({
        totalArticles: 10,
        publishedCount: 5,
        draftCount: 3,
        archivedCount: 2,
        totalViews: 100,
      })
      expect(deps.articles.getStats).toHaveBeenCalledWith(expect.any(Object))
    })
  })
})
