import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { UpdateSiteConfigRequestSchema } from '@/contracts/dtos/admin/site-config.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSiteConfigRepository } from '@/repositories/factory'
import { createAdminSiteConfigService } from '@/services/core/admin-site-config.service'

export const GET = withV1Route({
  action: 'admin:site:config:view',
  requireAccess: { action: 'read' as Action, scope: 'site-config' as Scope },
  handler: async ({ req, serviceContext }) => {
    const siteConfig = await createSiteConfigRepository()
    const service = createAdminSiteConfigService({ siteConfig }, serviceContext)
    const data = await service.getSiteConfig()

    return createJsonApiResponse(req, ok(data))
  },
})

export const PUT = withV1Route({
  action: 'admin:site:config:update',
  requireAccess: { action: 'write' as Action, scope: 'site-config' as Scope },
  schemas: { body: UpdateSiteConfigRequestSchema },
  handler: async ({ req, serviceContext, body }) => {
    const siteConfig = await createSiteConfigRepository()
    const service = createAdminSiteConfigService({ siteConfig }, serviceContext)
    const data = await service.updateSiteConfig(body!)

    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
