import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok, fail } from '@/contracts/api-response.schema'
import { IdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { UpdateFeedbackStatusRequestSchema } from '@/contracts/dtos/admin-feedback.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createFeedbackRepository } from '@/repositories/factory'
import { createAdminFeedbackService, AdminFeedbackError } from '@/services/core/admin-feedback.service'

// 管理员查看反馈详情
export const GET = withV1Route({
  action: 'admin:feedback:read',
  requireAccess: { action: 'read' as Action, scope: 'feedback' as Scope },
  schemas: { params: IdParamsSchema },
  handler: async ({ serviceContext, params, req }) => {
    const feedback = await createFeedbackRepository()
    const service = createAdminFeedbackService({ feedback }, serviceContext!)

    try {
      const data = await service.getFeedbackDetail(params.id)
      return createJsonApiResponse(req, ok(data))
    } catch (error) {
      if (error instanceof AdminFeedbackError && error.code === 'NOT_FOUND') {
        return createJsonApiResponse(req, fail('NOT_FOUND', error.message), { status: 404 })
      }
      throw error
    }
  },
})

// 管理员更新反馈状态（决策 D13：状态流转校验在 service 层）
export const PATCH = withV1Route({
  action: 'admin:feedback:update',
  requireAccess: { action: 'write' as Action, scope: 'feedback' as Scope },
  schemas: { params: IdParamsSchema, body: UpdateFeedbackStatusRequestSchema },
  handler: async ({ serviceContext, params, body, req }) => {
    const feedback = await createFeedbackRepository()
    const service = createAdminFeedbackService({ feedback }, serviceContext!)

    try {
      const data = await service.updateFeedbackStatus(params.id, body!.status)
      return createJsonApiResponse(req, ok(data))
    } catch (error) {
      if (error instanceof AdminFeedbackError) {
        if (error.code === 'NOT_FOUND') {
          return createJsonApiResponse(req, fail('NOT_FOUND', error.message), { status: 404 })
        }
        if (error.code === 'INVALID_STATUS_TRANSITION') {
          return createJsonApiResponse(req, fail('CONFLICT', error.message), { status: 409 })
        }
      }
      throw error
    }
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
