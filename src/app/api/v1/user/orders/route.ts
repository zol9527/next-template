import type { NextRequest } from 'next/server'
import { ok, fail } from '@/contracts/api-response.schema'
import { CreateOrderRequestSchema, type CreateOrderResponse, ListOrdersQuerySchema, type ListOrdersResponse } from '@/plugins/ecommerce/contracts/orders.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { extractIdempotencyKeyFromRequest } from '@/lib/http'
import { createOrderRepository, createProductRepository, createIdempotencyRepository, createPromoterCodeRepository, createDistributionRepository, createCouponRepository, createUserCouponRepository, createCouponRedemptionRepository } from '@/repositories/factory'
import { createOrderService } from '@/plugins/ecommerce/services/order.service'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

/**
 * Route: POST /api/v1/user/orders
 *
 * Description: 为当前登录用户创建订单，支持幂等性控制、优惠券应用、推广码绑定等业务逻辑
 *
 * 业务流程：
 * 1. 身份验证：从请求中提取并验证用户身份（JWT/Session）
 * 2. 幂等性验证：从请求头提取 Idempotency-Key，强制要求以防止重复下单
 * 3. 依赖注入：通过工厂模式并行创建所需的 Repository 实例（订单/商品/幂等性/优惠券/推广码等）
 * 4. 服务编排：创建 OrderService 实例并注入所有依赖
 * 5. 订单创建：调用 createOrderForUser 执行完整的下单业务逻辑
 *    - 商品存在性及状态验证
 *    - 幂等性检查（缓存命中/过期/冲突处理）
 *    - 优惠券折扣计算与核销
 *    - 订单记录创建
 *    - 推广码绑定
 * 6. 响应返回：返回创建成功的订单对象
 *
 * 安全与幂等性保证：
 * - 必须提供 Idempotency-Key 请求头（客户端生成的唯一标识）
 * - 24 小时内相同的 Idempotency-Key + 请求参数会直接返回缓存的订单
 * - 请求参数变更会返回 IDEMPOTENCY_CONFLICT 错误
 * - 并发相同请求会返回 CONFLICT 错误
 *
 * HTTP Headers:
 *   Idempotency-Key (required): 客户端生成的幂等性键（建议使用 UUID v4）
 *
 * Request Body:
 *   productId (string): 商品 ID
 *   promoterCode (string, optional): 推广码
 *   userCouponId (string, optional): 用户优惠券 ID
 *
 * Response:
 *   200: 订单创建成功或返回缓存的订单
 *   400: 缺少 Idempotency-Key
 *   401: 未授权（用户未登录）
 */
export const POST = withV1Route({
  pluginGuard: 'ecommerce',
  requireAuth: true,
  action: 'orders:create',
  schemas: { body: CreateOrderRequestSchema },
  handler: async ({ req, body, serviceContext, userId }) => {

    // 使用幂等性键防止重复下单: 使用 request 中提取 Idempotency-Key
    const idempotencyKey = extractIdempotencyKeyFromRequest(req)
    if (!idempotencyKey) {
      return createJsonApiResponse(req, fail('INVALID_INPUT', 'Idempotency-Key required'), { status: 400 })
    }

    // 并行创建所需的 Repository 实例
    const [orders, products, idempotency, promoterCodes, distributions, coupons, userCoupons, redemptions] = await Promise.all([
      createOrderRepository(),
      createProductRepository(),
      createIdempotencyRepository(),
      createPromoterCodeRepository(),
      createDistributionRepository(),
      createCouponRepository(),
      createUserCouponRepository(),
      createCouponRedemptionRepository(),
    ])

    // 创建 OrderService 实例
    const service = createOrderService({
      orders,
      products,
      idempotency,
      promoterCodes,
      distributions,
      coupons,
      userCoupons,
      redemptions,
    }, serviceContext)

    // 调用服务方法创建订单
    // body 由 withV1Route 根据 schemas.body 校验并解析，保证存在
    const order = await service.createOrderForUser({
      userId,
      productId: body!.productId,
      idempotencyKey,
      promoterCode: body!.promoterCode,
      userCouponId: body!.userCouponId,
    })
    const payload: CreateOrderResponse = { order }

    return createJsonApiResponse(req, ok(payload))
  },
})

export const GET = withV1Route({
  pluginGuard: 'ecommerce',
  requireAuth: true,
  action: 'orders:list',
  schemas: { query: ListOrdersQuerySchema },
  handler: async ({ req, serviceContext, userId, query }) => {

    const [orders, products] = await Promise.all([
      createOrderRepository(),
      createProductRepository(),
    ])

    const service = createOrderService({
      orders,
      products,
    }, serviceContext)

    const result = await service.listOrdersForUser({
      userId,
      limit: query.limit,
      cursor: query.cursor ?? null,
      status: query.status,
      orderNo: query.orderNo,
    })

    const payload: ListOrdersResponse = { orders: result.orders, nextCursor: result.nextCursor }

    return createJsonApiResponse(req, ok(payload))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
