/**
 * My Coupons DTO
 *
 * @module contracts/dtos/my-coupons
 * @description 小程序端 - 我的优惠券相关 DTO
 */

import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { UserCouponSchema, UserCouponStatusSchema } from './coupons.dto'

extendZodWithOpenApi(z)

// ==================== 我的优惠券列表 ====================

// 查询参数
export const MyCouponsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(20).openapi({ description: '分页大小' }),
    cursor: z.string().nullable().optional().openapi({ description: '分页游标' }),
    status: UserCouponStatusSchema.optional().openapi({ description: '状态筛选' }),
  })
  .openapi({ description: '我的优惠券查询参数' })

export type MyCouponsQuery = z.infer<typeof MyCouponsQuerySchema>

// 响应
export const MyCouponsResponseSchema = z
  .object({
    items: z.array(UserCouponSchema).openapi({ description: '用户优惠券列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标' }),
  })
  .openapi({ description: '我的优惠券列表响应' })

export type MyCouponsResponse = z.infer<typeof MyCouponsResponseSchema>

// ==================== 可用优惠券查询（下单时） ====================

// 查询参数
export const AvailableCouponsQuerySchema = z
  .object({
    productId: z.string().uuid().openapi({ description: '商品 ID' }),
    orderAmount: z.string().openapi({ description: '订单金额（decimal 字符串）' }),
  })
  .openapi({ description: '可用优惠券查询参数' })

export type AvailableCouponsQuery = z.infer<typeof AvailableCouponsQuerySchema>

// 单个可用优惠券项（包含折扣计算结果）
export const AvailableCouponItemSchema = z
  .object({
    userCoupon: UserCouponSchema.openapi({ description: '用户优惠券信息' }),
    discountAmount: z.string().openapi({ description: '折扣金额' }),
    finalAmount: z.string().openapi({ description: '使用该优惠券后的最终金额' }),
  })
  .openapi({ description: '可用优惠券项（含折扣计算结果）' })

export type AvailableCouponItem = z.infer<typeof AvailableCouponItemSchema>

// 响应
export const AvailableCouponsResponseSchema = z
  .object({
    items: z.array(AvailableCouponItemSchema).openapi({ description: '可用优惠券列表' }),
    originalAmount: z.string().openapi({ description: '订单原价' }),
  })
  .openapi({ description: '可用优惠券列表响应' })

export type AvailableCouponsResponse = z.infer<typeof AvailableCouponsResponseSchema>

// ==================== 计算优惠券折扣 ====================

// 请求
export const CalculateDiscountRequestSchema = z
  .object({
    userCouponId: z.string().uuid().openapi({ description: '用户优惠券 ID' }),
    productId: z.string().uuid().openapi({ description: '商品 ID' }),
    originalAmount: z.string().openapi({ description: '订单原价（decimal 字符串）' }),
  })
  .openapi({ description: '计算优惠券折扣请求' })

export type CalculateDiscountRequest = z.infer<typeof CalculateDiscountRequestSchema>

// 响应
export const CalculateDiscountResponseSchema = z
  .object({
    canUse: z.boolean().openapi({ description: '是否可以使用' }),
    reason: z.string().optional().openapi({ description: '不可使用的原因' }),
    originalAmount: z.string().openapi({ description: '原价' }),
    discountAmount: z.string().openapi({ description: '折扣金额' }),
    finalAmount: z.string().openapi({ description: '最终金额' }),
    coupon: UserCouponSchema.openapi({ description: '优惠券信息' }),
  })
  .openapi({ description: '计算优惠券折扣响应' })

export type CalculateDiscountResponse = z.infer<typeof CalculateDiscountResponseSchema>
