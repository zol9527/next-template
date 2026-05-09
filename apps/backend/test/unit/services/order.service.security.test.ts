/**
 * Security Unit: Order Service Security
 *
 * Description: Verifies security enhancements and vulnerability fixes in OrderService.
 * Focus: DoS via Inventory Holding (Order Expiration Bypass).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createOrderService } from '@/plugins/ecommerce/services/order.service'
import type { OrderRepository } from '@/repositories/interfaces/order.interface'
import type { ProductRepository } from '@/repositories/interfaces/product.interface'
import type { IdempotencyRepository } from '@/repositories/interfaces/idempotency.interface'
import type { Order } from '@/contracts/dtos/orders.dto'
import type { AdminProduct } from '@/contracts/dtos/admin/products.dto'
import type pino from 'pino'

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

function buildTestProduct(): AdminProduct {
  return {
    id: 'product-123',
    name: 'Test Product',
    slug: 'test-product',
    summary: 'Summary',
    description: 'Description',
    kind: 'course',
    status: 'published',
    price: { amount: '100.00', currencyCode: 'CNY' },
    originalPrice: { amount: '100.00', currencyCode: 'CNY' },
    stockQuantity: 100,
    isFeatured: false,
    tags: [],
    categoryIds: [],
    coverAssetId: null,
    mediaAssetIds: [],
    extensions: null,
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    deletedAt: null,
  }
}

function buildTestOrder(overrides?: Partial<Order>): Order {
  return {
    id: 'order-123',
    orderNo: 'ORD-123',
    userId: 'user-123',
    productId: 'product-123',
    priceAmount: '100.00',
    currencyCode: 'CNY',
    status: 'pending_payment',
    couponRedemptionId: null,
    discountAmount: '0.00',
    fulfillmentStatus: null,
    paidAmount: null,
    refundedAmount: '0.00',
    paidAt: null,
    completedAt: null,
    closedAt: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function createMockProductRepository(): ProductRepository {
  return {
    getProductById: vi.fn().mockResolvedValue(buildTestProduct()),
    listProducts: vi.fn(),
    listProductsByIds: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    setProductStatus: vi.fn(),
    deleteProduct: vi.fn(),
    isProductReferenced: vi.fn(),
    setProductCategories: vi.fn(),
    listProductCategoryIds: vi.fn(),
    listCategoriesForProducts: vi.fn(),
    setProductMediaAttachments: vi.fn(),
    listProductMediaAttachments: vi.fn(),
    listAttachmentsForProducts: vi.fn(),
    getGlobalStats: vi.fn(),
  }
}

function createMockOrderRepository(overrides?: Partial<OrderRepository>): OrderRepository {
  return {
    getOrderById: overrides?.getOrderById ?? vi.fn(),
    createOrder: overrides?.createOrder ?? vi.fn(),
    updateOrder: overrides?.updateOrder ?? vi.fn(),
    updateOrderStatus: overrides?.updateOrderStatus ?? vi.fn(),
    listOrders: overrides?.listOrders ?? vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    countOrdersByStatus: overrides?.countOrdersByStatus ?? vi.fn(),
    getOrderByOrderNo: overrides?.getOrderByOrderNo ?? vi.fn(),
    listAdminOrders: overrides?.listAdminOrders ?? vi.fn(),
    getDashboardStats: overrides?.getDashboardStats ?? vi.fn(),
  }
}

function createMockIdempotencyRepository(): IdempotencyRepository {
  return {
    getRequest: vi.fn(),
    createRequest: vi.fn(),
    markSucceeded: vi.fn(),
    markFailed: vi.fn(),
  }
}

// ==================== Test Suites ====================

describe('Order Service Security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('DoS Prevention: Order Expiration Bypass', () => {
    /**
     * Test: Should fetch expired orders using cursor filter
     *
     * Vulnerability: If `listOrders` is called with `cursor: null`, it fetches the newest orders.
     * Attackers can flood the system with new pending orders, pushing expired orders out of the limit (e.g., 100).
     * This prevents inventory from being released (DoS).
     *
     * Fix: `listOrders` should be called with `cursor: cutoffIso`.
     * This uses the repository's `lt` (less than) filter to fetch ONLY orders created before the cutoff.
     */
    it('should query expired orders using cutoff timestamp as cursor', async () => {
      // Arrange
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      const timeoutMinutes = 30
      const timeoutMs = timeoutMinutes * 60 * 1000
      const cutoffIso = new Date(now.getTime() - timeoutMs).toISOString()

      // Create some mock expired orders
      const expiredOrder1 = buildTestOrder({
        id: 'expired-1',
        createdAt: new Date(now.getTime() - timeoutMs - 1000).toISOString(), // 1s before cutoff
      })
      const expiredOrder2 = buildTestOrder({
        id: 'expired-2',
        createdAt: new Date(now.getTime() - timeoutMs - 2000).toISOString(), // 2s before cutoff
      })

      const orders = createMockOrderRepository({
        listOrders: vi.fn().mockResolvedValue({
          items: [expiredOrder1, expiredOrder2],
          nextCursor: null,
        }),
        updateOrderStatus: vi.fn().mockResolvedValue(buildTestOrder()),
      })
      const products = createMockProductRepository()
      const idempotency = createMockIdempotencyRepository()

      const service = createOrderService(
        { orders, products, idempotency },
        mockServiceContext
      )

      // Act
      await service.cancelExpiredOrders({ timeoutMinutes })

      // Assert
      // 1. Verify listOrders is called with correct cursor (cutoffIso)
      expect(orders.listOrders).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          limit: 100,
          cursor: cutoffIso, // IMPORTANT: Must filter by cutoff!
          status: 'pending_payment',
        })
      )

      // 2. Verify expired orders are cancelled
      expect(orders.updateOrderStatus).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          orderId: 'expired-1',
          status: 'cancelled',
        })
      )
      expect(orders.updateOrderStatus).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          orderId: 'expired-2',
          status: 'cancelled',
        })
      )

      vi.useRealTimers()
    })
  })
})
