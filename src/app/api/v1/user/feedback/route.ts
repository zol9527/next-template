import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createFeedbackRepository } from '@/repositories/factory'
import { createFeedbackService } from '@/services/core/feedback.service'
import { SubmitFeedbackRequestSchema, FeedbackListQuerySchema } from '@/contracts/dtos/feedback.dto'

/**
 * 用户反馈列表 + 提交反馈 API
 *
 * GET  - 查询当前用户的反馈列表（cursor 分页）
 * POST - 提交一条新的用户反馈
 */

// ==================== GET: 查询反馈列表 ====================
export const GET = withV1Route({
  requireAuth: true,
  action: 'user_feedback:list',
  schemas: { query: FeedbackListQuerySchema },
  handler: async ({ req, serviceContext, userId, query }) => {
    const service = createFeedbackService(
      { feedback: await createFeedbackRepository() },
      serviceContext,
    )

    // 决策 D7: 不返回 totalCount
    const result = await service.listFeedback(userId, {
      cursor: query.cursor ?? null,
      limit: query.limit,
      status: query.status ?? null,
    })

    return createJsonApiResponse(req, ok(result))
  },
})

// ==================== POST: 提交反馈 ====================
export const POST = withV1Route({
  requireAuth: true,
  action: 'user_feedback:submit',
  schemas: { body: SubmitFeedbackRequestSchema },
  // 决策 D3: 路由层频率限制（每小时 5 次）
  rateLimit: {
    max: 5,
    windowMs: 60 * 60 * 1000,
    message: '反馈提交过于频繁，请稍后再试',
  },
  handler: async ({ req, serviceContext, userId, body }) => {
    const service = createFeedbackService(
      { feedback: await createFeedbackRepository() },
      serviceContext,
    )

    const result = await service.submitFeedback(userId, body!)

    return createJsonApiResponse(req, ok(result))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
