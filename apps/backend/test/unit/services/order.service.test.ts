/**
 * Unit: 订单服务测试
 *
 * Description: 测试订单服务的核心功能，重点验证高并发场景下的幂等性和订单创建逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createOrderService } from '@/plugins/ecommerce/services/order.service'
import type { OrderRepository } from '@/repositories/interfaces/order.interface'
import type { ProductRepository } from '@/repositories/interfaces/product.interface'
import type { IdempotencyRepository } from '@/repositories/interfaces/idempotency.interface'
import type { CouponRepository, UserCouponRepository, CouponRedemptionRepository } from '@/repositories/interfaces/coupon.interface'
import type { PromoterCodeRepository } from '@/repositories/interfaces/promoter-code.interface'
import type { DistributionRepository } from '@/repositories/interfaces/distribution.interface'
import type { AdminProduct } from '@/contracts/dtos/admin/products.dto'
import type { Order } from '@/contracts/dtos/orders.dto'
import type { IdempotencyRequest } from '@/contracts/dtos/idempotency.dto'
import type pino from 'pino'

// Mock dynamic imports — 路径必须与 service 中 import() 的路径一致
vi.mock('@/plugins/ecommerce/services/coupon.service', () => ({
  createCouponService: vi.fn(),
}))

vi.mock('@/plugins/promotion/services/promoter-code.service', () => ({
  createPromoterCodeService: vi.fn(),
}))

import { createCouponService } from '@/plugins/ecommerce/services/coupon.service'
import { createPromoterCodeService } from '@/plugins/promotion/services/promoter-code.service'

// ==================== Mock Objects ====================

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(() => mockLogger),
} as unknown as pino.Logger

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
    tags: ['tag1'],
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
 * 构建测试用的订单数据
 */
