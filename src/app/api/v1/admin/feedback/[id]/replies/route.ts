import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok, fail } from '@/contracts/api-response.schema'
import { IdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { CreateReplyRequestSchema } from '@/contracts/dtos/admin-feedback.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createFeedbackRepository } from '@/repositories/factory'
import { createAdminFeedbackService, AdminFeedbackError } from '@/services/core/admin-feedback.service'

/**
 * POST /api/v1/admin/feedback/[id]/replies — 管理员回复反馈
 *
 * requireAccess 路由同时提供 userId（管理员 ID），用于关联回复作者
 */
export const POST = withV1Route({
  action: 'admin:feedback:reply',
  requireAccess: { action: 'write' as Action, scope: 'feedback' as Scope },
  schemas: { params: IdParamsSchema, body: CreateReplyRequestSchema },
  handler: async ({ serviceContext, userId, params, body, req }) => {
    const feedback = await createFeedbackRepository()
    const service = createAdminFeedbackService({ feedback }, serviceContext!)

    try {
      const data = await service.replyToFeedback(userId!, params.id, body!.content)
      return createJsonApiResponse(req, ok(data))
    } catch (error) {
      if (error instanceof AdminFeedbackError && error.code === 'NOT_FOUND') {
        return createJsonApiResponse(req, fail('NOT_FOUND', error.message), { status: 404 })
      }
      throw error
    }
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
