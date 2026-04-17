import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { CouponRedemptionSchema } from './coupons.dto'

extendZodWithOpenApi(z)

export const OrderStatusSchema = z
  .enum(['pending_payment', 'paid', 'cancelled', 'closed', 'refunding', 'refunded', 'completed'])
  .openapi({ description: '订单状态' })

export type OrderStatus = z.infer<typeof OrderStatusSchema>

export const FulfillmentStatusSchema = z
  .enum(['pending', 'processing', 'retrying', 'succeeded', 'manual_required'])
  .openapi({ description: '订单履约状态' })

export type FulfillmentStatus = z.infer<typeof FulfillmentStatusSchema>

export const FulfillmentStatusMapping = {
  pending: 'pending',
  processing: 'processing',
  retrying: 'retrying',
  succeeded: 'succeeded',
  manual_required: 'manual_required',
} as const satisfies Record<FulfillmentStatus, FulfillmentStatus>

export const OrderSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '订单 ID' }),
    orderNo: z.string().min(1).openapi({ description: '商户订单号（业务订单号）' }),
    userId: z.string().uuid().openapi({ description: '下单用户 ID' }),
    productId: z.string().uuid().openapi({ description: '商品 ID' }),
    priceAmount: z.string().openapi({ description: '应付金额（decimal 字符串）' }),
    currencyCode: z.string().openapi({ description: '币种（默认 CNY）' }),
    paidAmount: z.string().nullable().openapi({ description: '已支付金额（decimal 字符串，可为空）' }),
    refundedAmount: z.string().openapi({ description: '已退款金额（decimal 字符串）' }),
    status: OrderStatusSchema.openapi({ description: '订单状态' }),
    fulfillmentStatus: FulfillmentStatusSchema.nullable().openapi({ description: '履约状态（可为空）' }),

    // 优惠券相关字段
    couponRedemptionId: z.string().uuid().nullable().optional().openapi({ description: '优惠券核销记录 ID（可为空）' }),
    discountAmount: z.string().nullable().optional().openapi({ description: '优惠券折扣金额（decimal 字符串，可为空）' }),

    createdAt: z.string().openapi({ description: '创建时间 ISO' }),
    paidAt: z.string().nullable().openapi({ description: '支付确认时间 ISO（可为空）' }),
    completedAt: z.string().nullable().openapi({ description: '完成时间 ISO（可为空）' }),
    closedAt: z.string().nullable().openapi({ description: '关闭时间 ISO（可为空）' }),
    updatedAt: z.string().openapi({ description: '更新时间 ISO' }),

    // 关联的优惠券核销记录（可选）
    couponRedemption: CouponRedemptionSchema.nullable().optional().openapi({ description: '优惠券核销记录（可选）' }),
  })
  .openapi({ description: '订单详情' })

export type Order = z.infer<typeof OrderSchema>

export const OrderListProductSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '商品 ID' }),
    name: z.string().openapi({ description: '商品名称' }),
    summary: z.string().nullable().openapi({ description: '商品简介' }),
  })
  .openapi({ description: '订单列表商品摘要' })

export type OrderListProduct = z.infer<typeof OrderListProductSchema>

export const OrderListItemSchema = OrderSchema
  .extend({
    product: OrderListProductSchema.nullable().openapi({ description: '商品摘要（可为空）' }),
  })
  .openapi({ description: '订单列表项' })

export type OrderListItem = z.infer<typeof OrderListItemSchema>

export const CreateOrderRequestSchema = z
  .object({
    productId: z.string().uuid().openapi({ description: '商品 ID' }),
    promoterCode: z.string().optional().openapi({ description: '推广员推广码（可选）' }),
    userCouponId: z.string().uuid().optional().openapi({ description: '用户优惠券 ID（可选，用于使用优惠券）' }),
  })
  .openapi({ description: '创建订单请求' })

export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>

export const CreateOrderResponseSchema = z
  .object({
    order: OrderSchema.openapi({ description: '创建后的订单' }),
  })
  .openapi({ description: '创建订单响应' })

export type CreateOrderResponse = z.infer<typeof CreateOrderResponseSchema>

export const OrderDetailResponseSchema = z
  .object({
    order: OrderSchema.openapi({ description: '订单详情' }),
  })
  .openapi({ description: '订单详情响应' })

export type OrderDetailResponse = z.infer<typeof OrderDetailResponseSchema>

export const ListOrdersQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(20).openapi({ description: '分页大小' }),
    cursor: z.string().nullable().optional().openapi({ description: '分页游标' }),
    status: OrderStatusSchema.optional().openapi({ description: '订单状态筛选' }),
    orderNo: z.string().optional().openapi({ description: '订单号搜索（支持模糊匹配）' }),
  })
  .openapi({ description: '订单列表查询参数' })

export type ListOrdersQuery = z.infer<typeof ListOrdersQuerySchema>

export const ListOrdersResponseSchema = z
  .object({
    orders: z.array(OrderListItemSchema).openapi({ description: '订单列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标' }),
  })
  .openapi({ description: '订单列表响应' })

export type ListOrdersResponse = z.infer<typeof ListOrdersResponseSchema>

export const OrderStatsResponseSchema = z
  .object({
    pendingCount: z.number().int().min(0).openapi({ description: '待支付订单数量' }),
    paidCount: z.number().int().min(0).openapi({ description: '已支付订单数量' }),
    completedCount: z.number().int().min(0).openapi({ description: '已完成订单数量' }),
  })
  .openapi({ description: '用户订单统计响应' })

export type OrderStatsResponse = z.infer<typeof OrderStatsResponseSchema>

export const CancelExpiredOrdersResponseSchema = z
  .object({
    cancelled: z.number().openapi({ description: '取消的订单数量' }),
  })
  .openapi({ description: '取消过期订单响应' })

export type CancelExpiredOrdersResponse = z.infer<typeof CancelExpiredOrdersResponseSchema>
