import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import {
  FeatureFlagKeyParamSchema,
  ToggleFeatureFlagRequestSchema,
} from '@/contracts/dtos/admin/site-config.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSystemSettingsRepository } from '@/repositories/factory'
import { createAdminFeatureFlagService } from '@/services/core/admin-feature-flag.service'

export const PATCH = withV1Route({
  action: 'admin:feature_flags:update',
  requireAccess: { action: 'write' as Action, scope: 'feature-flags' as Scope },
  schemas: {
    body: ToggleFeatureFlagRequestSchema,
  },
  handler: async ({ req, serviceContext, params, body }) => {

    const parsedParams = FeatureFlagKeyParamSchema.safeParse(params)
    if (!parsedParams.success) {
      throw new Error('Invalid feature flag key')
    }

    const systemSettings = await createSystemSettingsRepository()
    const service = createAdminFeatureFlagService({ systemSettings }, serviceContext)

    await service.toggleFlag({ key: parsedParams.data.key, enabled: body!.enabled })

    return createJsonApiResponse(req, ok({ updated: true }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
