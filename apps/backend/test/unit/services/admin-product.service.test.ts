import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAdminProductService } from '@/plugins/ecommerce/services/admin-product.service'
import type { ProductRepository } from '@/repositories/interfaces/product.interface'
import type { MediaAssetRepository } from '@/repositories/interfaces/media-asset.interface'
import type { ObjectStorageProvider } from '@/lib/storage/types'
import type { ServiceContext } from '@/types/service/service-context'
import type { AdminProduct } from '@/contracts/dtos/admin/products.dto'
import type { AdminMediaAsset } from '@/contracts/dtos/admin/media-assets.dto'

describe('AdminProductService Performance', () => {
  const mockProductRepo = {
    listProducts: vi.fn(),
    listCategoriesForProducts: vi.fn(),
    listAttachmentsForProducts: vi.fn(),
    getProductById: vi.fn(),
    listProductCategoryIds: vi.fn(),
    listProductMediaAttachments: vi.fn(),
  } as unknown as ProductRepository

  const mockMediaRepo = {
    getMediaAssetById: vi.fn(),
    getMediaAssetsByIds: vi.fn(),
  } as unknown as MediaAssetRepository

  const mockStorage = {
    getSignedUrl: vi.fn(),
    getImageProcessingUrl: vi.fn(),
  } as unknown as ObjectStorageProvider

  const mockContext = {
    logger: {
      child: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
    traceId: 'test-trace-id',
  } as unknown as ServiceContext

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listProducts should use batch fetching (getMediaAssetsByIds) instead of N+1 (getMediaAssetById)', async () => {
    const service = createAdminProductService(
      { products: mockProductRepo, media: mockMediaRepo, storage: mockStorage },
      mockContext
    )

    // Setup: Return 2 products with cover images
    const products: AdminProduct[] = [
      { id: 'p1', name: 'P1' } as AdminProduct,
      { id: 'p2', name: 'P2' } as AdminProduct,
    ]

    vi.mocked(mockProductRepo.listProducts).mockResolvedValue({
      items: products,
      totalCount: 2,
      nextCursor: null,
    })

    vi.mocked(mockProductRepo.listCategoriesForProducts).mockResolvedValue(new Map())

    // Both products have cover images
    const attachmentsMap = new Map()
    attachmentsMap.set('p1', [{ asset_id: 'asset1', usage: 'cover' }])
    attachmentsMap.set('p2', [{ asset_id: 'asset2', usage: 'cover' }])
    vi.mocked(mockProductRepo.listAttachmentsForProducts).mockResolvedValue(attachmentsMap)

    // Mock batch fetch return
    vi.mocked(mockMediaRepo.getMediaAssetsByIds).mockResolvedValue([
      { id: 'asset1', objectKey: 'key1' } as unknown as AdminMediaAsset,
      { id: 'asset2', objectKey: 'key2' } as unknown as AdminMediaAsset,
    ])

    // Mock single fetch return (should NOT be called, but providing just in case logic falls back)
    vi.mocked(mockMediaRepo.getMediaAssetById).mockResolvedValue({ id: 'asset1', objectKey: 'key1' } as unknown as AdminMediaAsset)

    vi.mocked(mockStorage.getSignedUrl).mockResolvedValue('http://url')
    vi.mocked(mockStorage.getImageProcessingUrl).mockResolvedValue('http://processed-url')

    await service.listProducts({ limit: 10 })

    // ASSERTION: getMediaAssetsByIds should be called ONCE
    expect(mockMediaRepo.getMediaAssetsByIds).toHaveBeenCalledTimes(1)
    expect(mockMediaRepo.getMediaAssetsByIds).toHaveBeenCalledWith(expect.anything(), {
        assetIds: expect.arrayContaining(['asset1', 'asset2'])
    })

    // ASSERTION: getMediaAssetById should NOT be called
    expect(mockMediaRepo.getMediaAssetById).toHaveBeenCalledTimes(0)
  })

  it('getProductById should use batch fetching (getMediaAssetsByIds) instead of N+1', async () => {
    const service = createAdminProductService(
      { products: mockProductRepo, media: mockMediaRepo, storage: mockStorage },
      mockContext
    )

    const product = { id: 'p1', name: 'Product 1' } as AdminProduct
    vi.mocked(mockProductRepo.getProductById).mockResolvedValue(product)
    vi.mocked(mockProductRepo.listProductCategoryIds).mockResolvedValue([])

    // Product has cover + 2 gallery images
    const attachments = [
      { id: '1', product_id: 'p1', asset_id: 'cover1', usage: 'cover', sort_order: 0, created_at: '2023-01-01' },
      { id: '2', product_id: 'p1', asset_id: 'gallery1', usage: 'gallery', sort_order: 1, created_at: '2023-01-01' },
      { id: '3', product_id: 'p1', asset_id: 'gallery2', usage: 'gallery', sort_order: 2, created_at: '2023-01-01' },
    ]
    vi.mocked(mockProductRepo.listProductMediaAttachments).mockResolvedValue(attachments)

    vi.mocked(mockMediaRepo.getMediaAssetsByIds).mockResolvedValue([
      { id: 'cover1', objectKey: 'key1' } as AdminMediaAsset,
      { id: 'gallery1', objectKey: 'key2' } as AdminMediaAsset,
      { id: 'gallery2', objectKey: 'key3' } as AdminMediaAsset,
    ])

    vi.mocked(mockStorage.getSignedUrl).mockResolvedValue('http://url')
    vi.mocked(mockStorage.getImageProcessingUrl).mockResolvedValue('http://processed-url')

    await service.getProductById('p1')

    // Expect batch fetch
    expect(mockMediaRepo.getMediaAssetsByIds).toHaveBeenCalledTimes(1)
    expect(mockMediaRepo.getMediaAssetsByIds).toHaveBeenCalledWith(expect.anything(), {
      assetIds: expect.arrayContaining(['cover1', 'gallery1', 'gallery2'])
    })

    // Expect NO single fetch
    expect(mockMediaRepo.getMediaAssetById).toHaveBeenCalledTimes(0)
  })
})

