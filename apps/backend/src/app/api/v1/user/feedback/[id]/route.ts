import type { NextRequest } from 'next/server'
import { ok, fail } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createFeedbackRepository } from '@/repositories/factory'
import { createFeedbackService, FeedbackError } from '@/services/core/feedback.service'

/**
 * 反馈详情 API
 *
 * GET - 获取单条反馈详情（含管理员回复），仅允许查看自己的反馈（决策 D14）
 */

export const GET = withV1Route({
  requireAuth: true,
  action: 'user_feedback:detail',
  handler: async ({ req, serviceContext, userId, params }) => {
    const { id } = params

    try {
      const service = createFeedbackService(
        { feedback: await createFeedbackRepository() },
        serviceContext,
      )

      const result = await service.getFeedbackDetail(userId, id as string)

      return createJsonApiResponse(req, ok(result))
    } catch (error) {
      if (error instanceof FeedbackError) {
        if (error.code === 'NOT_FOUND') {
          return createJsonApiResponse(req, fail('NOT_FOUND', error.message), { status: 404 })
        }
        // 决策 D14: 跨用户访问返回 403
        if (error.code === 'FORBIDDEN') {
          return createJsonApiResponse(req, fail('FORBIDDEN', error.message), { status: 403 })
        }
      }

      throw error
    }
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
