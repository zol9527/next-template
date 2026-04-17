import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { UpsertAgreementRequestSchema } from '@/contracts/dtos/admin/site-config.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createAgreementRepository } from '@/repositories/factory'
import { createAdminAgreementService } from '@/services/core/admin-site-config.service'

export const GET = withV1Route({
  action: 'admin:agreement:view',
  requireAccess: { action: 'read' as Action, scope: 'agreements' as Scope },
  handler: async ({ req, serviceContext }) => {
    const agreements = await createAgreementRepository()
    const service = createAdminAgreementService({ agreements }, serviceContext)
    const data = await service.listAgreements()

    return createJsonApiResponse(req, ok(data))
  },
})

export const POST = withV1Route({
  action: 'admin:agreement:create',
  requireAccess: { action: 'write' as Action, scope: 'agreements' as Scope },
  schemas: { body: UpsertAgreementRequestSchema },
  handler: async ({ req, serviceContext, body }) => {
    const agreements = await createAgreementRepository()
    const service = createAdminAgreementService({ agreements }, serviceContext)
    const data = await service.upsertAgreement(body!)

    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
