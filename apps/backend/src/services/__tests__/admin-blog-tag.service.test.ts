import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAdminBlogTagService } from '@/services/content/admin-blog-tag.service'
import type { ServiceContext } from '@/types/service/service-context'
import type { BlogTagRepository } from '@/repositories/interfaces/content/blog-tag.interface'
import type { AdminBlogTag } from '@/contracts/dtos/admin/blog/tags.dto'

vi.mock('@/lib/utils/slug.util', () => ({
  generateSlug: vi.fn((name: string) => `slug-${name}`),
  resolveSlugConflict: vi.fn(async (slug: string) => slug),
}))

type MockFn = ReturnType<typeof vi.fn>

const mockTag = (overrides: Partial<AdminBlogTag> = {}): AdminBlogTag => ({
  id: 'tag-1',
  name: '测试标签',
  slug: 'test-tag',
  articleCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

function createMockRepo() {
  return {
    list: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    findBySlug: vi.fn().mockResolvedValue(null),
    findByName: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(mockTag()),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
    batchFindOrCreate: vi.fn().mockResolvedValue([]),
    setArticleTags: vi.fn().mockResolvedValue(undefined),
    getArticleTagIds: vi.fn().mockResolvedValue([]),
  }
}

function createMockCtx(): ServiceContext {
  const childLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  }

  return {
    traceId: 'test-trace-id',
    logger: childLogger,
  } as unknown as ServiceContext
}

describe('AdminBlogTagService', () => {
  let repo: ReturnType<typeof createMockRepo>
  let ctx: ServiceContext

  beforeEach(() => {
    vi.clearAllMocks()
    repo = createMockRepo()
    ctx = createMockCtx()
  })

  describe('listTags', () => {
    it('should return items wrapped in response', async () => {
      const tags = [mockTag(), mockTag({ id: 'tag-2' })]
      ;(repo.list as MockFn).mockResolvedValue(tags)

      const service = createAdminBlogTagService({ tags: repo as unknown as BlogTagRepository }, ctx)
      const result = await service.listTags()

      expect(result).toEqual({ items: tags })
      expect(repo.list).toHaveBeenCalledWith(expect.anything(), undefined)
    })

    it('should pass keyword params to repo', async () => {
      const service = createAdminBlogTagService({ tags: repo as unknown as BlogTagRepository }, ctx)
      await service.listTags({ keyword: '测试' })

      expect(repo.list).toHaveBeenCalledWith(expect.anything(), { keyword: '测试' })
    })
  })

  describe('createTag', () => {
    it('should normalize name to lowercase and trim', async () => {
      const created = mockTag({ name: 'react' })
      ;(repo.create as MockFn).mockResolvedValue(created)

      const service = createAdminBlogTagService({ tags: repo as unknown as BlogTagRepository }, ctx)
      const result = await service.createTag({ name: '  React  ' })

      expect(repo.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ name: 'react' }),
      )
      expect(result).toEqual(created)
    })

    it('should throw CONFLICT when tag name already exists', async () => {
      ;(repo.findByName as MockFn).mockResolvedValue(mockTag({ name: 'react' }))

      const service = createAdminBlogTagService({ tags: repo as unknown as BlogTagRepository }, ctx)

      await expect(
        service.createTag({ name: 'React' }),
      ).rejects.toMatchObject({ code: 'CONFLICT', message: '标签名称已存在' })
    })

    it('should auto-generate slug when not provided', async () => {
      ;(repo.create as MockFn).mockResolvedValue(mockTag())

      const service = createAdminBlogTagService({ tags: repo as unknown as BlogTagRepository }, ctx)
      await service.createTag({ name: 'TypeScript' })

      expect(repo.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ slug: expect.any(String) }),
      )
    })
  })

  describe('updateTag', () => {
    it('should normalize name and check for duplicates excluding self', async () => {
      const updated = mockTag({ name: 'vue' })
      ;(repo.findByName as MockFn).mockResolvedValue(null)
      ;(repo.update as MockFn).mockResolvedValue(updated)

      const service = createAdminBlogTagService({ tags: repo as unknown as BlogTagRepository }, ctx)
      const result = await service.updateTag({ tagId: 'tag-1', name: 'Vue' })

      expect(repo.findByName).toHaveBeenCalledWith(
        expect.anything(),
        { name: 'vue' },
      )
      expect(result).toEqual(updated)
    })

    it('should throw CONFLICT when updated name collides with another tag', async () => {
      ;(repo.findByName as MockFn).mockResolvedValue(mockTag({ id: 'tag-2', name: 'react' }))

      const service = createAdminBlogTagService({ tags: repo as unknown as BlogTagRepository }, ctx)

      await expect(
        service.updateTag({ tagId: 'tag-1', name: 'React' }),
      ).rejects.toMatchObject({ code: 'CONFLICT', message: '标签名称已存在' })
    })

    it('should allow updating slug without name', async () => {
      const updated = mockTag({ slug: 'new-slug' })
      ;(repo.update as MockFn).mockResolvedValue(updated)

      const service = createAdminBlogTagService({ tags: repo as unknown as BlogTagRepository }, ctx)
      const result = await service.updateTag({ tagId: 'tag-1', slug: 'new-slug' })

      expect(result).toEqual(updated)
    })

    it('should return null when neither name nor slug is provided', async () => {
      const service = createAdminBlogTagService({ tags: repo as unknown as BlogTagRepository }, ctx)
      const result = await service.updateTag({ tagId: 'tag-1' })

      expect(result).toBeNull()
    })
  })

  describe('deleteTag', () => {
    it('should throw NOT_FOUND when tag does not exist', async () => {
      ;(repo.findById as MockFn).mockResolvedValue(null)

      const service = createAdminBlogTagService({ tags: repo as unknown as BlogTagRepository }, ctx)

      await expect(service.deleteTag('nonexistent')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: '标签不存在',
      })
    })

    it('should delete tag and return id', async () => {
      ;(repo.findById as MockFn).mockResolvedValue(mockTag())

      const service = createAdminBlogTagService({ tags: repo as unknown as BlogTagRepository }, ctx)
      const result = await service.deleteTag('tag-1')

      expect(result).toEqual({ id: 'tag-1' })
      expect(repo.delete).toHaveBeenCalledWith(expect.anything(), { tagId: 'tag-1' })
    })
  })

  describe('batchFindOrCreateTags', () => {
    it('should normalize all names and delegate to repo', async () => {
      const tags = [mockTag({ name: 'react' }), mockTag({ name: 'vue' })]
      ;(repo.batchFindOrCreate as MockFn).mockResolvedValue(tags)

      const service = createAdminBlogTagService({ tags: repo as unknown as BlogTagRepository }, ctx)
      const result = await service.batchFindOrCreateTags({
        names: ['  React  ', 'VUE', '  TypeScript  '],
      })

      expect(repo.batchFindOrCreate).toHaveBeenCalledWith(
        expect.anything(),
        { names: ['react', 'vue', 'typescript'] },
      )
      expect(result).toEqual({ tags })
    })

    it('should log count of processed tags', async () => {
      ;(repo.batchFindOrCreate as MockFn).mockResolvedValue([mockTag(), mockTag()])

      const service = createAdminBlogTagService({ tags: repo as unknown as BlogTagRepository }, ctx)
      await service.batchFindOrCreateTags({ names: ['a', 'b'] })

      expect(ctx.logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin_blog_tag.batch_find_or_create',
          count: 2,
        }),
      )
    })
  })
})
