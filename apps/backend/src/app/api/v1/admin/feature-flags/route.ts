import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSystemSettingsRepository } from '@/repositories/factory'
import { createAdminFeatureFlagService } from '@/services/core/admin-feature-flag.service'

export const GET = withV1Route({
  action: 'admin:feature_flags:view',
  requireAccess: { action: 'read' as Action, scope: 'feature-flags' as Scope },
  handler: async ({ req, serviceContext }) => {
    const systemSettings = await createSystemSettingsRepository()
    const service = createAdminFeatureFlagService({ systemSettings }, serviceContext)
    const data = await service.getAllFlags()

    return createJsonApiResponse(req, ok({ flags: data }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