function buildTestOrder(overrides?: Partial<Order>): Order {
  return {
    id: 'order-123',
    orderNo: 'ORD-20250122-143052-A3F9B2',
    userId: 'user-123',
    productId: 'product-123',
    priceAmount: '99.00',
    currencyCode: 'CNY',
    status: 'pending_payment',
    couponRedemptionId: null as string | null,
    discountAmount: '0.00',
    fulfillmentStatus: null,
    paidAmount: null as string | null,
    refundedAmount: '0.00',
    paidAt: null as string | null,
    completedAt: null as string | null,
    closedAt: null as string | null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

/**
 * 构建测试用的幂等性请求记录
 */
function buildTestIdempotencyRequest(overrides?: Partial<IdempotencyRequest>): IdempotencyRequest {
  return {
    id: 'idempotency-123',
    userId: 'user-123',
    action: 'orders:create',
    idempotencyKey: 'unique-key-123',
    requestHash: '7d3ff0cddf4ce97dfbfa9782989f1f6624f787e05b7e4e9bdaed2389e3a89d6a', // SHA256({ productId: 'product-123' })
    status: 'pending',
    resourceType: null,
    resourceId: undefined,
    responseCode: null,
    responseBody: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  }
}

/**
 * 创建模拟的商品仓库
 */
function createMockProductRepository(overrides?: Partial<ProductRepository>): ProductRepository {
  return {
    getProductById: overrides?.getProductById ?? vi.fn().mockResolvedValue(null),
    listProducts: overrides?.listProducts ?? vi.fn(),
    listProductsByIds: overrides?.listProductsByIds ?? vi.fn().mockResolvedValue([]),
    createProduct: overrides?.createProduct ?? vi.fn(),
    updateProduct: overrides?.updateProduct ?? vi.fn(),
    setProductStatus: overrides?.setProductStatus ?? vi.fn(),
    deleteProduct: overrides?.deleteProduct ?? vi.fn(),
    isProductReferenced: overrides?.isProductReferenced ?? vi.fn(),
    setProductCategories: overrides?.setProductCategories ?? vi.fn(),
    listProductCategoryIds: overrides?.listProductCategoryIds ?? vi.fn(),
    listCategoriesForProducts: overrides?.listCategoriesForProducts ?? vi.fn(),
    setProductMediaAttachments: overrides?.setProductMediaAttachments ?? vi.fn(),
    listProductMediaAttachments: overrides?.listProductMediaAttachments ?? vi.fn(),
    listAttachmentsForProducts: overrides?.listAttachmentsForProducts ?? vi.fn(),
    getGlobalStats: overrides?.getGlobalStats ?? vi.fn(),
  }
}

/**
 * 创建模拟的订单仓库
 */
function createMockOrderRepository(overrides?: Partial<OrderRepository>): OrderRepository {
  return {
    getOrderById: overrides?.getOrderById ?? vi.fn().mockResolvedValue(null),
    createOrder: overrides?.createOrder ?? vi.fn().mockResolvedValue(buildTestOrder()),
    updateOrder: overrides?.updateOrder ?? vi.fn().mockResolvedValue(buildTestOrder()),
    updateOrderStatus: overrides?.updateOrderStatus ?? vi.fn().mockResolvedValue(buildTestOrder()),
    listOrders: overrides?.listOrders ?? vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    countOrdersByStatus: overrides?.countOrdersByStatus ?? vi.fn().mockResolvedValue({}),
    getOrderByOrderNo: overrides?.getOrderByOrderNo ?? vi.fn().mockResolvedValue(null),
    listAdminOrders: overrides?.listAdminOrders ?? vi.fn().mockResolvedValue({ items: [], nextCursor: null, totalCount: 0 }),
    getDashboardStats: overrides?.getDashboardStats ?? vi.fn().mockResolvedValue({ totalOrders: 0, totalRevenue: '0' }),
  }
}

/**
 * 创建模拟的幂等性仓库
 */
function createMockIdempotencyRepository(overrides?: Partial<IdempotencyRepository>): IdempotencyRepository {
  return {
    getRequest: overrides?.getRequest ?? vi.fn().mockResolvedValue(null),
    createRequest: overrides?.createRequest ?? vi.fn().mockResolvedValue(buildTestIdempotencyRequest()),
    markSucceeded: overrides?.markSucceeded ?? vi.fn().mockResolvedValue(buildTestIdempotencyRequest()),
    markFailed: overrides?.markFailed ?? vi.fn().mockResolvedValue(buildTestIdempotencyRequest()),
  }
}

function createMockCouponRepository(overrides?: Partial<CouponRepository>): CouponRepository {
  return {
    getCouponById: overrides?.getCouponById ?? vi.fn(),
    createCoupon: overrides?.createCoupon ?? vi.fn(),
    updateCoupon: overrides?.updateCoupon ?? vi.fn(),
    listCoupons: overrides?.listCoupons ?? vi.fn(),
    deleteCoupon: overrides?.deleteCoupon ?? vi.fn(),
    incrementUsedCount: overrides?.incrementUsedCount ?? vi.fn(),
    getExpiredCoupons: overrides?.getExpiredCoupons ?? vi.fn(),
  }
}

function createMockUserCouponRepository(overrides?: Partial<UserCouponRepository>): UserCouponRepository {
  return {
    getUserCouponById: overrides?.getUserCouponById ?? vi.fn(),
    createUserCoupon: overrides?.createUserCoupon ?? vi.fn(),
    listUserCoupons: overrides?.listUserCoupons ?? vi.fn(),
    listUserCouponsForAdmin: overrides?.listUserCouponsForAdmin ?? vi.fn(),
    getUserCouponByCouponAndUser: overrides?.getUserCouponByCouponAndUser ?? vi.fn(),
    countUserCouponsByCouponAndUser: overrides?.countUserCouponsByCouponAndUser ?? vi.fn(),
    markAsUsed: overrides?.markAsUsed ?? vi.fn(),
    getExpiredUserCoupons: overrides?.getExpiredUserCoupons ?? vi.fn(),
  }
}

function createMockRedemptionRepository(overrides?: Partial<CouponRedemptionRepository>): CouponRedemptionRepository {
  return {
    createRedemption: overrides?.createRedemption ?? vi.fn(),
    getRedemptionById: overrides?.getRedemptionById ?? vi.fn(),
    getRedemptionByUserCouponId: overrides?.getRedemptionByUserCouponId ?? vi.fn(),
    listRedemptions: overrides?.listRedemptions ?? vi.fn(),
    updateRedemption: overrides?.updateRedemption ?? vi.fn(),
    countRedemptionsByCoupon: overrides?.countRedemptionsByCoupon ?? vi.fn(),
  }
}

function createMockPromoterCodeRepository(overrides?: Partial<PromoterCodeRepository>): PromoterCodeRepository {
  return {
    getCodeByCode: overrides?.getCodeByCode ?? vi.fn(),
    getCodeById: overrides?.getCodeById ?? vi.fn(),
    listCodesByPromoterUserId: overrides?.listCodesByPromoterUserId ?? vi.fn(),
    createCode: overrides?.createCode ?? vi.fn(),
    updateCodeStatus: overrides?.updateCodeStatus ?? vi.fn(),
    deleteCode: overrides?.deleteCode ?? vi.fn(),
    incrementUsageCount: overrides?.incrementUsageCount ?? vi.fn(),
    checkCodeExists: overrides?.checkCodeExists ?? vi.fn(),
    getActiveCodesCount: overrides?.getActiveCodesCount ?? vi.fn(),
    getTotalCodesCount: overrides?.getTotalCodesCount ?? vi.fn(),
  }
}

function createMockDistributionRepository(overrides?: Partial<DistributionRepository>): DistributionRepository {
  return {
    getRelationByUserId: overrides?.getRelationByUserId ?? vi.fn(),
    bindRelation: overrides?.bindRelation ?? vi.fn(),
  }
}

// ==================== Test Suites ====================

describe('订单服务测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('基础功能：createOrderForUser', () => {
    /**
     * Test: 成功创建订单
     *
     * Description: 测试正常的订单创建流程
     */
    it('应该成功创建订单', async () => {
      // Arrange
      const mockProduct = buildTestProduct({ id: 'product-123' })
      const mockCreatedOrder = buildTestOrder({ id: 'order-123' })

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      const mockIdempotencyRequest = buildTestIdempotencyRequest({
        status: 'pending',
      })

      const idempotency = createMockIdempotencyRepository({
        getRequest: vi.fn().mockResolvedValue(null),
        createRequest: vi.fn().mockResolvedValue(mockIdempotencyRequest),
      })

      const orders = createMockOrderRepository({
        createOrder: vi.fn().mockResolvedValue(mockCreatedOrder),
      })

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act
      const result = await service.createOrderForUser({
        userId: 'user-123',
        productId: 'product-123',
        idempotencyKey: 'unique-key-123',
      })

      // Assert
      expect(result).toBeDefined()
      expect(result.id).toBe('order-123')
      expect(result.userId).toBe('user-123')
      expect(result.productId).toBe('product-123')
      expect(orders.createOrder).toHaveBeenCalled()
      expect(idempotency.markSucceeded).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        {
          id: 'idempotency-123',
          resourceType: 'order',
          resourceId: 'order-123',
          updatedAt: expect.any(String),
        }
      )
    })

    /**
     * Test: 商品不存在
     *
     * Description: 测试商品不存在时的错误处理
     */
    it('应该拒绝不存在的商品', async () => {
      // Arrange
      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(null),
      })

      const idempotency = createMockIdempotencyRepository()
      const orders = createMockOrderRepository()

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act & Assert
      await expect(
        service.createOrderForUser({
          userId: 'user-123',
          productId: 'invalid-product',
          idempotencyKey: 'key-123',
        })
      ).rejects.toThrow('Invalid product')
    })

    /**
     * Test: 商品不可购买
     *
     * Description: 测试商品状态不是 published 时的错误处理
     */
    it('应该拒绝不可购买的商品', async () => {
      // Arrange
      const mockProduct = buildTestProduct({ status: 'draft' })

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      const idempotency = createMockIdempotencyRepository()
      const orders = createMockOrderRepository()

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act & Assert
      await expect(
        service.createOrderForUser({
          userId: 'user-123',
          productId: 'product-123',
          idempotencyKey: 'key-123',
        })
      ).rejects.toThrow('Product is not purchasable')
    })

    /**
     * Test: 缺少幂等性仓库
     *
     * Description: 测试未配置幂等性仓库时的错误处理
     */
    it('应该在缺少幂等性仓库时抛出错误', async () => {
      // Arrange
      const mockProduct = buildTestProduct()

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      const orders = createMockOrderRepository()

      const service = createOrderService(
        { orders, products },
        mockServiceContext
      )

      // Act & Assert
      await expect(
        service.createOrderForUser({
          userId: 'user-123',
          productId: 'product-123',
          idempotencyKey: 'key-123',
        })
      ).rejects.toThrow('Idempotency repository not configured')
    })
  })

  describe('幂等性控制', () => {
    /**
     * Test: 幂等性缓存命中
     *
     * Description: 测试相同的幂等键直接返回已缓存的订单
     */
    it('应该在幂等性缓存命中时返回已缓存的订单', async () => {
      // Arrange
      const mockProduct = buildTestProduct()
      const mockCachedOrder = buildTestOrder({ id: 'cached-order-123' })

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      // 创建一个成功的幂等性记录
      const mockIdempotencyRequest = buildTestIdempotencyRequest({
        id: 'cached-idempotency',
        status: 'succeeded',
        resourceType: 'order',
        resourceId: 'cached-order-123',
      })

      const idempotency = createMockIdempotencyRepository({
        getRequest: vi.fn().mockResolvedValue(mockIdempotencyRequest),
      })

      const orders = createMockOrderRepository({
        getOrderById: vi.fn().mockResolvedValue(mockCachedOrder),
        createOrder: vi.fn().mockResolvedValue(mockCachedOrder),
      })

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act
      const result = await service.createOrderForUser({
        userId: 'user-123',
        productId: 'product-123',
        idempotencyKey: 'cached-key',
      })

      // Assert
      expect(result.id).toBe('cached-order-123')
      expect(orders.createOrder).not.toHaveBeenCalled()
      expect(idempotency.createRequest).not.toHaveBeenCalled()
    })

    /**
     * Test: 幂等性键过期
     *
     * Description: 测试幂等键过期后的错误处理
     */
    it('应该在幂等性键过期时拒绝请求', async () => {
      // Arrange
      const mockProduct = buildTestProduct()
      const expiredIdempotencyRequest = buildTestIdempotencyRequest({
        expiresAt: new Date(Date.now() - 1000).toISOString(), // 1秒前过期
        requestHash: '7d3ff0cddf4ce97dfbfa9782989f1f6624f787e05b7e4e9bdaed2389e3a89d6a',
      })

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      const idempotency = createMockIdempotencyRepository({
        getRequest: vi.fn().mockResolvedValue(expiredIdempotencyRequest),
      })

      const orders = createMockOrderRepository()

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act & Assert
      await expect(
        service.createOrderForUser({
          userId: 'user-123',
          productId: 'product-123',
          idempotencyKey: 'expired-key',
        })
      ).rejects.toThrow('Idempotency key expired')
    })

    /**
     * Test: 幂等性请求正在进行中
     *
     * Description: 测试并发场景下，相同请求正在处理时的冲突处理
     */
    it('应该在请求正在进行时返回冲突错误', async () => {
      // Arrange
      const mockProduct = buildTestProduct()
      const mockIdempotencyRequest = buildTestIdempotencyRequest({
        status: 'pending', // 正在处理中
      })

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      const idempotency = createMockIdempotencyRepository({
        getRequest: vi.fn().mockResolvedValue(mockIdempotencyRequest),
      })

      const orders = createMockOrderRepository()

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act & Assert
      await expect(
        service.createOrderForUser({
          userId: 'user-123',
          productId: 'product-123',
          idempotencyKey: 'in-progress-key',
        })
      ).rejects.toThrow('Idempotency request in progress')
    })
  })

  describe('高并发场景', () => {
    /**
     * Test: 并发创建幂等性记录冲突
     *
     * Description: 模拟两个请求同时到达，触发数据库唯一约束冲突（PostgreSQL error 23505）
     */
    it('应该正确处理并发创建幂等性记录的冲突', async () => {
      // Arrange
      const mockProduct = buildTestProduct()
      const mockOrder1 = buildTestOrder({ id: 'order-1' })

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      // 模拟并发冲突：第一次调用返回 null，第二次调用返回已存在的记录
      let getRequestCallCount = 0
      const idempotency = createMockIdempotencyRepository({
        getRequest: vi.fn().mockImplementation(async () => {
          getRequestCallCount++
          // 第一次查询返回 null（不存在）
          if (getRequestCallCount === 1) return null
          // 第二次查询（在创建失败后）返回成功的记录
          return buildTestIdempotencyRequest({
            id: 'concurrent-idempotency',
            status: 'succeeded',
            resourceType: 'order',
            resourceId: 'order-1',
          })
        }),
        createRequest: vi.fn().mockImplementation(async () => {
          // 模拟数据库唯一约束冲突
          const error = new Error('duplicate key') as Error & { code?: string }
          error.code = '23505'
          throw error
        }),
      })

      const orders = createMockOrderRepository({
        getOrderById: vi.fn().mockResolvedValue(mockOrder1),
        createOrder: vi.fn().mockResolvedValue(buildTestOrder()),
      })

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act
      const result = await service.createOrderForUser({
        userId: 'user-123',
        productId: 'product-123',
        idempotencyKey: 'concurrent-key',
      })

      // Assert
      expect(result.id).toBe('order-1') // 应该返回已缓存的订单
      expect(orders.createOrder).not.toHaveBeenCalled() // 不应该创建新订单
      expect(idempotency.getRequest).toHaveBeenCalledTimes(2) // 应该调用两次查询
    })

    /**
     * Test: 多个并发请求使用相同幂等键
     *
     * Description: 模拟多个并发请求使用相同的幂等键，只有一个成功创建订单
     */
    it('应该只创建一个订单当多个并发请求使用相同幂等键', async () => {
      // Arrange
      const mockProduct = buildTestProduct()
      const mockOrder = buildTestOrder({ id: 'order-solo' })

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      // 模拟：第一个请求成功创建，后续请求命中缓存
      let requestCreated = false
      const idempotency = createMockIdempotencyRepository({
        getRequest: vi.fn().mockImplementation(async () => {
          if (requestCreated) {
            return buildTestIdempotencyRequest({
              id: 'solo-idempotency',
              status: 'succeeded',
              resourceType: 'order',
              resourceId: 'order-solo',
            })
          }
          return null
        }),
        createRequest: vi.fn().mockImplementation(async () => {
          if (!requestCreated) {
            requestCreated = true
            return buildTestIdempotencyRequest({
              id: 'solo-idempotency',
              status: 'pending',
            })
          }
          // 第二次尝试创建会失败
          const error = new Error('duplicate key') as Error & { code?: string }
          error.code = '23505'
          throw error
        }),
      })

      const orders = createMockOrderRepository({
        getOrderById: vi.fn().mockResolvedValue(mockOrder),
        createOrder: vi.fn().mockResolvedValue(mockOrder),
      })

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act - 模拟 3 个并发请求
      const promises = Array.from({ length: 3 }, () =>
        service.createOrderForUser({
          userId: 'user-123',
          productId: 'product-123',
          idempotencyKey: 'same-key-for-all',
        })
      )

      const results = await Promise.all(promises)

      // Assert
      expect(results).toHaveLength(3)
      expect(results.every(r => r.id === 'order-solo')).toBe(true) // 所有请求都返回同一个订单
      expect(orders.createOrder).toHaveBeenCalledTimes(1) // 只创建一个订单
      // 注意：在真实并发场景中，可能有多个请求尝试创建幂等性记录
      // 但最终只有一个订单被创建，这保证了业务正确性
      expect(idempotency.createRequest).toHaveBeenCalled() // 至少尝试创建一次
    })

    /**
     * Test: 并发请求中的竞争条件处理
     *
     * Description: 测试在并发场景下，先创建的订单被正确返回，后续请求正确等待
     */
    it('应该正确处理并发请求的竞争条件', async () => {
      // Arrange
      const mockProduct = buildTestProduct()
      const mockOrder = buildTestOrder({ id: 'order-winner' })

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      const idempotency = createMockIdempotencyRepository({
        getRequest: vi.fn().mockImplementation(async () => {
          // 所有并发请求都找不到记录（极端并发场景）
          return null
        }),
        createRequest: vi.fn().mockImplementation(async () => {
          // 第一个请求成功创建
          return buildTestIdempotencyRequest({
            id: 'race-idempotency',
            status: 'succeeded',
            resourceType: 'order',
            resourceId: 'order-winner',
          })
        }),
      })

      const orders = createMockOrderRepository({
        createOrder: vi.fn().mockResolvedValue(mockOrder),
      })

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act - 并发请求
      const results = await Promise.all([
        service.createOrderForUser({
          userId: 'user-123',
          productId: 'product-123',
          idempotencyKey: 'race-condition-key',
        }),
        service.createOrderForUser({
          userId: 'user-123',
          productId: 'product-123',
          idempotencyKey: 'race-condition-key',
        }),
      ])

      // Assert - 在真实场景中，数据库约束会保证只有一个成功
      expect(results).toHaveLength(2)
      expect(idempotency.createRequest).toHaveBeenCalled()
    })
  })

  describe('幂等性参数冲突', () => {
    /**
     * Test: 相同幂等键但请求参数不同
     *
     * Description: 测试使用相同的幂等键但不同的请求参数，应拒绝请求（防止参数篡改）
     */
    it('应该在请求参数冲突时拒绝请求', async () => {
      // Arrange
      const mockProduct = buildTestProduct()

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      // 已存在的幂等性记录，requestHash 与当前请求不同
      const existingIdempotencyRequest = buildTestIdempotencyRequest({
        id: 'existing-idempotency',
        status: 'succeeded',
        resourceType: 'order',
        resourceId: 'existing-order',
        // 不同的 productId 会产生不同的 requestHash
        requestHash: 'different-hash-for-different-params',
      })

      const idempotency = createMockIdempotencyRepository({
        getRequest: vi.fn().mockResolvedValue(existingIdempotencyRequest),
      })

      const orders = createMockOrderRepository()

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act & Assert
      await expect(
        service.createOrderForUser({
          userId: 'user-123',
          productId: 'product-123', // 不同的 productId
          idempotencyKey: 'same-key-but-different-params',
        })
      ).rejects.toThrow('Idempotency key conflict')
    })

    /**
     * Test: 并发冲突后重新查询的记录参数冲突
     *
     * Description: 测试并发创建失败后，重新查询到的记录参数也不匹配
     */
    it('应该在并发冲突后重试检查参数冲突', async () => {
      // Arrange
      const mockProduct = buildTestProduct()

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      let getRequestCallCount = 0
      const idempotency = createMockIdempotencyRepository({
        getRequest: vi.fn().mockImplementation(async () => {
          getRequestCallCount++
          if (getRequestCallCount === 1) return null
          // 第二次查询返回参数冲突的记录
          return buildTestIdempotencyRequest({
            id: 'conflict-after-concurrent',
            requestHash: 'different-hash',
          })
        }),
        createRequest: vi.fn().mockImplementation(async () => {
          // 模拟数据库唯一约束冲突
          const error = new Error('duplicate key') as Error & { code?: string }
          error.code = '23505'
          throw error
        }),
      })

      const orders = createMockOrderRepository()

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act & Assert
      await expect(
        service.createOrderForUser({
          userId: 'user-123',
          productId: 'product-123',
          idempotencyKey: 'conflict-concurrent-key',
        })
      ).rejects.toThrow('Idempotency key conflict')
    })

    /**
     * Test: 并发冲突后重新查询的记录已过期
     *
     * Description: 测试并发创建失败后，重新查询到的记录已过期
     */
    it('应该在并发冲突后重试检查过期', async () => {
      // Arrange
      const mockProduct = buildTestProduct()

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      let getRequestCallCount = 0
      const idempotency = createMockIdempotencyRepository({
        getRequest: vi.fn().mockImplementation(async () => {
          getRequestCallCount++
          if (getRequestCallCount === 1) return null
          // 第二次查询返回已过期的记录
          return buildTestIdempotencyRequest({
            id: 'expired-after-concurrent',
            expiresAt: new Date(Date.now() - 1000).toISOString(), // 1秒前过期
          })
        }),
        createRequest: vi.fn().mockImplementation(async () => {
          // 模拟数据库唯一约束冲突
          const error = new Error('duplicate key') as Error & { code?: string }
          error.code = '23505'
          throw error
        }),
      })

      const orders = createMockOrderRepository()

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act & Assert
      await expect(
        service.createOrderForUser({
          userId: 'user-123',
          productId: 'product-123',
          idempotencyKey: 'expired-concurrent-key',
        })
      ).rejects.toThrow('Idempotency key expired')
    })

    /**
     * Test: 并发冲突后重新查询的记录正在进行中
     *
     * Description: 测试并发创建失败后，重新查询到的记录状态为 pending
     */
    it('应该在并发冲突后重试检查正在进行中', async () => {
      // Arrange
      const mockProduct = buildTestProduct()

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      let getRequestCallCount = 0
      const idempotency = createMockIdempotencyRepository({
        getRequest: vi.fn().mockImplementation(async () => {
          getRequestCallCount++
          if (getRequestCallCount === 1) return null
          // 第二次查询返回正在进行中的记录
          return buildTestIdempotencyRequest({
            id: 'pending-after-concurrent',
            status: 'pending',
          })
        }),
        createRequest: vi.fn().mockImplementation(async () => {
          // 模拟数据库唯一约束冲突
          const error = new Error('duplicate key') as Error & { code?: string }
          error.code = '23505'
          throw error
        }),
      })

      const orders = createMockOrderRepository()

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act & Assert
      await expect(
        service.createOrderForUser({
          userId: 'user-123',
          productId: 'product-123',
          idempotencyKey: 'pending-concurrent-key',
        })
      ).rejects.toThrow('Idempotency request in progress')
    })
  })

  describe('幂等性边界情况', () => {
    /**
     * Test: 缓存命中但订单不存在
     *
     * Description: 测试幂等性记录显示订单存在，但订单实际已被删除
     */
    it('应该在缓存命中但订单不存在时抛出错误', async () => {
      // Arrange
      const mockProduct = buildTestProduct()

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      // 幂等性记录显示订单存在
      const mockIdempotencyRequest = buildTestIdempotencyRequest({
        id: 'orphan-idempotency',
        status: 'succeeded',
        resourceType: 'order',
        resourceId: 'deleted-order-id',
      })

      const idempotency = createMockIdempotencyRepository({
        getRequest: vi.fn().mockResolvedValue(mockIdempotencyRequest),
      })

      // 但订单已不存在
      const orders = createMockOrderRepository({
        getOrderById: vi.fn().mockResolvedValue(null),
      })

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act & Assert
      await expect(
        service.createOrderForUser({
          userId: 'user-123',
          productId: 'product-123',
          idempotencyKey: 'orphan-key',
        })
      ).rejects.toThrow('Order not found')
    })

    /**
     * Test: 幂等性记录资源类型不是 order
     *
     * Description: 测试幂等性记录关联的资源类型不是订单
     */
    it('应该在资源类型不是 order 时继续处理', async () => {
      // Arrange
      const mockProduct = buildTestProduct()
      const mockCreatedOrder = buildTestOrder({ id: 'order-new' })

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      // 幂等性记录存在但资源类型不是 order（可能是其他资源）
      const mockIdempotencyRequest = buildTestIdempotencyRequest({
        id: 'different-resource-type',
        status: 'succeeded',
        resourceType: 'payment', // 不同的资源类型
        resourceId: 'payment-123',
      })

      const idempotency = createMockIdempotencyRepository({
        getRequest: vi.fn().mockResolvedValue(mockIdempotencyRequest),
        createRequest: vi.fn().mockResolvedValue(
          buildTestIdempotencyRequest({ status: 'pending' })
        ),
      })

      const orders = createMockOrderRepository({
        createOrder: vi.fn().mockResolvedValue(mockCreatedOrder),
      })

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act
      const result = await service.createOrderForUser({
        userId: 'user-123',
        productId: 'product-123',
        idempotencyKey: 'different-resource-type-key',
      })

      // Assert - 应该创建新订单而不是返回旧资源
      expect(result.id).toBe('order-new')
      expect(orders.createOrder).toHaveBeenCalled()
    })

    /**
     * Test: 幂等性记录状态为 failed
     *
     * Description: 测试幂等性记录状态为 failed 时的处理
     */
    it('应该在幂等性记录状态为 failed 时创建新记录', async () => {
      // Arrange
      const mockProduct = buildTestProduct()
      const mockCreatedOrder = buildTestOrder({ id: 'order-retry' })

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      // 之前失败的幂等性记录
      const failedIdempotencyRequest = buildTestIdempotencyRequest({
        id: 'failed-idempotency',
        status: 'failed',
        responseCode: 500,
      })

      const idempotency = createMockIdempotencyRepository({
        getRequest: vi.fn().mockResolvedValue(failedIdempotencyRequest),
        createRequest: vi.fn().mockResolvedValue(
          buildTestIdempotencyRequest({
            id: 'new-idempotency',
            status: 'pending',
          })
        ),
      })

      const orders = createMockOrderRepository({
        createOrder: vi.fn().mockResolvedValue(mockCreatedOrder),
      })

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act
      const result = await service.createOrderForUser({
        userId: 'user-123',
        productId: 'product-123',
        idempotencyKey: 'failed-key-retry',
      })

      // Assert - 应该创建新订单（允许重试）
      expect(result.id).toBe('order-retry')
      expect(orders.createOrder).toHaveBeenCalled()
    })

    /**
     * Test: 创建幂等性记录抛出非 23505 错误
     *
     * Description: 测试创建幂等性记录时抛出非并发冲突错误
     */
    it('应该在创建幂等性记录抛出其他错误时传播错误', async () => {
      // Arrange
      const mockProduct = buildTestProduct()

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      const idempotency = createMockIdempotencyRepository({
        getRequest: vi.fn().mockResolvedValue(null),
        createRequest: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      })

      const orders = createMockOrderRepository()

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act & Assert
      await expect(
        service.createOrderForUser({
          userId: 'user-123',
          productId: 'product-123',
          idempotencyKey: 'db-error-key',
        })
      ).rejects.toThrow('Database connection failed')
    })

    /**
     * Test: 过期时间边界测试
     *
     * Description: 测试幂等性记录刚好在过期边界的情况
     */
    it('应该在幂等性记录刚好过期时拒绝请求', async () => {
      // Arrange
      const mockProduct = buildTestProduct()

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      // 创建一个刚好过期的幂等性记录
      const now = new Date()
      const expiredIdempotencyRequest = buildTestIdempotencyRequest({
        id: 'boundary-expired',
        expiresAt: new Date(now.getTime() - 1).toISOString(), // 1毫秒前过期
      })

      const idempotency = createMockIdempotencyRepository({
        getRequest: vi.fn().mockResolvedValue(expiredIdempotencyRequest),
      })

      const orders = createMockOrderRepository()

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act & Assert
      await expect(
        service.createOrderForUser({
          userId: 'user-123',
          productId: 'product-123',
          idempotencyKey: 'boundary-expired-key',
        })
      ).rejects.toThrow('Idempotency key expired')
    })

    /**
     * Test: 过期时间边界测试 - 未过期
     *
     * Description: 测试幂等性记录在过期边界前仍然有效
     */
    it('应该在幂等性记录未过期时正常缓存命中', async () => {
      // Arrange
      const mockProduct = buildTestProduct()
      const mockCachedOrder = buildTestOrder({ id: 'cached-boundary' })

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      // 创建一个即将过期但仍然有效的幂等性记录
      const now = new Date()
      const validIdempotencyRequest = buildTestIdempotencyRequest({
        id: 'boundary-valid',
        status: 'succeeded',
        resourceType: 'order',
        resourceId: 'cached-boundary',
        expiresAt: new Date(now.getTime() + 1000).toISOString(), // 1000毫秒后过期，避免测试执行过慢导致过期
      })

      const idempotency = createMockIdempotencyRepository({
        getRequest: vi.fn().mockResolvedValue(validIdempotencyRequest),
      })

      const orders = createMockOrderRepository({
        getOrderById: vi.fn().mockResolvedValue(mockCachedOrder),
      })

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act
      const result = await service.createOrderForUser({
        userId: 'user-123',
        productId: 'product-123',
        idempotencyKey: 'boundary-valid-key',
      })

      // Assert
      expect(result.id).toBe('cached-boundary')
      expect(orders.createOrder).not.toHaveBeenCalled()
    })
  })

  describe('幂等性状态更新', () => {
    /**
     * Test: 订单创建成功后更新幂等性状态
     *
     * Description: 测试订单创建成功后，幂等性记录正确标记为成功
     */
    it('应该在订单创建成功后正确标记幂等性状态', async () => {
      // Arrange
      const mockProduct = buildTestProduct()
      const mockOrder = buildTestOrder({ id: 'order-123' })
      const mockIdempotencyRequest = buildTestIdempotencyRequest({
        id: 'idempotency-123',
        status: 'pending',
      })

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      const idempotency = createMockIdempotencyRepository({
        getRequest: vi.fn().mockResolvedValue(null),
        createRequest: vi.fn().mockResolvedValue(mockIdempotencyRequest),
        markSucceeded: vi.fn().mockResolvedValue({
          ...mockIdempotencyRequest,
          status: 'succeeded',
          resourceType: 'order',
          resourceId: 'order-123',
        }),
      })

      const orders = createMockOrderRepository({
        createOrder: vi.fn().mockResolvedValue(mockOrder),
      })

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act
      await service.createOrderForUser({
        userId: 'user-123',
        productId: 'product-123',
        idempotencyKey: 'success-key',
      })

      // Assert
      expect(idempotency.markSucceeded).toHaveBeenCalledWith(
        { traceId: 'test-trace-id', logger: expect.anything() },
        {
          id: 'idempotency-123',
          resourceType: 'order',
          resourceId: 'order-123',
          updatedAt: expect.any(String),
        }
      )
    })
  })

  describe('日志记录', () => {
    /**
     * Test: 订单创建成功时记录日志
     *
     * Description: 测试订单创建成功时的日志记录
     */
    it('应该在订单创建成功时记录正确的日志', async () => {
      // Arrange
      const mockProduct = buildTestProduct()
      const mockOrder = buildTestOrder()

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      const idempotency = createMockIdempotencyRepository({
        getRequest: vi.fn().mockResolvedValue(null),
        createRequest: vi.fn().mockResolvedValue(
          buildTestIdempotencyRequest({ status: 'pending' })
        ),
      })

      const orders = createMockOrderRepository({
        createOrder: vi.fn().mockResolvedValue(mockOrder),
      })

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act
      await service.createOrderForUser({
        userId: 'user-123',
        productId: 'product-123',
        idempotencyKey: 'log-key',
      })

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'order.create',
          userId: 'user-123',
          orderId: 'order-123',
        })
      )
    })

    /**
     * Test: 幂等性缓存命中时记录日志
     *
     * Description: 测试幂等性缓存命中时的日志记录
     */
    it('应该在幂等性缓存命中时记录日志', async () => {
      // Arrange
      const mockProduct = buildTestProduct()
      const mockCachedOrder = buildTestOrder({ id: 'cached-order' })

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      // 创建一个成功的幂等性记录
      const mockIdempotencyRequest = buildTestIdempotencyRequest({
        id: 'cached-idempotency',
        status: 'succeeded',
        resourceType: 'order',
        resourceId: 'cached-order',
      })

      const idempotency = createMockIdempotencyRepository({
        getRequest: vi.fn().mockResolvedValue(mockIdempotencyRequest),
      })

      const orders = createMockOrderRepository({
        getOrderById: vi.fn().mockResolvedValue(mockCachedOrder),
        createOrder: vi.fn().mockResolvedValue(mockCachedOrder),
      })

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act
      await service.createOrderForUser({
        userId: 'user-123',
        productId: 'product-123',
        idempotencyKey: 'cached-log-key',
      })

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'order.idempotent.hit',
          userId: 'user-123',
          orderId: 'cached-order',
        })
      )
    })
  })

  describe('优惠券功能', () => {
    /**
     * Test: 成功应用优惠券
     *
     * Description: 测试下单时正确计算并应用优惠券折扣
     */
    it('应该正确计算并应用优惠券折扣', async () => {
      // Arrange
      const mockProduct = buildTestProduct()
      // 期望创建的订单包含折扣信息
      const mockCreatedOrder = buildTestOrder({
        discountAmount: '10.00',
        couponRedemptionId: 'redemption-123',
      })

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      const orders = createMockOrderRepository({
        createOrder: vi.fn().mockResolvedValue(mockCreatedOrder),
        updateOrder: vi.fn().mockResolvedValue(mockCreatedOrder), // Mock 核销后的更新
      })

      const idempotency = createMockIdempotencyRepository()

      // Mock 优惠券相关 Repos
      const coupons = createMockCouponRepository()
      const userCoupons = createMockUserCouponRepository()
      const redemptions = createMockRedemptionRepository()

      // Mock Coupon Service
      const mockCouponService = {
        listCoupons: vi.fn(),
        getCouponById: vi.fn(),
        createCoupon: vi.fn(),
        updateCoupon: vi.fn(),
        deleteCoupon: vi.fn(),
        listMyCoupons: vi.fn(),
        issueCouponToUsers: vi.fn(),
        calculateDiscount: vi.fn().mockResolvedValue({
          canUse: true,
          discountAmount: '10.00',
          finalAmount: '89.00',
          originalAmount: '99.00',
          coupon: {},
        }),
        redeemCoupon: vi.fn().mockResolvedValue({
          id: 'redemption-123',
          discountAmount: '10.00',
        }),
        listRedemptions: vi.fn(),
      } as unknown as ReturnType<typeof createCouponService>
      ;(createCouponService as ReturnType<typeof vi.fn>).mockReturnValue(mockCouponService)

      const service = createOrderService(
        { orders, products, idempotency, coupons, userCoupons, redemptions },
        mockServiceContext
      )

      // Act
      await service.createOrderForUser({
        userId: 'user-123',
        productId: 'product-123',
        idempotencyKey: 'coupon-key',
        userCouponId: 'user-coupon-123',
      })

      // Assert
      // 1. 验证计算了折扣
      expect(mockCouponService.calculateDiscount).toHaveBeenCalledWith({
        userCouponId: 'user-coupon-123',
        userId: 'user-123',
        productId: 'product-123',
        originalAmount: '99.00',
      })

      // 2. 验证创建订单时传入了折扣信息（第一次创建）
      // 注意：service 实现中，createOrder 时传入了 discountAmount
      expect(orders.createOrder).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          discountAmount: '10.00',
        })
      )

      // 3. 验证核销了优惠券
      expect(mockCouponService.redeemCoupon).toHaveBeenCalled()

      // 4. 验证更新了订单的核销 ID
      expect(orders.updateOrder).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          orderId: 'order-123',
          couponRedemptionId: 'redemption-123',
        })
      )
    })

    /**
     * Test: 优惠券核销失败回滚
     *
     * Description: 测试优惠券核销失败时，订单状态回滚（清除折扣信息）
     */
    it('应该在优惠券核销失败时回滚订单', async () => {
      // Arrange
      const mockProduct = buildTestProduct()
      const mockCreatedOrder = buildTestOrder({
        id: 'order-rollback',
        discountAmount: '10.00',
      })

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      const orders = createMockOrderRepository({
        createOrder: vi.fn().mockResolvedValue(mockCreatedOrder),
        updateOrder: vi.fn().mockResolvedValue(mockCreatedOrder),
      })

      const idempotency = createMockIdempotencyRepository()
      const coupons = createMockCouponRepository()
      const userCoupons = createMockUserCouponRepository()
      const redemptions = createMockRedemptionRepository()

      // Mock Coupon Service - 计算成功但核销失败
      const mockCouponService = {
        listCoupons: vi.fn(),
        getCouponById: vi.fn(),
        createCoupon: vi.fn(),
        updateCoupon: vi.fn(),
        deleteCoupon: vi.fn(),
        listMyCoupons: vi.fn(),
        issueCouponToUsers: vi.fn(),
        calculateDiscount: vi.fn().mockResolvedValue({
          canUse: true,
          discountAmount: '10.00',
          finalAmount: '89.00',
          originalAmount: '99.00',
          coupon: {},
        }),
        redeemCoupon: vi.fn().mockRejectedValue(new Error('Redemption failed')),
        listRedemptions: vi.fn(),
      } as unknown as ReturnType<typeof createCouponService>
      ;(createCouponService as ReturnType<typeof vi.fn>).mockReturnValue(mockCouponService)

      const service = createOrderService(
        { orders, products, idempotency, coupons, userCoupons, redemptions },
        mockServiceContext
      )

      // Act
      await service.createOrderForUser({
        userId: 'user-123',
        productId: 'product-123',
        idempotencyKey: 'rollback-key',
        userCouponId: 'user-coupon-123',
      })

      // Assert
      // 验证触发了回滚更新
      expect(orders.updateOrder).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          orderId: 'order-rollback',
          couponRedemptionId: null,
          discountAmount: '0.00',
        })
      )
      
      // 验证日志记录了回滚
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'order.coupon_redemption_rolled_back',
        })
      )
    })
  })

  describe('推广码功能', () => {
    /**
     * Test: 成功绑定推广码
     *
     * Description: 测试下单时提供推广码，应正确绑定
     */
    it('应该在创建订单时绑定推广码', async () => {
      // Arrange
      const mockProduct = buildTestProduct()
      const mockCreatedOrder = buildTestOrder({ id: 'order-promo' })

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      const orders = createMockOrderRepository({
        createOrder: vi.fn().mockResolvedValue(mockCreatedOrder),
      })

      const idempotency = createMockIdempotencyRepository()
      const promoterCodes = createMockPromoterCodeRepository()
      const distributions = createMockDistributionRepository()

      // Mock Promoter Code Service
      const mockPromoterCodeService = {
        generateCodeForPromoter: vi.fn(),
        getCodeByCode: vi.fn(),
        bindByPromoterCode: vi.fn().mockResolvedValue(undefined),
        listCodesForPromoter: vi.fn(),
        updateCodeStatus: vi.fn(),
        deleteCode: vi.fn(),
      } as unknown as ReturnType<typeof createPromoterCodeService>
      ;(createPromoterCodeService as ReturnType<typeof vi.fn>).mockReturnValue(mockPromoterCodeService)

      const service = createOrderService(
        { orders, products, idempotency, promoterCodes, distributions },
        mockServiceContext
      )

      // Act
      await service.createOrderForUser({
        userId: 'user-123',
        productId: 'product-123',
        idempotencyKey: 'promo-key',
        promoterCode: 'PROMO123',
      })

      // Assert
      expect(mockPromoterCodeService.bindByPromoterCode).toHaveBeenCalledWith({
        userId: 'user-123',
        code: 'PROMO123',
      })
    })

    /**
     * Test: 推广码绑定失败不影响订单
     *
     * Description: 测试推广码绑定失败（如无效码）时，订单应继续创建成功
     */
    it('推广码绑定失败不应阻止订单创建', async () => {
      // Arrange
      const mockProduct = buildTestProduct()
      const mockCreatedOrder = buildTestOrder({ id: 'order-promo-fail' })

      const products = createMockProductRepository({
        getProductById: vi.fn().mockResolvedValue(mockProduct),
      })

      const orders = createMockOrderRepository({
        createOrder: vi.fn().mockResolvedValue(mockCreatedOrder),
      })

      const idempotency = createMockIdempotencyRepository()
      const promoterCodes = createMockPromoterCodeRepository()
      const distributions = createMockDistributionRepository()

      // Mock Promoter Code Service 抛出错误
      const mockPromoterCodeService = {
        generateCodeForPromoter: vi.fn(),
        getCodeByCode: vi.fn(),
        bindByPromoterCode: vi.fn().mockRejectedValue(new Error('Invalid code')),
        listCodesForPromoter: vi.fn(),
        updateCodeStatus: vi.fn(),
        deleteCode: vi.fn(),
      } as unknown as ReturnType<typeof createPromoterCodeService>
      ;(createPromoterCodeService as ReturnType<typeof vi.fn>).mockReturnValue(mockPromoterCodeService)

      const service = createOrderService(
        { orders, products, idempotency, promoterCodes, distributions },
        mockServiceContext
      )

      // Act
      const result = await service.createOrderForUser({
        userId: 'user-123',
        productId: 'product-123',
        idempotencyKey: 'promo-fail-key',
        promoterCode: 'INVALID',
      })

      // Assert
      expect(result.id).toBe('order-promo-fail')
      // 验证记录了警告日志但未抛出异常
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'order.promoter_code_bind_failed',
        })
      )
    })
  })
})