describe('AdminProductService Batch Operations', () => {
  const mockProductRepo = {
    setProductStatus: vi.fn(),
    deleteProduct: vi.fn(),
  } as unknown as ProductRepository

  const mockContext = {
    logger: {
      child: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
    traceId: 'test-trace-id',
  } as unknown as ServiceContext

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('batchUpdateProductStatus should treat null result as failure and pass updatedBy', async () => {
    const service = createAdminProductService({ products: mockProductRepo }, mockContext)

    vi.mocked((mockProductRepo as unknown as { setProductStatus: ReturnType<typeof vi.fn> }).setProductStatus)
      .mockImplementation(async (_ctx, params: { productId: string; updatedBy: string }) => {
        if (params.productId === 'p-ok') return { id: 'p-ok' } as unknown as AdminProduct
        if (params.productId === 'p-null') return null
        throw new Error('db error')
      })

    const out = await service.batchUpdateProductStatus({
      productIds: ['p-ok', 'p-null', 'p-err'],
      status: 'unpublished',
      updatedBy: 'admin-1',
    })

    expect(out.updatedCount).toBe(1)
    expect(out.failedIds).toEqual(expect.arrayContaining(['p-null', 'p-err']))

    expect(
      vi.mocked((mockProductRepo as unknown as { setProductStatus: ReturnType<typeof vi.fn> }).setProductStatus)
    ).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ updatedBy: 'admin-1' }))
  })

  it('batchDeleteProducts should treat null result as failure and pass deletedBy', async () => {
    const service = createAdminProductService({ products: mockProductRepo }, mockContext)

    vi.mocked((mockProductRepo as unknown as { deleteProduct: ReturnType<typeof vi.fn> }).deleteProduct)
      .mockImplementation(async (_ctx, params: { productId: string; deletedBy: string }) => {
        if (params.productId === 'p-ok') return { id: 'p-ok' } as unknown as AdminProduct
        if (params.productId === 'p-null') return null
        throw new Error('db error')
      })

    const out = await service.batchDeleteProducts({
      productIds: ['p-ok', 'p-null', 'p-err'],
      deletedBy: 'admin-1',
    })

    expect(out.deletedCount).toBe(1)
    expect(out.failedIds).toEqual(expect.arrayContaining(['p-null', 'p-err']))

    expect(
      vi.mocked((mockProductRepo as unknown as { deleteProduct: ReturnType<typeof vi.fn> }).deleteProduct)
    ).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ deletedBy: 'admin-1' }))
  })
})
