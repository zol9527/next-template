import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAdminBlogCategoryService } from '@/services/content/admin-blog-category.service'
import type { ServiceContext } from '@/types/service/service-context'
import type { BlogCategoryRepository } from '@/repositories/interfaces/content/blog-category.interface'
import type { AdminBlogCategory } from '@/contracts/dtos/admin/blog/categories.dto'

vi.mock('@/lib/utils/slug.util', () => ({
  generateSlug: vi.fn((name: string) => `slug-${name}`),
  resolveSlugConflict: vi.fn(async (slug: string) => slug),
}))

type MockFn = ReturnType<typeof vi.fn>

const mockCategory = (overrides: Partial<AdminBlogCategory> = {}): AdminBlogCategory => ({
  id: 'cat-1',
  name: '测试分类',
  slug: 'test-category',
  description: null,
  parentId: null,
  sortOrder: 0,
  status: 'ACTIVE',
  articleCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

function createMockRepo() {
  return {
    list: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    findBySlug: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(mockCategory()),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
    countArticles: vi.fn().mockResolvedValue(0),
    hasChildCategories: vi.fn().mockResolvedValue(false),
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

describe('AdminBlogCategoryService', () => {
  let repo: ReturnType<typeof createMockRepo>
  let ctx: ServiceContext

  beforeEach(() => {
    vi.clearAllMocks()
    repo = createMockRepo()
    ctx = createMockCtx()
  })

  describe('listCategories', () => {
    it('should return items wrapped in response', async () => {
      const categories = [mockCategory(), mockCategory({ id: 'cat-2' })]
      ;(repo.list as MockFn).mockResolvedValue(categories)

      const service = createAdminBlogCategoryService({ categories: repo as unknown as BlogCategoryRepository }, ctx)
      const result = await service.listCategories()

      expect(result).toEqual({ items: categories })
      expect(repo.list).toHaveBeenCalledWith(expect.anything(), undefined)
    })

    it('should pass search params to repo', async () => {
      const service = createAdminBlogCategoryService({ categories: repo as unknown as BlogCategoryRepository }, ctx)
      await service.listCategories({ search: '测试' })

      expect(repo.list).toHaveBeenCalledWith(expect.anything(), { search: '测试' })
    })
  })

  describe('createCategory', () => {
    it('should create category with auto-generated slug', async () => {
      const created = mockCategory()
      ;(repo.create as MockFn).mockResolvedValue(created)

      const service = createAdminBlogCategoryService({ categories: repo as unknown as BlogCategoryRepository }, ctx)
      const result = await service.createCategory({ name: '新分类' })

      expect(result).toEqual(created)
      expect(repo.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ name: '新分类' }),
      )
    })

    it('should throw NOT_FOUND when parent does not exist', async () => {
      ;(repo.findById as MockFn).mockResolvedValue(null)

      const service = createAdminBlogCategoryService({ categories: repo as unknown as BlogCategoryRepository }, ctx)

      await expect(
        service.createCategory({ name: '子分类', parentId: 'nonexistent' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND', message: '父分类不存在' })
    })

    it('should throw CONFLICT when depth exceeds max (5 levels)', async () => {
      const grandparent = mockCategory({ id: 'gp-1', parentId: null })
      const parent1 = mockCategory({ id: 'p-1', parentId: 'gp-1' })
      const parent2 = mockCategory({ id: 'p-2', parentId: 'p-1' })
      const parent3 = mockCategory({ id: 'p-3', parentId: 'p-2' })
      const parent4 = mockCategory({ id: 'p-4', parentId: 'p-3' })

      ;(repo.findById as MockFn)
        .mockResolvedValueOnce(parent4)  // createCategory: parent 检查
        .mockResolvedValueOnce(parent4)  // calculateBlogCategoryDepth: p-4
        .mockResolvedValueOnce(parent3)  // calculateBlogCategoryDepth: p-3
        .mockResolvedValueOnce(parent2)  // calculateBlogCategoryDepth: p-2
        .mockResolvedValueOnce(parent1)  // calculateBlogCategoryDepth: p-1
        .mockResolvedValueOnce(grandparent) // calculateBlogCategoryDepth: gp-1

      const service = createAdminBlogCategoryService({ categories: repo as unknown as BlogCategoryRepository }, ctx)

      await expect(
        service.createCategory({ name: '深层分类', parentId: 'p-4' }),
      ).rejects.toMatchObject({
        code: 'CONFLICT',
        message: '分类层级不能超过 5 层',
      })
    })

    it('should allow creating at depth 4 (within limit)', async () => {
      const p1 = mockCategory({ id: 'p-1', parentId: null })
      const p2 = mockCategory({ id: 'p-2', parentId: 'p-1' })
      const p3 = mockCategory({ id: 'p-3', parentId: 'p-2' })

      ;(repo.findById as MockFn)
        .mockResolvedValueOnce(p3)
        .mockResolvedValueOnce(p2)
        .mockResolvedValueOnce(p1)

      ;(repo.create as MockFn).mockResolvedValue(mockCategory({ parentId: 'p-3' }))

      const service = createAdminBlogCategoryService({ categories: repo as unknown as BlogCategoryRepository }, ctx)
      const result = await service.createCategory({ name: '子分类', parentId: 'p-3' })

      expect(result.parentId).toBe('p-3')
    })
  })

  describe('updateCategory', () => {
    it('should throw CONFLICT when setting parent to self', async () => {
      const service = createAdminBlogCategoryService({ categories: repo as unknown as BlogCategoryRepository }, ctx)

      await expect(
        service.updateCategory({ categoryId: 'cat-1', parentId: 'cat-1' }),
      ).rejects.toMatchObject({ code: 'CONFLICT', message: '父分类不能是自身' })
    })

    it('should throw CONFLICT on circular reference', async () => {
      const child = mockCategory({ id: 'child-1', parentId: 'cat-1' })
      ;(repo.findById as MockFn).mockResolvedValue(child)
      ;(repo.list as MockFn).mockResolvedValue([child, mockCategory()])

      const service = createAdminBlogCategoryService({ categories: repo as unknown as BlogCategoryRepository }, ctx)

      await expect(
        service.updateCategory({ categoryId: 'cat-1', parentId: 'child-1' }),
      ).rejects.toMatchObject({
        code: 'CONFLICT',
        message: '不允许将分类移动到其子分类下（会形成循环）',
      })
    })

    it('should update category successfully', async () => {
      const updated = mockCategory({ name: '新名称' })
      ;(repo.update as MockFn).mockResolvedValue(updated)

      const service = createAdminBlogCategoryService({ categories: repo as unknown as BlogCategoryRepository }, ctx)
      const result = await service.updateCategory({ categoryId: 'cat-1', name: '新名称' })

      expect(result).toEqual(updated)
    })
  })

  describe('deleteCategory', () => {
    it('should throw NOT_FOUND when category does not exist', async () => {
      ;(repo.findById as MockFn).mockResolvedValue(null)

      const service = createAdminBlogCategoryService({ categories: repo as unknown as BlogCategoryRepository }, ctx)

      await expect(service.deleteCategory('nonexistent')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: '分类不存在',
      })
    })

    it('should throw CONFLICT when category has child categories', async () => {
      ;(repo.findById as MockFn).mockResolvedValue(mockCategory())
      ;(repo.hasChildCategories as MockFn).mockResolvedValue(true)

      const service = createAdminBlogCategoryService({ categories: repo as unknown as BlogCategoryRepository }, ctx)

      await expect(service.deleteCategory('cat-1')).rejects.toMatchObject({
        code: 'CONFLICT',
        message: '分类存在子分类，请先迁移或删除子分类',
      })
    })

    it('should throw CONFLICT when category has articles', async () => {
      ;(repo.findById as MockFn).mockResolvedValue(mockCategory())
      ;(repo.hasChildCategories as MockFn).mockResolvedValue(false)
      ;(repo.countArticles as MockFn).mockResolvedValue(5)

      const service = createAdminBlogCategoryService({ categories: repo as unknown as BlogCategoryRepository }, ctx)

      await expect(service.deleteCategory('cat-1')).rejects.toMatchObject({
        code: 'CONFLICT',
        message: '该分类下存在文章，无法删除',
      })
    })

    it('should delete category when no children and no articles', async () => {
      ;(repo.findById as MockFn).mockResolvedValue(mockCategory())

      const service = createAdminBlogCategoryService({ categories: repo as unknown as BlogCategoryRepository }, ctx)
      const result = await service.deleteCategory('cat-1')

      expect(result).toEqual({ id: 'cat-1' })
      expect(repo.delete).toHaveBeenCalledWith(expect.anything(), { categoryId: 'cat-1' })
    })
  })
})
