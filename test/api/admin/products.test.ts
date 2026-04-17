import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/v1/admin/products/route'
import * as Factory from '@/repositories/factory'
import * as AdminProductService from '@/services/admin-product.service'
import type { ProductRepository } from '@/repositories/interfaces/product.interface'
import { useApiAuth } from '@/app/api/v1/_shared/use-api-auth'

vi.mock('@/repositories/factory', () => ({
  createProductRepository: vi.fn().mockResolvedValue({}),
  createMediaAssetRepository: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/oss/factory', () => ({
  createOssProvider: vi.fn().mockReturnValue({}),
}))

vi.mock('@/services/admin-product.service', () => ({
  createAdminProductService: vi.fn(),
}))

vi.mock('@/app/api/v1/_shared/use-api-auth', () => ({
  useApiAuth: vi.fn().mockResolvedValue({
    userId: 'admin-id',
    sessionId: 'session-id',
    roles: ['admin'],
    hasRole: vi.fn().mockReturnValue(true),
    assertRole: vi.fn().mockReturnValue(undefined),
    access: {
      has: vi.fn().mockReturnValue(true),
      assert: vi.fn(),
      canRead: vi.fn().mockReturnValue(true),
      canWrite: vi.fn().mockReturnValue(true),
      canExecute: vi.fn().mockReturnValue(true),
      grants: [],
      scopesFor: vi.fn().mockReturnValue([]),
      hasAny: vi.fn().mockReturnValue(true),
      hasAll: vi.fn().mockReturnValue(true),
    },
    getMe: vi.fn().mockResolvedValue({
      id: 'admin-id',
      nickname: 'Admin',
      roles: ['admin'],
    }),
  }),
}))

describe('API: /api/v1/admin/products', () => {
  const mockListProducts = vi.fn()
  const mockCreateProduct = vi.fn()
  const mockService = {
    listProducts: mockListProducts,
    createProduct: mockCreateProduct,
  } as unknown as ReturnType<typeof AdminProductService.createAdminProductService>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(AdminProductService.createAdminProductService).mockReturnValue(mockService)

    const mockAuthContext = {
      userId: 'admin-id',
      sessionId: 'session-id',
      roles: ['admin'],
      hasRole: vi.fn().mockReturnValue(true),
      assertPermission: vi.fn().mockResolvedValue(undefined),
      assertRole: vi.fn().mockReturnValue(undefined),
      getMe: vi.fn().mockResolvedValue({
        id: 'admin-id',
        nickname: 'Admin',
        roles: ['admin'],
        permissions: ['products.read', 'products.write'],
      }),
    }
    vi.mocked(useApiAuth).mockResolvedValue(mockAuthContext as any)
// TODO: 适配 grant-based 权限系统     vi.mocked(useApiAdminAuth).mockResolvedValue(mockAuthContext as any)
  })

  describe('GET', () => {
    it('should return 200 and product list for admin', async () => {
      const mockData = { items: [], totalCount: 0 }
      mockListProducts.mockResolvedValue(mockData)

      const req = new NextRequest('http://localhost/api/v1/admin/products?limit=10')
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
  })

  describe('POST', () => {
    it('should return 200 and create product', async () => {
      mockCreateProduct.mockResolvedValue({ id: 'new-product-id' })
      const body = {
        name: 'New Product',
        kind: 'course',
        summary: 'Product summary',
        description: 'Product description',
        priceAmount: '100',
        originalPriceAmount: '150',
        stockQuantity: 100,
        isFeatured: false,
        tags: ['tag1'],
        categoryIds: [],
        coverAssetId: null,
        mediaAssetIds: []
      }

      const req = new NextRequest('http://localhost/api/v1/admin/products', {
        method: 'POST',
        body: JSON.stringify(body)
      })

      const response = await POST(req, { params: Promise.resolve({}) })

      // DEBUG: 打印响应以诊断问题
      if (response.status !== 200) {
        const json = await response.json()
        console.error('DEBUG Response:', JSON.stringify(json, null, 2))
      }

      expect(response.status).toBe(200)
    })
  })
})
