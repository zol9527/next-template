/**
 * Promoter Codes DTO
 * 推广员推广码相关数据传输对象
 */

import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// ==================== 基础 Schema ====================

/**
Function: PromoterCodeTypeSchema

Description: 推广码类型 Schema

Returns:
  schema(ZodSchema): Zod 枚举 Schema
*/
export const PromoterCodeTypeSchema = z
  .enum(['auto', 'custom'])
  .openapi({ description: '推广码类型：auto=自动生成，custom=用户自定义' })

export type PromoterCodeType = z.infer<typeof PromoterCodeTypeSchema>

/**
Function: PromoterCodeStatusSchema

Description: 推广码状态 Schema

Returns:
  schema(ZodSchema): Zod 枚举 Schema
*/
export const PromoterCodeStatusSchema = z
  .enum(['active', 'inactive', 'disabled'])
  .openapi({ description: '推广码状态：active=可用，inactive=不可用，disabled=已禁用' })

export type PromoterCodeStatus = z.infer<typeof PromoterCodeStatusSchema>

// ==================== 实体 Schema ====================

/**
Function: PromoterCodeSchema

Description: 推广码实体 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const PromoterCodeSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '推广码 ID' }),
    code: z.string().openapi({ description: '推广码字符串' }),
    promoterUserId: z.string().uuid().openapi({ description: '推广员用户 ID' }),
    type: PromoterCodeTypeSchema.openapi({ description: '推广码类型' }),
    status: PromoterCodeStatusSchema.openapi({ description: '推广码状态' }),
    usageCount: z.number().int().nonnegative().openapi({ description: '使用次数' }),
    activeFrom: z.string().openapi({ description: '生效时间 ISO' }),
    activeTo: z.string().nullable().openapi({ description: '失效时间 ISO（可为空）' }),
    metadata: z.record(z.string(), z.unknown()).openapi({ description: '扩展元数据' }),
    createdAt: z.string().openapi({ description: '创建时间 ISO' }),
    updatedAt: z.string().openapi({ description: '更新时间 ISO' }),
  })
  .openapi({ description: '推广员推广码' })

export type PromoterCode = z.infer<typeof PromoterCodeSchema>

// ==================== API 请求/响应 Schema ====================

/**
Function: GeneratePromoterCodeRequestSchema

Description: 生成推广码请求 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const GeneratePromoterCodeRequestSchema = z
  .object({
    type: PromoterCodeTypeSchema.optional().default('auto').openapi({ description: '推广码类型' }),
    customCode: z.string().min(3).max(20).optional().openapi({ description: '自定义推广码（仅当 type=custom 时需要）' }),
    activeTo: z.string().optional().openapi({ description: '失效时间 ISO（可选，永久有效则不填）' }),
  })
  .openapi({ description: '生成推广码请求' })

export type GeneratePromoterCodeRequest = z.infer<typeof GeneratePromoterCodeRequestSchema>

/**
Function: GeneratePromoterCodeResponseSchema

Description: 生成推广码响应 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const GeneratePromoterCodeResponseSchema = z
  .object({
    code: PromoterCodeSchema.openapi({ description: '生成的推广码' }),
  })
  .openapi({ description: '生成推广码响应' })

export type GeneratePromoterCodeResponse = z.infer<typeof GeneratePromoterCodeResponseSchema>

/**
Function: ListPromoterCodesQuerySchema

Description: 列出推广码查询参数 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const ListPromoterCodesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(20).openapi({ description: '分页大小' }),
    cursor: z.string().nullable().optional().openapi({ description: '分页游标' }),
    status: PromoterCodeStatusSchema.optional().openapi({ description: '按状态过滤（可选）' }),
  })
  .openapi({ description: '列出推广码查询参数' })

export type ListPromoterCodesQuery = z.infer<typeof ListPromoterCodesQuerySchema>

/**
Function: ListPromoterCodesResponseSchema

Description: 列出推广码响应 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const ListPromoterCodesResponseSchema = z
  .object({
    codes: z.array(PromoterCodeSchema).openapi({ description: '推广码列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标' }),
  })
  .openapi({ description: '列出推广码响应' })

export type ListPromoterCodesResponse = z.infer<typeof ListPromoterCodesResponseSchema>

/**
Function: BindByPromoterCodeRequestSchema

Description: 通过推广码绑定分销关系请求 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const BindByPromoterCodeRequestSchema = z
  .object({
    code: z.string().min(1).openapi({ description: '推广码字符串' }),
  })
  .openapi({ description: '通过推广码绑定分销关系请求' })

export type BindByPromoterCodeRequest = z.infer<typeof BindByPromoterCodeRequestSchema>

/**
Function: BindByPromoterCodeResponseSchema

Description: 通过推广码绑定分销关系响应 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const BindByPromoterCodeResponseSchema = z
  .object({
    relation: z
      .object({
        id: z.string().uuid().openapi({ description: '分销关系 ID' }),
        userId: z.string().uuid().openapi({ description: '用户 ID' }),
        promoterUserId: z.string().uuid().openapi({ description: '推广员用户 ID' }),
        effectiveAt: z.string().openapi({ description: '生效时间 ISO' }),
        promoterCode: z.string().optional().openapi({ description: '使用的推广码（可选）' }),
      })
      .openapi({ description: '绑定的分销关系' }),
  })
  .openapi({ description: '通过推广码绑定分销关系响应' })

export type BindByPromoterCodeResponse = z.infer<typeof BindByPromoterCodeResponseSchema>

/**
Function: UpdatePromoterCodeStatusRequestSchema

Description: 更新推广码状态请求 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const UpdatePromoterCodeStatusRequestSchema = z
  .object({
    status: PromoterCodeStatusSchema.openapi({ description: '新状态' }),
  })
  .openapi({ description: '更新推广码状态请求' })

export type UpdatePromoterCodeStatusRequest = z.infer<typeof UpdatePromoterCodeStatusRequestSchema>

/**
Function: UpdatePromoterCodeStatusResponseSchema

Description: 更新推广码状态响应 Schema

Returns:
  schema(ZodSchema): Zod 对象 Schema
*/
export const UpdatePromoterCodeStatusResponseSchema = z
  .object({
    code: PromoterCodeSchema.openapi({ description: '更新后的推广码' }),
  })
  .openapi({ description: '更新推广码状态响应' })

export type UpdatePromoterCodeStatusResponse = z.infer<typeof UpdatePromoterCodeStatusResponseSchema>
