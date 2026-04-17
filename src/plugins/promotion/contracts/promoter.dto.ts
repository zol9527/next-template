/**
 * Promoter DTO
 * 推广员相关数据传输对象
 */

import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// ==================== 等级相关 Schema ====================

/**
Function: PromoterLevelSchema

Description: 推广员等级 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const PromoterLevelSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '等级 ID' }),
    name: z.string().openapi({ description: '等级名称（青铜/白银/黄金/钻石）' }),
    level: z.number().int().openapi({ description: '等级序号（1-4）' }),
    commissionRate: z.string().openapi({ description: '佣金比例（如 "0.05"）' }),
    minSalesCount: z.number().int().openapi({ description: '最低销售数量要求' }),
    minSalesAmount: z.string().openapi({ description: '最低销售额要求' }),
    description: z.string().nullable().openapi({ description: '等级描述' }),
    createdAt: z.string().openapi({ description: '创建时间 ISO' }),
    updatedAt: z.string().openapi({ description: '更新时间 ISO' }),
  })
  .openapi({ description: '推广员等级' })

export type PromoterLevel = z.infer<typeof PromoterLevelSchema>

// ==================== 推广员个人信息 Schema ====================

/**
Function: PromoterProfileSchema

Description: 推广员个人信息 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const PromoterProfileSchema = z
  .object({
    userId: z.string().uuid().openapi({ description: '用户 ID' }),
    username: z.string().nullable().openapi({ description: '用户名' }),
    avatarUrl: z.string().nullable().openapi({ description: '头像 URL' }),
    currentLevel: PromoterLevelSchema.openapi({ description: '当前等级' }),
    totalCommission: z.string().openapi({ description: '累计佣金总额' }),
    payableCommission: z.string().openapi({ description: '可提现佣金' }),
    frozenCommission: z.string().openapi({ description: '冻结中佣金' }),
    settledCommission: z.string().openapi({ description: '已结算佣金' }),
    totalOrders: z.number().int().openapi({ description: '推广订单总数' }),
    totalSalesAmount: z.string().openapi({ description: '累计销售额' }),
    subPromoterCount: z.number().int().openapi({ description: '下级推广员数量' }),
    levelUpdatedAt: z.string().openapi({ description: '等级更新时间 ISO' }),
  })
  .openapi({ description: '推广员个人信息' })

export type PromoterProfile = z.infer<typeof PromoterProfileSchema>

// ==================== 推广员业绩统计 Schema ====================

/**
Function: PromoterStatsSchema

Description: 推广员业绩统计 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const PromoterStatsSchema = z
  .object({
    totalCommission: z.string().openapi({ description: '累计佣金总额' }),
    payableCommission: z.string().openapi({ description: '可提现佣金' }),
    frozenCommission: z.string().openapi({ description: '冻结中佣金' }),
    settledCommission: z.string().openapi({ description: '已结算佣金' }),
    totalOrders: z.number().int().openapi({ description: '推广订单总数' }),
    totalSalesAmount: z.string().openapi({ description: '累计销售额' }),
  })
  .openapi({ description: '推广员业绩统计' })

export type PromoterStats = z.infer<typeof PromoterStatsSchema>

// ==================== 佣金记录相关 Schema ====================

/**
Function: PromoterCommissionsQuerySchema

Description: 查询佣金记录列表参数 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const PromoterCommissionsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(20).openapi({ description: '分页大小' }),
    cursor: z.string().nullable().optional().openapi({ description: '分页游标' }),
    status: z
      .enum(['frozen', 'payable', 'settling', 'settled', 'failed', 'voided'])
      .optional()
      .openapi({ description: '按状态过滤（可选）' }),
  })
  .openapi({ description: '查询佣金记录列表参数' })

export type PromoterCommissionsQuery = z.infer<typeof PromoterCommissionsQuerySchema>

/**
Function: PromoterCommissionRecordSchema

Description: 推广员佣金记录 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const PromoterCommissionRecordSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '佣金记录 ID' }),
    orderId: z.string().uuid().openapi({ description: '订单 ID' }),
    orderNo: z.string().optional().openapi({ description: '订单号' }),
    baseAmount: z.string().openapi({ description: '佣金基数金额' }),
    rate: z.string().openapi({ description: '佣金比例' }),
    commissionAmount: z.string().openapi({ description: '佣金金额' }),
    status: z
      .enum(['frozen', 'payable', 'settling', 'settled', 'failed', 'voided'])
      .openapi({ description: '状态' }),
    createdAt: z.string().openapi({ description: '创建时间 ISO' }),
    updatedAt: z.string().openapi({ description: '更新时间 ISO' }),
  })
  .openapi({ description: '推广员佣金记录' })

export type PromoterCommissionRecord = z.infer<typeof PromoterCommissionRecordSchema>

/**
Function: PromoterCommissionsResponseSchema

Description: 佣金记录列表响应 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const PromoterCommissionsResponseSchema = z
  .object({
    records: z.array(PromoterCommissionRecordSchema).openapi({ description: '佣金记录列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标' }),
  })
  .openapi({ description: '佣金记录列表响应' })

export type PromoterCommissionsResponse = z.infer<typeof PromoterCommissionsResponseSchema>
