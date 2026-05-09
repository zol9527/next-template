import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

/**
 * AI 使用日志 DTO Schema
 */
export const AiUsageLogSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '日志 ID' }),
    userId: z.string().uuid().openapi({ description: '用户 ID' }),
    capability: z.string().openapi({ description: 'AI 能力类型（如 text-generation, image-generation）' }),
    provider: z.string().openapi({ description: 'AI 提供商（如 minimax）' }),
    model: z.string().openapi({ description: '模型名称' }),
    inputTokens: z.number().int().openapi({ description: '输入 token 数' }),
    outputTokens: z.number().int().openapi({ description: '输出 token 数' }),
    costAmount: z.number().openapi({ description: '本次调用费用' }),
    currencyCode: z.string().openapi({ description: '货币代码' }),
    durationMs: z.number().int().openapi({ description: '调用耗时（毫秒）' }),
    status: z.string().openapi({ description: '调用状态（success / error）' }),
    errorMessage: z.string().nullable().openapi({ description: '错误信息（status 为 error 时）' }),
    entity: z.string().nullable().openapi({ description: '关联实体类型（如 blog_post）' }),
    entityId: z.string().nullable().openapi({ description: '关联实体 ID' }),
    traceId: z.string().nullable().openapi({ description: '链路追踪 ID' }),
    createdAt: z.string().openapi({ description: '创建时间 ISO' }),
  })
  .openapi({ description: 'AI 使用日志' })

export type AiUsageLog = z.infer<typeof AiUsageLogSchema>

/**
 * AI 使用统计 DTO Schema
 */
export const AiUsageStatsSchema = z
  .object({
    totalCalls: z.number().openapi({ description: '总调用次数' }),
    totalInputTokens: z.number().openapi({ description: '总输入 token 数' }),
    totalOutputTokens: z.number().openapi({ description: '总输出 token 数' }),
    totalCost: z.number().openapi({ description: '总费用' }),
    byProvider: z
      .array(
        z.object({
          provider: z.string().openapi({ description: '提供商名称' }),
          calls: z.number().openapi({ description: '调用次数' }),
          cost: z.number().openapi({ description: '费用' }),
        })
      )
      .openapi({ description: '按提供商聚合' }),
    byCapability: z
      .array(
        z.object({
          capability: z.string().openapi({ description: '能力类型' }),
          calls: z.number().openapi({ description: '调用次数' }),
          cost: z.number().openapi({ description: '费用' }),
        })
      )
      .openapi({ description: '按能力类型聚合' }),
  })
  .openapi({ description: 'AI 使用统计' })

export type AiUsageStats = z.infer<typeof AiUsageStatsSchema>

/**
 * AI 日志列表查询参数 Schema
 */
export const AiLogsQuerySchema = z
  .object({
    offset: z.coerce
      .number()
      .int()
      .min(0)
      .optional()
      .default(0)
      .openapi({ description: '分页偏移量（默认 0）' }),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(20)
      .openapi({ description: '分页大小（默认 20，最大 100）' }),
    provider: z.string().optional().openapi({ description: 'AI 提供商筛选' }),
    capability: z.string().optional().openapi({ description: 'AI 能力类型筛选' }),
    status: z.string().optional().openapi({ description: '调用状态筛选（success / error）' }),
    startDate: z.string().optional().openapi({ description: '开始日期（ISO 8601 格式）' }),
    endDate: z.string().optional().openapi({ description: '结束日期（ISO 8601 格式）' }),
  })
  .openapi({ description: 'AI 日志列表查询参数' })

export type AiLogsQuery = z.infer<typeof AiLogsQuerySchema>

/**
 * AI 日志列表响应 Schema
 */
export const AiLogsListResponseSchema = z
  .object({
    items: z.array(AiUsageLogSchema).openapi({ description: '日志列表' }),
    total: z.number().openapi({ description: '符合条件的记录总数' }),
  })
  .openapi({ description: 'AI 日志列表响应' })

export type AiLogsListResponse = z.infer<typeof AiLogsListResponseSchema>

/**
 * AI 统计查询参数 Schema
 */
export const AiStatsQuerySchema = z
  .object({
    startDate: z.string().optional().openapi({ description: '开始日期（ISO 8601 格式）' }),
    endDate: z.string().optional().openapi({ description: '结束日期（ISO 8601 格式）' }),
    userId: z.string().uuid().optional().openapi({ description: '用户 ID 筛选' }),
  })
  .openapi({ description: 'AI 统计查询参数' })

export type AiStatsQuery = z.infer<typeof AiStatsQuerySchema>
