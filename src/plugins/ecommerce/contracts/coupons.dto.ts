import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// ==================== 优惠券类型和状态 ====================

export const CouponTypeSchema = z
  .enum(['discount', 'fixed_amount', 'threshold', 'gift'])
  .openapi({ description: '优惠券类型：discount=折扣券, fixed_amount=固定金额券, threshold=满减券, gift=赠品券' })

export type CouponType = z.infer<typeof CouponTypeSchema>

export const CouponStatusSchema = z
  .enum(['draft', 'scheduled', 'active', 'paused', 'expired', 'disabled'])
  .openapi({ description: '优惠券状态：draft=草稿, scheduled=待生效, active=生效中, paused=已暂停, expired=已过期, disabled=已禁用' })

export type CouponStatus = z.infer<typeof CouponStatusSchema>

export const UserCouponStatusSchema = z
  .enum(['available', 'used', 'expired'])
  .openapi({ description: '用户优惠券状态：available=可用, used=已使用, expired=已过期' })

export type UserCouponStatus = z.infer<typeof UserCouponStatusSchema>

// ==================== 优惠券 DTO ====================

export const CouponSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '优惠券 ID' }),
    name: z.string().min(1).openapi({ description: '优惠券名称' }),
    description: z.string().nullable().optional().openapi({ description: '优惠券描述' }),
    type: CouponTypeSchema.openapi({ description: '优惠券类型' }),
    status: CouponStatusSchema.openapi({ description: '优惠券状态' }),

    // 折扣信息（根据 type 不同使用不同字段）
    discountPercent: z.string().nullable().optional().openapi({ description: '折扣百分比（如 85 表示 85 折），仅 discount 类型' }),
    discountAmount: z.string().nullable().optional().openapi({ description: '固定折扣金额，仅 fixed_amount 类型' }),
    thresholdAmount: z.string().nullable().optional().openapi({ description: '满减门槛金额，仅 threshold 类型' }),
    thresholdDiscount: z.string().nullable().optional().openapi({ description: '满减优惠金额，仅 threshold 类型' }),
    giftProductId: z.string().uuid().nullable().optional().openapi({ description: '赠品商品 ID，仅 gift 类型' }),

    // 使用限制
    minOrderAmount: z.string().nullable().optional().openapi({ description: '最低订单金额（decimal 字符串）' }),
    maxDiscountAmount: z.string().nullable().optional().openapi({ description: '最大折扣金额（decimal 字符串）' }),
    perUserLimit: z.number().int().nullable().optional().openapi({ description: '每用户限领数量' }),
    usageLimit: z.number().int().nullable().optional().openapi({ description: '总使用次数限制' }),
    usedCount: z.number().int().openapi({ description: '已使用次数' }),

    // 适用范围
    applicableProductIds: z.string().openapi({ description: '适用商品 ID 列表（JSON 数组字符串）' }),
    applicableCategoryIds: z.string().openapi({ description: '适用分类 ID 列表（JSON 数组字符串）' }),

    // 有效期
    validFrom: z.string().openapi({ description: '有效期开始时间 ISO' }),
    validTo: z.string().openapi({ description: '有效期结束时间 ISO' }),

    // 审计字段
    createdBy: z.string().uuid().nullable().optional().openapi({ description: '创建者 ID' }),
    updatedBy: z.string().uuid().nullable().optional().openapi({ description: '更新者 ID' }),
    createdAt: z.string().openapi({ description: '创建时间 ISO' }),
    updatedAt: z.string().openapi({ description: '更新时间 ISO' }),
  })
  .openapi({ description: '优惠券 DTO' })

export type Coupon = z.infer<typeof CouponSchema>

// ==================== 用户优惠券 DTO ====================

export const UserCouponSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '用户优惠券 ID' }),
    couponId: z.string().uuid().openapi({ description: '优惠券模板 ID' }),
    userId: z.string().uuid().openapi({ description: '用户 ID' }),
    status: UserCouponStatusSchema.openapi({ description: '状态' }),

    // 使用记录
    usedAt: z.string().nullable().optional().openapi({ description: '使用时间 ISO（可为空）' }),
    redemptionId: z.string().uuid().nullable().optional().openapi({ description: '核销记录 ID（可为空）' }),

    // 过期时间
    expiresAt: z.string().openapi({ description: '过期时间 ISO' }),

    // 审计字段
    issuedBy: z.string().uuid().nullable().optional().openapi({ description: '发放者 ID（可为空）' }),
    issuedAt: z.string().openapi({ description: '发放时间 ISO' }),
    createdAt: z.string().openapi({ description: '创建时间 ISO' }),
    updatedAt: z.string().openapi({ description: '更新时间 ISO' }),

    // 关联的优惠券信息（用于查询时包含）
    coupon: CouponSchema.optional().openapi({ description: '关联的优惠券模板（可选）' }),
  })
  .openapi({ description: '用户优惠券 DTO' })

