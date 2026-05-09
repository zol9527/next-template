import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// =============================================================================
// Miniprogram FAQ DTOs
// =============================================================================

/**
 * FAQ 条目 Schema
 */
export const MiniprogramFaqItemSchema = z
  .object({
    id: z.string().openapi({ description: 'FAQ ID' }),
    question: z.string().openapi({ description: '问题标题' }),
    answer: z.string().openapi({ description: '问题答案' }),
    sort: z.number().int().openapi({ description: '排序权重' }),
    enabled: z.boolean().openapi({ description: '是否启用' }),
    createdAt: z.string().openapi({ description: '创建时间' }),
    updatedAt: z.string().openapi({ description: '更新时间' }),
  })
  .openapi({ description: 'FAQ 条目' })

export type MiniprogramFaqItem = z.infer<typeof MiniprogramFaqItemSchema>

/**
 * 创建 FAQ 请求 Schema
 */
export const CreateMiniprogramFaqRequestSchema = z
  .object({
    question: z.string().min(1, '问题标题不能为空').max(200).openapi({ description: '问题标题' }),
    answer: z.string().min(1, '问题答案不能为空').openapi({ description: '问题答案' }),
    sort: z.number().int().min(0).default(0).openapi({ description: '排序权重' }),
    enabled: z.boolean().default(true).openapi({ description: '是否启用' }),
  })
  .openapi({ description: '创建 FAQ 请求' })

export type CreateMiniprogramFaqRequest = z.infer<typeof CreateMiniprogramFaqRequestSchema>

/**
 * 更新 FAQ 请求 Schema
 */
export const UpdateMiniprogramFaqRequestSchema = z
  .object({
    question: z.string().min(1, '问题标题不能为空').max(200).optional().openapi({ description: '问题标题' }),
    answer: z.string().min(1, '问题答案不能为空').optional().openapi({ description: '问题答案' }),
    sort: z.number().int().min(0).optional().openapi({ description: '排序权重' }),
    enabled: z.boolean().optional().openapi({ description: '是否启用' }),
  })
  .openapi({ description: '更新 FAQ 请求' })

export type UpdateMiniprogramFaqRequest = z.infer<typeof UpdateMiniprogramFaqRequestSchema>
