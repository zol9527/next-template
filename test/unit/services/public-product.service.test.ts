/**
 * Unit: 公开商品服务测试
 *
 * Description: 测试面向小程序用户的商品查询服务
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPublicProductService } from '@/services/public-product.service'
import type { ProductRepository } from '@/repositories/interfaces/product.interface'
import type { MediaAssetRepository } from '@/repositories/interfaces/media-asset.interface'
import type { ObjectStorageProvider } from '@/lib/storage/types'
import type { AdminProduct } from '@/contracts/dtos/admin/products.dto'
import type pino from 'pino'

// 模拟日志记录器
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(() => mockLogger),
} as pino.Logger

// 模拟服务上下文
const mockServiceContext = {
  traceId: 'test-trace-id',
  logger: mockLogger,
}

/**
 * 构建测试用的商品数据
 */
function buildTestProduct(overrides?: Partial<AdminProduct>): AdminProduct {
  return {
    id: 'product-123',
    name: '测试课程',
    slug: 'test-course',
    summary: '课程简介',
    description: '详细描述',
    kind: 'course',
    status: 'published',
    price: { amount: '99.00', currencyCode: 'CNY' },
    originalPrice: { amount: '199.00', currencyCode: 'CNY' },
    stockQuantity: 100,
    isFeatured: false,
    tags: ['tag1', 'tag2'],
    categoryIds: [],
    coverAssetId: null,
    mediaAssetIds: [],
    extensions: null,
    createdBy: 'user-123',
    updatedBy: 'user-123',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  }
}

/**
 * 创建模拟的商品仓库
 */
function createMockProductRepository(overrides?: Partial<ProductRepository>): ProductRepository {
  return {
    ...overrides,
    listProducts: overrides?.listProducts ?? vi.fn().mockResolvedValue({
      items: [],
      nextCursor: null,
      totalCount: 0,
    }),
    getProductById: overrides?.getProductById ?? vi.fn().mockResolvedValue(null),
    listProductsByIds: overrides?.listProductsByIds ?? vi.fn().mockResolvedValue([]),
    createProduct: overrides?.createProduct ?? vi.fn().mockResolvedValue(buildTestProduct()),
    updateProduct: overrides?.updateProduct ?? vi.fn().mockResolvedValue(null),
    setProductStatus: overrides?.setProductStatus ?? vi.fn().mockResolvedValue(null),
    deleteProduct: overrides?.deleteProduct ?? vi.fn().mockResolvedValue(null),
    isProductReferenced: overrides?.isProductReferenced ?? vi.fn().mockResolvedValue(false),
    setProductCategories: overrides?.setProductCategories ?? vi.fn().mockResolvedValue(undefined),
    listProductCategoryIds: overrides?.listProductCategoryIds ?? vi.fn().mockResolvedValue([]),
    listCategoriesForProducts: overrides?.listCategoriesForProducts ?? vi.fn().mockResolvedValue(new Map()),
    setProductMediaAttachments: overrides?.setProductMediaAttachments ?? vi.fn().mockResolvedValue(undefined),
    listProductMediaAttachments: overrides?.listProductMediaAttachments ?? vi.fn().mockResolvedValue([]),
    listAttachmentsForProducts: overrides?.listAttachmentsForProducts ?? vi.fn().mockResolvedValue(new Map()),
    getGlobalStats: overrides?.getGlobalStats ?? vi.fn().mockResolvedValue({ totalProducts: 0 }),
  }
}

/**
 * 创建模拟的媒体资源仓库
 */
function createMockMediaAssetRepository(overrides?: Partial<MediaAssetRepository>): MediaAssetRepository {
  return {
    getMediaAssetById: vi.fn(),
    getMediaAssetsByIds: vi.fn(),
    listMediaAssetsCursor: vi.fn(),
    listMediaAssets: vi.fn(),
    createMediaAsset: vi.fn(),
    deleteMediaAsset: vi.fn(),
    getMediaReferences: vi.fn(),
    ...overrides,
  }
}

