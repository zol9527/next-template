import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/v1/admin/products/route'
import * as Factory from '@/repositories/factory'
import * as AdminProductService from '@/plugins/ecommerce/services/admin-product.service'

// Mock logger 避免文件系统写入
vi.mock('@/lib/logger', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(function (this: unknown) {
      return this
    }),
  }
  return {
    createRequestLogger: vi.fn(() => mockLogger),
    logger: mockLogger,
  }
})

// Mock createServiceContext 提供有效的上下文
vi.mock('@/types/service/service-context', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(function (this: unknown) {
      return this
    }),
  }
  return {
    createServiceContext: vi.fn(() => ({
      traceId: 'test-trace-id',
      logger: mockLogger,
      userAgent: null,
      clientIp: null,
    })),
  }
})

// Mock 插件注册表（确保不受插件状态影响）
vi.mock('@/plugins/registry', () => ({
  isPluginEnabled: vi.fn(() => true),
  getEnabledPlugins: vi.fn(() => []),
}))

vi.mock('@/repositories/factory', () => ({
  createProductRepository: vi.fn().mockResolvedValue({}),
  createMediaAssetRepository: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/oss/factory', () => ({
  createOssProvider: vi.fn().mockReturnValue({}),
}))

vi.mock('@/plugins/ecommerce/services/admin-product.service', () => ({
  createAdminProductService: vi.fn(),
}))

// Mock 认证模块 - 使用 hoisted 确保在 vi.mock 中可用
const mockUseApiAuth = vi.hoisted(() => vi.fn())
vi.mock('@/app/api/v1/_shared/use-api-auth', () => ({
  useApiAuth: mockUseApiAuth,
}))

/**
 * Function: createAdminAuth
 *
 * Description: 创建管理员认证上下文
 *
 * Returns:
 *     auth(object): 管理员认证上下文
 */
function createAdminAuth() {
  return {
    userId: 'admin-id',
    sessionId: 'session-id',
    roles: ['admin'],
    hasRole: vi.fn(() => true),
    assertRole: vi.fn(),
    getMe: vi.fn(),
    access: {
      assert: vi.fn(),
      has: vi.fn(() => true),
      check: vi.fn(() => true),
      canRead: vi.fn(() => true),
      canWrite: vi.fn(() => true),
      canExecute: vi.fn(() => true),
      grants: [],
      scopesFor: vi.fn(() => []),
      hasAny: vi.fn(() => true),
      hasAll: vi.fn(() => true),
    },
  }
}

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
    mockUseApiAuth.mockResolvedValue(createAdminAuth())
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

      expect(response.status).toBe(200)
    })
  })
})
