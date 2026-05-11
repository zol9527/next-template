import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import {
  CouponSchema,
  CouponStatusSchema,
  CouponTypeSchema,
  UserCouponSchema,
  CouponRedemptionSchema,
  UserCouponStatusSchema,
} from '@/plugins/ecommerce/contracts/coupons.dto'

extendZodWithOpenApi(z)

// ==================== 后台管理：优惠券 CRUD ====================

// 创建优惠券请求
export const CreateCouponRequestSchema = z
  .object({
    name: z.string().min(1).openapi({ description: '优惠券名称' }),
    description: z.string().optional().openapi({ description: '优惠券描述' }),
    type: CouponTypeSchema.openapi({ description: '优惠券类型' }),

    // 折扣信息（根据 type 必填不同字段）
    discountPercent: z.string().optional().openapi({ description: '折扣百分比（如 85 表示 85 折），仅 discount 类型必填' }),
    discountAmount: z.string().optional().openapi({ description: '固定折扣金额，仅 fixed_amount 类型必填' }),
    thresholdAmount: z.string().optional().openapi({ description: '满减门槛金额，仅 threshold 类型必填' }),
    thresholdDiscount: z.string().optional().openapi({ description: '满减优惠金额，仅 threshold 类型必填' }),
    giftProductId: z.string().uuid().optional().openapi({ description: '赠品商品 ID，仅 gift 类型必填' }),

    // 使用限制
    minOrderAmount: z.string().optional().openapi({ description: '最低订单金额（decimal 字符串）' }),
    maxDiscountAmount: z.string().optional().openapi({ description: '最大折扣金额（decimal 字符串）' }),
    perUserLimit: z.number().int().optional().openapi({ description: '每用户限领数量，null 表示不限制' }),
    usageLimit: z.number().int().optional().openapi({ description: '总使用次数限制，null 表示不限制' }),

    // 适用范围
    applicableProductIds: z.array(z.string().uuid()).optional().openapi({ description: '适用商品 ID 列表，空数组表示全场通用' }),
    applicableCategoryIds: z.array(z.string().uuid()).optional().openapi({ description: '适用分类 ID 列表，空数组表示全部分类' }),

    // 有效期
    validFrom: z.string().openapi({ description: '有效期开始时间 ISO' }),
    validTo: z.string().openapi({ description: '有效期结束时间 ISO' }),
  })
  .openapi({ description: '创建优惠券请求' })

export type CreateCouponRequest = z.infer<typeof CreateCouponRequestSchema>

export const CreateCouponResponseSchema = z
  .object({
    coupon: CouponSchema.openapi({ description: '创建后的优惠券' }),
  })
  .openapi({ description: '创建优惠券响应' })

export type CreateCouponResponse = z.infer<typeof CreateCouponResponseSchema>

// 更新优惠券请求
export const UpdateCouponRequestSchema = z
  .object({
    name: z.string().min(1).optional().openapi({ description: '优惠券名称' }),
    description: z.string().optional().openapi({ description: '优惠券描述' }),
    status: CouponStatusSchema.optional().openapi({ description: '优惠券状态' }),

    // 折扣信息
    discountPercent: z.string().optional().openapi({ description: '折扣百分比（如 85 表示 85 折），仅 discount 类型' }),
    discountAmount: z.string().optional().openapi({ description: '固定折扣金额，仅 fixed_amount 类型' }),
    thresholdAmount: z.string().optional().openapi({ description: '满减门槛金额，仅 threshold 类型' }),
    thresholdDiscount: z.string().optional().openapi({ description: '满减优惠金额，仅 threshold 类型' }),
    giftProductId: z.string().uuid().optional().openapi({ description: '赠品商品 ID，仅 gift 类型' }),

    // 使用限制
    minOrderAmount: z.string().optional().openapi({ description: '最低订单金额（decimal 字符串）' }),
    maxDiscountAmount: z.string().optional().openapi({ description: '最大折扣金额（decimal 字符串）' }),
    perUserLimit: z.number().int().nullable().optional().openapi({ description: '每用户限领数量，null 表示不限制' }),
    usageLimit: z.number().int().nullable().optional().openapi({ description: '总使用次数限制，null 表示不限制' }),

    // 适用范围
    applicableProductIds: z.array(z.string().uuid()).optional().openapi({ description: '适用商品 ID 列表，空数组表示全场通用' }),
    applicableCategoryIds: z.array(z.string().uuid()).optional().openapi({ description: '适用分类 ID 列表，空数组表示全部分类' }),

    // 有效期
    validFrom: z.string().optional().openapi({ description: '有效期开始时间 ISO' }),
    validTo: z.string().optional().openapi({ description: '有效期结束时间 ISO' }),
  })
  .openapi({ description: '更新优惠券请求' })

export type UpdateCouponRequest = z.infer<typeof UpdateCouponRequestSchema>

export const UpdateCouponResponseSchema = z
  .object({
    coupon: CouponSchema.openapi({ description: '更新后的优惠券' }),
  })
  .openapi({ description: '更新优惠券响应' })

export type UpdateCouponResponse = z.infer<typeof UpdateCouponResponseSchema>

// 优惠券详情响应
export const CouponDetailResponseSchema = z
  .object({
    coupon: CouponSchema.openapi({ description: '优惠券详情' }),
  })
  .openapi({ description: '优惠券详情响应' })

export type CouponDetailResponse = z.infer<typeof CouponDetailResponseSchema>

