import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * 阅读追踪请求
 */
export const TrackViewRequestSchema = z
  .object({
    articleId: z.string().uuid().openapi({ description: '文章 ID' }),
    readTime: z.coerce.number().int().min(0).default(0).openapi({ description: '阅读时长（秒）' }),
    referer: z.string().nullable().optional().openapi({ description: '来源页面' }),
  })
  .openapi({ description: '阅读追踪请求' })

export type TrackViewRequest = z.infer<typeof TrackViewRequestSchema>

/**
 * 阅读追踪响应
 */
export const TrackViewResponseSchema = z
  .object({
    recorded: z.boolean().openapi({ description: '是否记录成功' }),
    viewCount: z.number().int().openapi({ description: '当前阅读次数' }),
  })
  .openapi({ description: '阅读追踪响应' })

export type TrackViewResponse = z.infer<typeof TrackViewResponseSchema>
