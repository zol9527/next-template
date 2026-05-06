import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { AdminFeedbackListQuerySchema } from '@/contracts/dtos/admin-feedback.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createFeedbackRepository } from '@/repositories/factory'
import { createAdminFeedbackService } from '@/services/core/admin-feedback.service'

// 管理员查询全部反馈列表（决策 D14：无归属限制）
export const GET = withV1Route({
  action: 'admin:feedback:read',
  requireAccess: { action: 'read' as Action, scope: 'feedback' as Scope },
  schemas: { query: AdminFeedbackListQuerySchema },
  handler: async ({ serviceContext, query, req }) => {
    const feedback = await createFeedbackRepository()
    const service = createAdminFeedbackService({ feedback }, serviceContext!)
    const data = await service.listAllFeedback(query)

    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
