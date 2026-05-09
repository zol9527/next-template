import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createLogViewerService } from '@/services/core/log-viewer.service'
import { ForbiddenError } from '@/lib/errors/app-error'
import { SetLogLevelBodySchema } from '@/contracts/dtos/admin/logs.dto'

const LOG_LEVEL_RATE_LIMIT_WINDOW_MS = 60_000
const LOG_LEVEL_RATE_LIMIT_MAX = 3

export const PATCH = withV1Route({
  action: 'admin:logs:level',
  requireAccess: { action: 'write' as Action, scope: 'logs' as Scope },
  schemas: {
    body: SetLogLevelBodySchema,
  },
  rateLimit: {
    max: LOG_LEVEL_RATE_LIMIT_MAX,
    windowMs: LOG_LEVEL_RATE_LIMIT_WINDOW_MS,
    identity: (ctx) => ctx.userId,
  },
  handler: async ({ req, serviceContext, auth, body, userId }) => {
    // 额外验证：仅 super-admin（admin 角色）可修改日志级别
    if (!auth?.hasRole('admin')) {
      throw new ForbiddenError('仅超级管理员可修改日志级别')
    }

    const logViewerService = createLogViewerService(serviceContext)
    const result = logViewerService.setLogLevel(body!.level, { actorId: userId! })

    return createJsonApiResponse(req, ok(result))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