// 优惠券列表查询参数
export const ListCouponsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(20).openapi({ description: '分页大小' }),
    cursor: z.string().nullable().optional().openapi({ description: '分页游标' }),
    status: CouponStatusSchema.optional().openapi({ description: '状态筛选' }),
    type: CouponTypeSchema.optional().openapi({ description: '类型筛选' }),
    name: z.string().optional().openapi({ description: '名称搜索（支持模糊匹配）' }),
  })
  .openapi({ description: '优惠券列表查询参数' })

export type ListCouponsQuery = z.infer<typeof ListCouponsQuerySchema>

export const ListCouponsResponseSchema = z
  .object({
    coupons: z.array(CouponSchema).openapi({ description: '优惠券列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标' }),
    totalCount: z.number().openapi({ description: '总记录数' }),
  })
  .openapi({ description: '优惠券列表响应' })

export type ListCouponsResponse = z.infer<typeof ListCouponsResponseSchema>

// ==================== 后台管理：用户优惠券发放 ====================

// 发放优惠券请求
export const IssueCouponRequestSchema = z
  .object({
    couponId: z.string().uuid().openapi({ description: '优惠券模板 ID' }),

    // 发放目标（二选一）
    userIds: z.array(z.string().uuid()).optional().openapi({ description: '指定用户 ID 列表' }),
    userRole: z.string().optional().openapi({ description: '按用户角色发放（需与 permissions 集成）' }),

    // 发放配置
    expiresAt: z.string().optional().openapi({ description: '用户优惠券过期时间 ISO（可选，默认使用优惠券的 validTo）' }),
  })
  .openapi({ description: '发放优惠券请求' })

export type IssueCouponRequest = z.infer<typeof IssueCouponRequestSchema>

export const IssueCouponResponseSchema = z
  .object({
    issued: z.number().openapi({ description: '成功发放的数量' }),
    failed: z.number().openapi({ description: '失败的数量' }),
    failures: z
      .array(
        z.object({
          userId: z.string().uuid().openapi({ description: '用户 ID' }),
          reason: z.string().openapi({ description: '失败原因' }),
        }),
      )
      .optional()
      .openapi({ description: '失败详情（可选）' }),
  })
  .openapi({ description: '发放优惠券响应' })

export type IssueCouponResponse = z.infer<typeof IssueCouponResponseSchema>

// 用户优惠券列表查询参数（后台）
export const ListUserCouponsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(20).openapi({ description: '分页大小' }),
    cursor: z.string().nullable().optional().openapi({ description: '分页游标' }),
    couponId: z.string().uuid().optional().openapi({ description: '按优惠券模板筛选' }),
    userId: z.string().uuid().optional().openapi({ description: '按用户筛选' }),
    status: UserCouponStatusSchema.optional().openapi({ description: '状态筛选' }),
  })
  .openapi({ description: '用户优惠券列表查询参数（后台）' })

export type ListUserCouponsQuery = z.infer<typeof ListUserCouponsQuerySchema>

export const ListUserCouponsResponseSchema = z
  .object({
    userCoupons: z.array(UserCouponSchema).openapi({ description: '用户优惠券列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标' }),
  })
  .openapi({ description: '用户优惠券列表响应' })

export type ListUserCouponsResponse = z.infer<typeof ListUserCouponsResponseSchema>

// ==================== 后台管理：核销记录 ====================

// 核销记录列表查询参数
export const ListRedemptionsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(20).openapi({ description: '分页大小' }),
    cursor: z.string().nullable().optional().openapi({ description: '分页游标' }),
    couponId: z.string().uuid().optional().openapi({ description: '按优惠券筛选' }),
    userId: z.string().uuid().optional().openapi({ description: '按用户筛选' }),
    orderId: z.string().uuid().optional().openapi({ description: '按订单筛选' }),
    startDate: z.string().optional().openapi({ description: '开始日期 ISO' }),
    endDate: z.string().optional().openapi({ description: '结束日期 ISO' }),
    includeCount: z.coerce.boolean().optional().default(false).openapi({ description: '是否返回总记录数（默认 false，跳过全表 count 提升性能）' }),
  })
  .openapi({ description: '核销记录列表查询参数' })

export type ListRedemptionsQuery = z.infer<typeof ListRedemptionsQuerySchema>

export const ListRedemptionsResponseSchema = z
  .object({
    redemptions: z.array(CouponRedemptionSchema).openapi({ description: '核销记录列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标' }),
    totalCount: z.number().optional().openapi({ description: '总记录数（仅在 includeCount=true 时返回）' }),
  })
  .openapi({ description: '核销记录列表响应' })

export type ListRedemptionsResponse = z.infer<typeof ListRedemptionsResponseSchema>

// ==================== 后台管理：批量操作 ====================

// 批量更新状态请求
export const BatchUpdateCouponStatusRequestSchema = z
  .object({
    couponIds: z.array(z.string().uuid()).min(1).openapi({ description: '优惠券 ID 列表' }),
    status: CouponStatusSchema.openapi({ description: '目标状态' }),
  })
  .openapi({ description: '批量更新优惠券状态请求' })

export type BatchUpdateCouponStatusRequest = z.infer<typeof BatchUpdateCouponStatusRequestSchema>

export const BatchUpdateCouponStatusResponseSchema = z
  .object({
    updated: z.number().openapi({ description: '成功更新的数量' }),
  })
  .openapi({ description: '批量更新优惠券状态响应' })

export type BatchUpdateCouponStatusResponse = z.infer<typeof BatchUpdateCouponStatusResponseSchema>

// 删除优惠券响应
export const DeleteCouponResponseSchema = z
  .object({
    deleted: z.boolean().openapi({ description: '是否删除成功' }),
  })
  .openapi({ description: '删除优惠券响应' })

export type DeleteCouponResponse = z.infer<typeof DeleteCouponResponseSchema>