export type UserCoupon = z.infer<typeof UserCouponSchema>

// ==================== 优惠券核销记录 DTO ====================

export const CouponRedemptionSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '核销记录 ID' }),
    couponId: z.string().uuid().openapi({ description: '优惠券 ID' }),
    userCouponId: z.string().uuid().openapi({ description: '用户优惠券 ID' }),
    userId: z.string().uuid().openapi({ description: '用户 ID' }),
    orderId: z.string().uuid().nullable().optional().openapi({ description: '订单 ID（可为空）' }),

    // 折扣信息
    originalAmount: z.string().openapi({ description: '原始金额（decimal 字符串）' }),
    discountAmount: z.string().openapi({ description: '折扣金额（decimal 字符串）' }),
    finalAmount: z.string().openapi({ description: '最终金额（decimal 字符串）' }),

    // 赠品信息（仅赠品券）
    giftProductId: z.string().uuid().nullable().optional().openapi({ description: '赠品商品 ID（可为空）' }),
    giftEntitlementId: z.string().uuid().nullable().optional().openapi({ description: '赠品权益 ID（可为空）' }),

    // 时间
    redeemedAt: z.string().openapi({ description: '核销时间 ISO' }),
    createdAt: z.string().openapi({ description: '创建时间 ISO' }),

    // 关联信息（用于查询时包含）
    coupon: CouponSchema.optional().openapi({ description: '关联的优惠券（可选）' }),
    userCoupon: UserCouponSchema.optional().openapi({ description: '关联的用户优惠券（可选）' }),
  })
  .openapi({ description: '优惠券核销记录 DTO' })

export type CouponRedemption = z.infer<typeof CouponRedemptionSchema>

// ==================== 请求/响应 Schema ====================

// 获取我的优惠券列表
export const ListMyCouponsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(20).openapi({ description: '分页大小' }),
    cursor: z.string().nullable().optional().openapi({ description: '分页游标' }),
    status: UserCouponStatusSchema.optional().openapi({ description: '状态筛选' }),
  })
  .openapi({ description: '获取我的优惠券列表查询参数' })

export type ListMyCouponsQuery = z.infer<typeof ListMyCouponsQuerySchema>

export const ListMyCouponsResponseSchema = z
  .object({
    userCoupons: z.array(UserCouponSchema).openapi({ description: '用户优惠券列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标' }),
  })
  .openapi({ description: '获取我的优惠券列表响应' })

export type ListMyCouponsResponse = z.infer<typeof ListMyCouponsResponseSchema>

// 计算优惠券折扣
export const CalculateDiscountRequestSchema = z
  .object({
    userCouponId: z.string().uuid().openapi({ description: '用户优惠券 ID' }),
    productId: z.string().uuid().openapi({ description: '商品 ID' }),
    originalAmount: z.string().openapi({ description: '原始金额（decimal 字符串）' }),
  })
  .openapi({ description: '计算优惠券折扣请求' })

export type CalculateDiscountRequest = z.infer<typeof CalculateDiscountRequestSchema>

export const CalculateDiscountResponseSchema = z
  .object({
    canUse: z.boolean().openapi({ description: '是否可以使用该优惠券' }),
    reason: z.string().optional().openapi({ description: '不可使用的原因（当 canUse=false 时）' }),
    originalAmount: z.string().openapi({ description: '原始金额（decimal 字符串）' }),
    discountAmount: z.string().openapi({ description: '折扣金额（decimal 字符串）' }),
    finalAmount: z.string().openapi({ description: '最终金额（decimal 字符串）' }),
    coupon: CouponSchema.openapi({ description: '优惠券信息' }),
  })
  .openapi({ description: '计算优惠券折扣响应' })

export type CalculateDiscountResponse = z.infer<typeof CalculateDiscountResponseSchema>
