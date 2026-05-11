import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// 反馈类型枚举
export const FeedbackTypeEnum = z
  .enum(['suggestion', 'bug', 'other'])
  .openapi({ description: '反馈类型' })

export type FeedbackType = z.infer<typeof FeedbackTypeEnum>

// 反馈状态枚举
export const FeedbackStatusEnum = z
  .enum(['pending', 'processing', 'resolved', 'closed'])
  .openapi({ description: '反馈状态' })

export type FeedbackStatus = z.infer<typeof FeedbackStatusEnum>

// 反馈关联用户摘要 Schema（管理端展示使用）
export const FeedbackUserSummarySchema = z
  .object({
    id: z.string().uuid().openapi({ description: '用户 ID' }),
    username: z.string().nullable().openapi({ description: '用户名' }),
    nickname: z.string().nullable().openapi({ description: '用户昵称/姓名' }),
    phone: z.string().nullable().openapi({ description: '手机号' }),
    avatarUrl: z.string().nullable().openapi({ description: '头像 URL' }),
    sourcePlatform: z.string().openapi({ description: '来源平台' }),
  })
  .openapi({ description: '反馈关联用户摘要' })

export type FeedbackUserSummary = z.infer<typeof FeedbackUserSummarySchema>

// 提交反馈请求 Schema
export const SubmitFeedbackRequestSchema = z
  .object({
    type: FeedbackTypeEnum.openapi({ description: '反馈类型' }),
    title: z.string().min(1).max(100).openapi({ description: '反馈标题（1-100 字符）' }),
    content: z.string().min(1).max(2000).openapi({ description: '反馈内容（1-2000 字符）' }),
    images: z.array(z.string().url()).max(9).optional().openapi({ description: '反馈图片 URL 列表（最多 9 张）' }),
  })
  .openapi({ description: '提交反馈请求' })

export type SubmitFeedbackRequest = z.infer<typeof SubmitFeedbackRequestSchema>

// 反馈项 Schema
export const FeedbackSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '反馈 ID' }),
    userId: z.string().uuid().openapi({ description: '用户 ID' }),
    type: FeedbackTypeEnum.openapi({ description: '反馈类型' }),
    title: z.string().openapi({ description: '反馈标题' }),
    content: z.string().openapi({ description: '反馈内容' }),
    images: z.array(z.string()).openapi({ description: '反馈图片 URL 列表' }),
    status: FeedbackStatusEnum.openapi({ description: '反馈状态' }),
    createdAt: z.string().openapi({ description: '创建时间（ISO 8601）' }),
    updatedAt: z.string().openapi({ description: '更新时间（ISO 8601）' }),
    user: FeedbackUserSummarySchema.optional().openapi({ description: '关联用户摘要（管理端返回）' }),
  })
  .openapi({ description: '反馈项' })

export type Feedback = z.infer<typeof FeedbackSchema>

// 反馈列表查询参数 Schema
export const FeedbackListQuerySchema = z
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
  })
  .openapi({ description: '反馈列表查询参数' })

export type FeedbackListQuery = z.infer<typeof FeedbackListQuerySchema>

// 反馈列表响应 Schema
export const FeedbackListResponseSchema = z
  .object({
    items: z.array(FeedbackSchema).openapi({ description: '反馈列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标（无更多数据时为 null）' }),
    hasMore: z.boolean().openapi({ description: '是否有更多数据' }),
  })
  .openapi({ description: '反馈列表响应' })

export type FeedbackListResponse = z.infer<typeof FeedbackListResponseSchema>

// 反馈回复 Schema
export const FeedbackReplySchema = z
  .object({
    id: z.string().uuid().openapi({ description: '回复 ID' }),
    feedbackId: z.string().uuid().openapi({ description: '反馈 ID' }),
    adminId: z.string().uuid().openapi({ description: '管理员 ID' }),
    content: z.string().openapi({ description: '回复内容' }),
    createdAt: z.string().openapi({ description: '创建时间（ISO 8601）' }),
  })
  .openapi({ description: '反馈回复' })

export type FeedbackReply = z.infer<typeof FeedbackReplySchema>

// 反馈详情 Schema（包含回复）
export const FeedbackDetailSchema = FeedbackSchema.extend({
  replies: z.array(FeedbackReplySchema).openapi({ description: '回复列表' }),
}).openapi({ description: '反馈详情（包含回复）' })

export type FeedbackDetail = z.infer<typeof FeedbackDetailSchema>