/**
 * 创建模拟的存储提供者
 */
function createMockStorageProvider(overrides?: Partial<ObjectStorageProvider>): ObjectStorageProvider {
  return {
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
    getSignedUrl: vi.fn().mockImplementation((key) => Promise.resolve(`https://cdn.example.com/${key}?signature=xxx`)),
    getFileUrl: vi.fn().mockImplementation((key) => Promise.resolve(`https://cdn.example.com/${key}`)),
    issueUploadPolicy: vi.fn(),
    listFiles: vi.fn(),
    searchFiles: vi.fn(),
    ...overrides,
  }
}

describe('公开商品服务测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('商品列表查询 (listProducts)', () => {
    /**
     * Function: listProducts (成功场景)
     *
     * Description: 测试获取已发布商品列表
     *
     * Returns:
     *   result(PublicProductListResponse): 包含商品列表和分页信息
     */
    it('应该返回已发布商品列表', async () => {
      const mockProduct = buildTestProduct({
        id: 'product-123',
        status: 'published',
        isFeatured: false,
      })

      const products = createMockProductRepository({
        listProducts: vi.fn().mockResolvedValue({
          items: [mockProduct],
          nextCursor: null,
          totalCount: 1,
        }),
        listCategoriesForProducts: vi.fn().mockResolvedValue(
          new Map([['product-123', ['category-1', 'category-2']]]),
        ),
        listAttachmentsForProducts: vi.fn().mockResolvedValue(
          new Map([['product-123', [{ asset_id: 'cover-123', usage: 'cover' }]]]),
        ),
      })

      const service = createPublicProductService({ products }, mockServiceContext)

      const result = await service.listProducts()

      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe('product-123')
      expect(result.items[0].name).toBe('测试课程')
      expect(result.nextCursor).toBeNull()
      expect(result.total).toBe(1)
    })

    /**
     * Function: listProducts (Batch Fetch / N+1 Check)
     *
     * Description: 验证批量获取媒体资源，确保没有 N+1 查询问题
     */
    it('应该批量获取媒体资源 (N+1 check)', async () => {
      const p1 = buildTestProduct({ id: 'p1' })
      const p2 = buildTestProduct({ id: 'p2' })

      const products = createMockProductRepository({
        listProducts: vi.fn().mockResolvedValue({
          items: [p1, p2],
          nextCursor: null,
          totalCount: 2,
        }),
        listCategoriesForProducts: vi.fn().mockResolvedValue(new Map()),
        listAttachmentsForProducts: vi.fn().mockResolvedValue(new Map([
          ['p1', [{ asset_id: 'c1', usage: 'cover' }, { asset_id: 'm1', usage: 'gallery' }]],
          ['p2', [{ asset_id: 'c2', usage: 'cover' }, { asset_id: 'm2', usage: 'gallery' }]]
        ])),
      })

      const media = createMockMediaAssetRepository({
        getMediaAssetsByIds: vi.fn().mockResolvedValue([
          { id: 'c1', objectKey: 'key-c1' },
          { id: 'm1', objectKey: 'key-m1' },
          { id: 'c2', objectKey: 'key-c2' },
          { id: 'm2', objectKey: 'key-m2' },
        ]),
        getMediaAssetById: vi.fn(), // Should not be called
      })

      const storage = createMockStorageProvider()

      const service = createPublicProductService({ products, media, storage }, mockServiceContext)

      const result = await service.listProducts()

      // 验证返回结果正确（使用精确的 URL 结构验证）
      expect(result.items).toHaveLength(2)
      // coverUrl 应该包含完整的域名和 key，可能有签名参数
      expect(result.items[0].coverUrl).toMatch(/^https:\/\/cdn\.example\.com\/key-c1(\?.*)?$/)
      expect(result.items[0].mediaUrls.some(u => /^https:\/\/cdn\.example\.com\/key-m1(\?.*)?$/.test(u))).toBe(true)
      expect(result.items[1].coverUrl).toMatch(/^https:\/\/cdn\.example\.com\/key-c2(\?.*)?$/)
      expect(result.items[1].mediaUrls.some(u => /^https:\/\/cdn\.example\.com\/key-m2(\?.*)?$/.test(u))).toBe(true)

      // 关键验证：
      // 1. getMediaAssetsByIds 应该只调用一次
      expect(media.getMediaAssetsByIds).toHaveBeenCalledTimes(1)
      
      // 2. 调用参数应包含所有 ID
      const callArgs = (media.getMediaAssetsByIds as any).mock.calls[0][1]
      expect(callArgs.assetIds).toHaveLength(4)
      expect(callArgs.assetIds).toEqual(expect.arrayContaining(['c1', 'm1', 'c2', 'm2']))

      // 3. getMediaAssetById 绝不应该被调用 (N+1 预防)
      expect(media.getMediaAssetById).not.toHaveBeenCalled()
    })

    /**
     * Function: listProducts (Featured Optimization Check)
     *
     * Description: 验证在筛选精选商品时，不会获取非精选商品的媒体资源（性能优化）
     */
    it('应该在筛选精选商品时不获取非精选商品的媒体资源', async () => {
      const pFeatured = buildTestProduct({ id: 'p1', isFeatured: true })
      const pNormal = buildTestProduct({ id: 'p2', isFeatured: false })

      const products = createMockProductRepository({
        listProducts: vi.fn().mockResolvedValue({
          items: [pFeatured, pNormal],
          nextCursor: null,
          totalCount: 2,
        }),
        listCategoriesForProducts: vi.fn().mockResolvedValue(new Map()),
        listAttachmentsForProducts: vi.fn().mockResolvedValue(new Map([
          ['p1', [{ asset_id: 'c1', usage: 'cover' }]],
          ['p2', [{ asset_id: 'c2', usage: 'cover' }]]
        ])),
      })

      const media = createMockMediaAssetRepository({
        getMediaAssetsByIds: vi.fn().mockResolvedValue([
          { id: 'c1', objectKey: 'key-c1' },
        ]),
      })

      const storage = createMockStorageProvider()
      const service = createPublicProductService({ products, media, storage }, mockServiceContext)

      // 请求精选商品
      const result = await service.listProducts({ featured: true, limit: 20 })

      // 验证结果
      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe('p1')

      // 关键验证：getMediaAssetsByIds 应该只包含 p1 的 assetId (c1)，不包含 p2 的 assetId (c2)
      expect(media.getMediaAssetsByIds).toHaveBeenCalledTimes(1)
      const callArgs = (media.getMediaAssetsByIds as any).mock.calls[0][1]
      
      expect(callArgs.assetIds).toContain('c1')
      expect(callArgs.assetIds).not.toContain('c2')
    })

    /**
     * Function: listProducts (默认 limit)
     *
     * Description: 测试使用默认 limit 参数
     */
    it('应该使用默认 limit 参数为 20', async () => {
      const products = createMockProductRepository()
      const service = createPublicProductService({ products }, mockServiceContext)

      await service.listProducts()

      expect(products.listProducts).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        expect.objectContaining({
          limit: 20,
          status: 'published',
        }),
      )
    })

    /**
     * Function: listProducts (limit 下界)
     *
     * Description: 测试 limit 小于 1 时强制设为 1
     */
    it('应该在 limit 小于 1 时强制设为 1', async () => {
      const products = createMockProductRepository()
      const service = createPublicProductService({ products }, mockServiceContext)

      await service.listProducts({ limit: 0 })
      await service.listProducts({ limit: -5 })

      expect(products.listProducts).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        expect.objectContaining({ limit: 1 }),
      )
    })

    /**
     * Function: listProducts (limit 上界)
     *
     * Description: 测试 limit 大于 50 时强制设为 50
     */
    it('应该在 limit 大于 50 时强制设为 50', async () => {
      const products = createMockProductRepository()
      const service = createPublicProductService({ products }, mockServiceContext)

      await service.listProducts({ limit: 100 })

      expect(products.listProducts).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        expect.objectContaining({ limit: 50 }),
      )
    })

    /**
     * Function: listProducts (关键词搜索)
     *
     * Description: 测试按关键词搜索商品
     */
    it('应该支持关键词搜索', async () => {
      const products = createMockProductRepository()
      const service = createPublicProductService({ products }, mockServiceContext)

      await service.listProducts({ limit: 20, keyword: '课程' })

      expect(products.listProducts).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        expect.objectContaining({
          keyword: '课程',
        }),
      )
    })

    /**
     * Function: listProducts (分类筛选)
     *
     * Description: 测试按分类 ID 筛选商品
     */
    it('应该支持按分类筛选', async () => {
      const products = createMockProductRepository()
      const service = createPublicProductService({ products }, mockServiceContext)

      await service.listProducts({ limit: 20, categoryId: 'category-123' })

      expect(products.listProducts).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        expect.objectContaining({
          categoryIds: ['category-123'],
        }),
      )
    })

    /**
     * Function: listProducts (推荐筛选)
     *
     * Description: 测试筛选推荐商品
     */
    it('应该仅返回推荐商品 (featured=true)', async () => {
      const mockProducts = [
        buildTestProduct({ id: 'product-1', isFeatured: true }),
        buildTestProduct({ id: 'product-2', isFeatured: false }),
        buildTestProduct({ id: 'product-3', isFeatured: true }),
      ]

      const products = createMockProductRepository({
        listProducts: vi.fn().mockResolvedValue({
          items: mockProducts,
          nextCursor: null,
          totalCount: 3,
        }),
        listCategoriesForProducts: vi.fn().mockResolvedValue(new Map()),
        listAttachmentsForProducts: vi.fn().mockResolvedValue(new Map()),
      })

      const service = createPublicProductService({ products }, mockServiceContext)

      const result = await service.listProducts({ limit: 20, featured: true })

      expect(result.items).toHaveLength(2)
      expect(result.items[0].id).toBe('product-1')
      expect(result.items[1].id).toBe('product-3')
    })

    /**
     * Function: listProducts (游标分页)
     *
     * Description: 测试游标分页功能
     */
    it('应该支持游标分页', async () => {
      const products = createMockProductRepository()
      const service = createPublicProductService({ products }, mockServiceContext)

      await service.listProducts({ cursor: 'next-cursor-123', limit: 10 })

      expect(products.listProducts).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        expect.objectContaining({
          cursor: 'next-cursor-123',
          limit: 10,
        }),
      )
    })

    /**
     * Function: listProducts (空结果)
     *
     * Description: 测试返回空结果
     */
    it('应该正确处理空结果', async () => {
      const products = createMockProductRepository({
        listProducts: vi.fn().mockResolvedValue({
          items: [],
          nextCursor: null,
          totalCount: 0,
        }),
      })

      const service = createPublicProductService({ products }, mockServiceContext)

      const result = await service.listProducts()

      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
    })

    /**
     * Function: listProducts (附件映射)
     *
     * Description: 测试正确映射封面和媒体附件
     */
    it('应该正确映射封面和媒体附件', async () => {
      const mockProduct = buildTestProduct({ id: 'product-123' })

      const products = createMockProductRepository({
        listProducts: vi.fn().mockResolvedValue({
          items: [mockProduct],
          nextCursor: null,
          totalCount: 1,
        }),
        listCategoriesForProducts: vi.fn().mockResolvedValue(new Map()),
        listAttachmentsForProducts: vi.fn().mockResolvedValue(
          new Map([
            [
              'product-123',
              [
                { asset_id: 'cover-123', usage: 'cover' },
                { asset_id: 'media-1', usage: 'gallery' },
                { asset_id: 'media-2', usage: 'gallery' },
              ],
            ],
          ]),
        ),
      })

      const service = createPublicProductService({ products }, mockServiceContext)

      const result = await service.listProducts()

      expect(result.items[0].coverAssetId).toBe('cover-123')
      expect(result.items[0].mediaAssetIds).toEqual(['media-1', 'media-2'])
    })

    /**
     * Function: listProducts (无封面附件)
     *
     * Description: 测试商品无封面时的处理
     */
    it('应该在无封面时设置 coverAssetId 为 null', async () => {
      const mockProduct = buildTestProduct({ id: 'product-123' })

      const products = createMockProductRepository({
        listProducts: vi.fn().mockResolvedValue({
          items: [mockProduct],
          nextCursor: null,
          totalCount: 1,
        }),
        listCategoriesForProducts: vi.fn().mockResolvedValue(new Map()),
        listAttachmentsForProducts: vi.fn().mockResolvedValue(
          new Map([['product-123', [{ asset_id: 'media-1', usage: 'gallery' }]]]),
        ),
      })

      const service = createPublicProductService({ products }, mockServiceContext)

      const result = await service.listProducts()

      expect(result.items[0].coverAssetId).toBeNull()
      expect(result.items[0].mediaAssetIds).toEqual(['media-1'])
    })
  })

  describe('商品详情查询 (getProductById)', () => {
    /**
     * Function: getProductById (成功场景)
     *
     * Description: 测试获取已发布商品详情
     *
     * Parameters:
     *   productId(string): 商品 ID
     *
     * Returns:
     *   product(PublicProduct): 商品详情
     */
    it('应该返回已发布商品详情', async () => {
      const mockProduct = buildTestProduct({
        id: 'product-123',
        status: 'published',
      })

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
        listProductCategoryIds: vi.fn().mockResolvedValue(['category-1', 'category-2']),
        listProductMediaAttachments: vi.fn().mockResolvedValue([
          { asset_id: 'cover-123', usage: 'cover' },
        ]),
      })

      const service = createPublicProductService({ products }, mockServiceContext)

      const result = await service.getProductById('product-123')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('product-123')
      expect(result?.name).toBe('测试课程')
    })

    /**
     * Function: getProductById (未发布商品)
     *
     * Description: 测试获取未发布商品时返回 null
     */
    it('应该对未发布商品返回 null', async () => {
      const mockProduct = buildTestProduct({
        id: 'product-123',
        status: 'draft',
      })

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      const service = createPublicProductService({ products }, mockServiceContext)

      const result = await service.getProductById('product-123')

      expect(result).toBeNull()
    })

    /**
     * Function: getProductById (商品不存在)
     *
     * Description: 测试获取不存在商品时返回 null
     */
    it('应该对不存在的商品返回 null', async () => {
      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(null),
      })

      const service = createPublicProductService({ products }, mockServiceContext)

      const result = await service.getProductById('non-existent')

      expect(result).toBeNull()
    })

    /**
     * Function: getProductById (带附件)
     *
     * Description: 测试正确加载附件
     */
    it('应该正确加载附件', async () => {
      const mockProduct = buildTestProduct({ id: 'product-123' })

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
        listProductCategoryIds: vi.fn().mockResolvedValue(['cat-1', 'cat-2']),
        listProductMediaAttachments: vi.fn().mockResolvedValue([
          { asset_id: 'cover-123', usage: 'cover' },
          { asset_id: 'media-1', usage: 'gallery' },
        ]),
      })

      const service = createPublicProductService({ products }, mockServiceContext)

      const result = await service.getProductById('product-123')

      expect(result?.coverAssetId).toBe('cover-123')
      expect(result?.mediaAssetIds).toEqual(['media-1'])
    })

    /**
     * Function: getProductById (无附件)
     *
     * Description: 测试商品无附件时的处理
     */
    it('应该处理无附件的商品', async () => {
      const mockProduct = buildTestProduct({ id: 'product-123' })

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
        listProductCategoryIds: vi.fn().mockResolvedValue([]),
        listProductMediaAttachments: vi.fn().mockResolvedValue([]),
      })

      const service = createPublicProductService({ products }, mockServiceContext)

      const result = await service.getProductById('product-123')

      expect(result?.coverAssetId).toBeNull()
      expect(result?.mediaAssetIds).toEqual([])
    })
  })
})
