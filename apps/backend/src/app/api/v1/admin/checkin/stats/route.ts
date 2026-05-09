import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createAdminCheckinStatsService } from '@/services/core/admin-checkin-stats.service'

export const GET = withV1Route({
  action: 'admin:checkin:stats',
  requireAccess: { action: 'read' as Action, scope: 'checkin' as Scope },
  handler: async ({ req, serviceContext }) => {
    const service = createAdminCheckinStatsService({}, serviceContext)
    const result = await service.getCheckinStats()
    return createJsonApiResponse(req, ok(result))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
