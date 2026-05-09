import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createLogViewerService } from '@/services/core/log-viewer.service'
import { ForbiddenError } from '@/lib/errors/app-error'

export const GET = withV1Route({
  action: 'admin:logs:config',
  requireAccess: { action: 'read' as Action, scope: 'logs' as Scope },
  handler: async ({ req, serviceContext, auth }) => {
    // 额外验证：仅管理员可访问
    if (!auth?.hasRole('admin')) {
      throw new ForbiddenError('仅管理员可访问日志管理功能')
    }

    const logViewerService = createLogViewerService(serviceContext)
    const config = logViewerService.getConfig()

    return createJsonApiResponse(req, ok(config))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
