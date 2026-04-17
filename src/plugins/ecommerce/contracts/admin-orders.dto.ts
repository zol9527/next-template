import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { OrderStatusSchema } from '@/plugins/ecommerce/contracts/orders.dto'
import { AdminProductKindSchema, MoneySchema } from '@/plugins/ecommerce/contracts/admin-products.dto'
import { AdminCommissionStatusSchema } from '@/plugins/promotion/contracts/commissions.dto'

extendZodWithOpenApi(z)

export const AdminOrderSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '订单 ID' }),
    orderNo: z.string().min(1).openapi({ description: '商户订单号（业务订单号）' }),
    userId: z.string().uuid().openapi({ description: '下单用户 ID' }),
    userUsername: z.string().nullable().openapi({ description: '下单用户名称' }),
    userPhone: z.string().nullable().openapi({ description: '下单用户手机号' }),
    productId: z.string().uuid().openapi({ description: '商品 ID' }),
    productName: z.string().nullable().openapi({ description: '商品名称' }),
    priceAmount: z.string().openapi({ description: '应付金额（decimal 字符串）' }),
    currencyCode: z.string().openapi({ description: '币种（默认 CNY）' }),
    paidAmount: z.string().nullable().openapi({ description: '已支付金额（decimal 字符串，可为空）' }),
    refundedAmount: z.string().openapi({ description: '已退款金额（decimal 字符串）' }),
    status: OrderStatusSchema.openapi({ description: '订单状态' }),
    createdAt: z.string().openapi({ description: '创建时间 ISO' }),
    paidAt: z.string().nullable().openapi({ description: '支付确认时间 ISO（可为空）' }),
    completedAt: z.string().nullable().openapi({ description: '完成时间 ISO（可为空）' }),
    closedAt: z.string().nullable().openapi({ description: '关闭时间 ISO（可为空）' }),
    updatedAt: z.string().openapi({ description: '更新时间 ISO' }),
  })
  .openapi({ description: '后台订单' })

export type AdminOrder = z.infer<typeof AdminOrderSchema>

export const AdminOrderListResponseSchema = z
  .object({
    items: z.array(AdminOrderSchema).openapi({ description: '订单列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标' }),
    totalCount: z.number().openapi({ description: '总记录数' }),
  })
  .openapi({ description: '后台订单列表响应' })

export type AdminOrderListResponse = z.infer<typeof AdminOrderListResponseSchema>

export const AdminOrderListQuerySchema = z
  .object({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(50)
      .openapi({ description: '分页大小（默认 50，最大 50）' }),
    cursor: z.string().nullable().optional().openapi({ description: '分页游标（可选）' }),
    orderNo: z.string().min(1).nullable().optional().openapi({ description: '按商户订单号过滤（可选）' }),
    userUsername: z.string().min(1).nullable().optional().openapi({ description: '按用户名称过滤（可选）' }),
    userPhone: z.string().min(1).nullable().optional().openapi({ description: '按用户手机号过滤（可选）' }),
    orderId: z.string().uuid().nullable().optional().openapi({ description: '按订单 ID 精确匹配（可选）' }),
  })
  .openapi({ description: '后台订单列表查询参数' })

export type AdminOrderListQuery = z.infer<typeof AdminOrderListQuerySchema>

// ==================== 订单详情相关 Schema ====================

/**
 * Function: AdminOrderDetailProductSchema
 *
 * Description: 订单详情中的商品信息 Schema
 *
 * Returns:
 *   schema(ZodSchema): Zod 对象 Schema
 */
export const AdminOrderDetailProductSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '商品 ID' }),
    name: z.string().openapi({ description: '商品名称' }),
    coverUrl: z.string().nullable().openapi({ description: '商品封面图片 URL' }),
    price: MoneySchema.openapi({ description: '商品价格' }),
    originalPrice: MoneySchema.nullable().openapi({ description: '商品原价（划线价）' }),
    kind: AdminProductKindSchema.openapi({ description: '商品类型' }),
  })
  .openapi({ description: '订单详情商品信息' })

