import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { FeedbackStatusEnum } from './feedback.dto'

extendZodWithOpenApi(z)

// 管理员反馈列表查询参数 Schema
export const AdminFeedbackListQuerySchema = z
  .object({
    cursor: z.string().optional().openapi({ description: '分页游标（可选）' }),
    limit: z
      .coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .default(20)
      .openapi({ description: '每页数量（默认 20，最大 50）' }),
    status: FeedbackStatusEnum.optional().openapi({ description: '反馈状态筛选（可选）' }),
    keyword: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional()
      .openapi({ description: '搜索关键词，可匹配反馈标题、内容、用户 ID、姓名、手机号' }),
  })
  .openapi({ description: '管理员反馈列表查询参数' })

export type AdminFeedbackListQuery = z.infer<typeof AdminFeedbackListQuerySchema>

// 更新反馈状态请求 Schema
export const UpdateFeedbackStatusRequestSchema = z
  .object({
    status: FeedbackStatusEnum.openapi({ description: '反馈状态' }),
  })
  .openapi({ description: '更新反馈状态请求' })

export type UpdateFeedbackStatusRequest = z.infer<typeof UpdateFeedbackStatusRequestSchema>

// 创建回复请求 Schema
export const CreateReplyRequestSchema = z
  .object({
    content: z.string().min(1).max(2000).openapi({ description: '回复内容（1-2000 字符）' }),
  })
  .openapi({ description: '创建回复请求' })

export type CreateReplyRequest = z.infer<typeof CreateReplyRequestSchema>
