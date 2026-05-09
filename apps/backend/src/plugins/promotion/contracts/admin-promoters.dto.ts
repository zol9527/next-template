/**
 * Admin Promoters DTO
 * 管理员推广员管理相关数据传输对象
 */

import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { PromoterLevelSchema, PromoterStatsSchema } from './promoter.dto'

extendZodWithOpenApi(z)

// ==================== 管理员推广员列表 Schema ====================

/**
Function: AdminPromoterListItemSchema

Description: 管理员推广员列表项 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const AdminPromoterListItemSchema = z
  .object({
    userId: z.string().uuid().openapi({ description: '用户 ID' }),
    username: z.string().nullable().openapi({ description: '用户名' }),
    avatarUrl: z.string().nullable().openapi({ description: '头像 URL' }),
    currentLevel: PromoterLevelSchema.openapi({ description: '当前等级' }),
    totalCommission: z.string().openapi({ description: '累计佣金总额' }),
    totalOrders: z.number().int().openapi({ description: '推广订单总数' }),
    totalSalesAmount: z.string().openapi({ description: '累计销售额' }),
    subPromoterCount: z.number().int().openapi({ description: '下级推广员数量' }),
    levelUpdatedAt: z.string().openapi({ description: '等级更新时间 ISO' }),
    createdAt: z.string().openapi({ description: '注册时间 ISO' }),
  })
  .openapi({ description: '管理员推广员列表项' })

export type AdminPromoterListItem = z.infer<typeof AdminPromoterListItemSchema>

/**
Function: AdminPromoterListQuerySchema

Description: 管理员推广员列表查询参数 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const AdminPromoterListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(50).openapi({ description: '分页大小' }),
    cursor: z.string().nullable().optional().openapi({ description: '分页游标' }),
    level: z.coerce.number().int().min(1).max(4).optional().openapi({ description: '按等级过滤（可选）' }),
    keyword: z.string().min(1).max(100).optional().openapi({ description: '关键词搜索（用户名）' }),
  })
  .openapi({ description: '管理员推广员列表查询参数' })

export type AdminPromoterListQuery = z.infer<typeof AdminPromoterListQuerySchema>

/**
Function: AdminPromoterListResponseSchema

Description: 管理员推广员列表响应 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const AdminPromoterListResponseSchema = z
  .object({
    promoters: z.array(AdminPromoterListItemSchema).openapi({ description: '推广员列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标' }),
    totalCount: z.number().openapi({ description: '总记录数' }),
  })
  .openapi({ description: '管理员推广员列表响应' })

export type AdminPromoterListResponse = z.infer<typeof AdminPromoterListResponseSchema>

// ==================== 管理员推广员详情 Schema ====================

/**
Function: AdminPromoterDetailSchema

Description: 管理员推广员详情 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const AdminPromoterDetailSchema = z
  .object({
    userId: z.string().uuid().openapi({ description: '用户 ID' }),
    username: z.string().nullable().openapi({ description: '用户名' }),
    email: z.string().nullable().openapi({ description: '邮箱' }),
    avatarUrl: z.string().nullable().openapi({ description: '头像 URL' }),
    status: z.enum(['active', 'inactive', 'locked']).openapi({ description: '用户状态' }),
    currentLevel: PromoterLevelSchema.openapi({ description: '当前等级' }),
    stats: PromoterStatsSchema.openapi({ description: '业绩统计' }),
    subPromoterCount: z.number().int().openapi({ description: '下级推广员数量' }),
    levelUpdatedAt: z.string().openapi({ description: '等级更新时间 ISO' }),
    createdAt: z.string().openapi({ description: '注册时间 ISO' }),
  })
  .openapi({ description: '管理员推广员详情' })

export type AdminPromoterDetail = z.infer<typeof AdminPromoterDetailSchema>

/**
Function: UpdatePromoterLevelRequestSchema

Description: 更新推广员等级请求 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const UpdatePromoterLevelRequestSchema = z
  .object({
    levelId: z.string().uuid().openapi({ description: '目标等级 ID' }),
    reason: z.string().optional().openapi({ description: '调整原因（可选）' }),
  })
  .openapi({ description: '更新推广员等级请求' })

export type UpdatePromoterLevelRequest = z.infer<typeof UpdatePromoterLevelRequestSchema>

/**
Function: UpdatePromoterLevelResponseSchema

Description: 更新推广员等级响应 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const UpdatePromoterLevelResponseSchema = z
  .object({
    userId: z.string().uuid().openapi({ description: '用户 ID' }),
    previousLevel: PromoterLevelSchema.openapi({ description: '原等级' }),
    newLevel: PromoterLevelSchema.openapi({ description: '新等级' }),
    effectiveAt: z.string().openapi({ description: '生效时间 ISO' }),
  })
  .openapi({ description: '更新推广员等级响应' })

export type UpdatePromoterLevelResponse = z.infer<typeof UpdatePromoterLevelResponseSchema>

/**
Function: UpdatePromoterLevelConfigRequestSchema

Description: 更新推广员等级配置请求 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const UpdatePromoterLevelConfigRequestSchema = z
  .object({
    commissionRate: z.string().regex(/^0?\.\d+$/).openapi({ description: '佣金比例（如 "0.05"）' }),
    minSalesAmount: z.string().optional().openapi({ description: '最低销售额要求' }),
    minSalesCount: z.number().int().min(0).optional().openapi({ description: '最低销售数量要求' }),
    reason: z.string().optional().openapi({ description: '配置变更原因（可选）' }),
  })
  .openapi({ description: '更新推广员等级配置请求' })

export type UpdatePromoterLevelConfigRequest = z.infer<typeof UpdatePromoterLevelConfigRequestSchema>
