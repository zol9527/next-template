import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/v1/public/products/route'
import * as Factory from '@/repositories/factory'
import * as PublicProductService from '@/services/public-product.service'
import type { ProductRepository } from '@/repositories/interfaces/product.interface'

vi.mock('@/repositories/factory', () => ({
  createProductRepository: vi.fn(),
  createMediaAssetRepository: vi.fn(),
}))

vi.mock('@/lib/oss/factory', () => ({
  createOssProvider: vi.fn(),
}))

vi.mock('@/services/public-product.service', () => ({
  createPublicProductService: vi.fn(),
}))

describe('API: /api/v1/public/products', () => {
  const mockListProducts = vi.fn()
  const mockService = {
    listProducts: mockListProducts,
  } as unknown as ReturnType<typeof PublicProductService.createPublicProductService>

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(Factory.createProductRepository).mockResolvedValue({} as unknown as ProductRepository)
    vi.mocked(PublicProductService.createPublicProductService).mockReturnValue(mockService)
  })

  it('should return 200 and product list', async () => {
    const mockData = {
      items: [{ id: 'p1', title: 'Product 1' }],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1
    }
    mockListProducts.mockResolvedValue(mockData)

    const req = new NextRequest('http://localhost/api/v1/public/products?limit=10')

    const response = await GET(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toEqual({
      success: true,
      data: mockData,
    })
    expect(mockListProducts).toHaveBeenCalledWith(expect.objectContaining({
      limit: 10
    }))
  })

  it('should return 400 for invalid query params', async () => {
    // limit min(1)
    const req = new NextRequest('http://localhost/api/v1/public/products?limit=0')

    const response = await GET(req, { params: Promise.resolve({}) })

    expect(response.status).toBe(400)
  })
})