export type AdminOrderDetailProduct = z.infer<typeof AdminOrderDetailProductSchema>

/**
 * Function: AdminOrderDetailCouponSchema
 *
 * Description: 订单详情中的优惠券信息 Schema
 *
 * Returns:
 *   schema(ZodSchema): Zod 对象 Schema
 */
export const AdminOrderDetailCouponSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '优惠券 ID' }),
    name: z.string().openapi({ description: '优惠券名称' }),
    type: z.enum(['discount', 'fixed_amount', 'threshold', 'gift']).openapi({ description: '优惠券类型' }),
    discountAmount: z.string().openapi({ description: '折扣金额' }),
  })
  .openapi({ description: '订单详情优惠券信息' })

export type AdminOrderDetailCoupon = z.infer<typeof AdminOrderDetailCouponSchema>

/**
 * Function: AdminOrderDetailPromoterSchema
 *
 * Description: 订单详情中的推广人信息 Schema
 *
 * Returns:
 *   schema(ZodSchema): Zod 对象 Schema
 */
export const AdminOrderDetailPromoterSchema = z
  .object({
    userId: z.string().uuid().openapi({ description: '推广人用户 ID' }),
    username: z.string().nullable().openapi({ description: '推广人用户名' }),
    level: z.number().int().openapi({ description: '推广人等级' }),
    commission: z
      .object({
        amount: z.string().openapi({ description: '佣金金额' }),
        status: AdminCommissionStatusSchema.openapi({ description: '佣金状态' }),
      })
      .nullable()
      .openapi({ description: '佣金信息（如果已生成）' }),
  })
  .openapi({ description: '订单详情推广人信息' })

export type AdminOrderDetailPromoter = z.infer<typeof AdminOrderDetailPromoterSchema>

/**
 * Function: AdminOrderDetailSchema
 *
 * Description: 订单详情完整信息 Schema
 *
 * Returns:
 *   schema(ZodSchema): Zod 对象 Schema
 */
export const AdminOrderDetailSchema = z
  .object({
    order: AdminOrderSchema.openapi({ description: '订单基础信息' }),
    product: AdminOrderDetailProductSchema.nullable().openapi({ description: '商品信息' }),
    coupon: AdminOrderDetailCouponSchema.nullable().openapi({ description: '优惠券信息' }),
    promoter: AdminOrderDetailPromoterSchema.nullable().openapi({ description: '推广人信息' }),
  })
  .openapi({ description: '订单详情完整信息' })

export type AdminOrderDetail = z.infer<typeof AdminOrderDetailSchema>

export const AdminOrderDetailResponseSchema = z
  .object({
    detail: AdminOrderDetailSchema.openapi({ description: '订单详情' }),
  })
  .openapi({ description: '订单详情响应' })

export type AdminOrderDetailResponse = z.infer<typeof AdminOrderDetailResponseSchema>

export const AdminCompleteOrderResponseSchema = z
  .object({
    order: AdminOrderSchema.openapi({ description: '更新后的订单' }),
  })
  .openapi({ description: '后台确认订单完成响应' })

export type AdminCompleteOrderResponse = z.infer<typeof AdminCompleteOrderResponseSchema>

export const AdminRefundOrderRequestSchema = z
  .object({
    refundAmount: z.string().openapi({ description: '退款金额（decimal 字符串）' }),
    reason: z.string().optional().openapi({ description: '退款原因' }),
    refundIntentId: z.string().uuid().optional().openapi({ description: '退款意图 ID（幂等键，建议传 UUID）' }),
    actionToken: z.string().min(1).openapi({ description: 'MFA action token for refund' }),
  })
  .openapi({ description: '后台订单退款请求' })

export type AdminRefundOrderRequest = z.infer<typeof AdminRefundOrderRequestSchema>

export const AdminRefundOrderResponseSchema = z
  .object({
    order: AdminOrderSchema.openapi({ description: '更新后的订单' }),
  })
  .openapi({ description: '后台订单退款响应' })

export type AdminRefundOrderResponse = z.infer<typeof AdminRefundOrderResponseSchema>
