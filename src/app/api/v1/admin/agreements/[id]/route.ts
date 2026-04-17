import type { NextRequest } from 'next/server'

import { z } from 'zod'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { UpdateAgreementRequestSchema } from '@/contracts/dtos/admin/site-config.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createAgreementRepository } from '@/repositories/factory'
import { createAdminAgreementService } from '@/services/core/admin-site-config.service'

export const GET = withV1Route({
  action: 'admin:agreement:view',
  requireAccess: { action: 'read' as Action, scope: 'agreements' as Scope },
  schemas: {
    params: z.object({ id: z.string().uuid() })
  },
  handler: async ({ req, serviceContext, params }) => {
    const agreements = await createAgreementRepository()
    const service = createAdminAgreementService({ agreements }, serviceContext)
    const data = await service.getAgreementById(params.id)

    if (!data) {
      return createJsonApiResponse(req, { success: false, error: { code: 'NOT_FOUND', message: 'Agreement not found' } }, { status: 404 })
    }

    return createJsonApiResponse(req, ok(data))
  },
})

export const PUT = withV1Route({
  action: 'admin:agreement:update',
  requireAccess: { action: 'write' as Action, scope: 'agreements' as Scope },
  schemas: {
    params: z.object({ id: z.string().uuid() }),
    body: UpdateAgreementRequestSchema
  },
  handler: async ({ req, serviceContext, body, params }) => {
    const agreements = await createAgreementRepository()
    const service = createAdminAgreementService({ agreements }, serviceContext)
    const data = await service.updateAgreement({ agreementId: params.id, ...body })

    if (!data) {
      return createJsonApiResponse(req, { success: false, error: { code: 'NOT_FOUND', message: 'Agreement not found' } }, { status: 404 })
    }

    return createJsonApiResponse(req, ok(data))
  },
})

export const DELETE = withV1Route({
  action: 'admin:agreement:delete',
  requireAccess: { action: 'write' as Action, scope: 'agreements' as Scope },
  schemas: {
    params: z.object({ id: z.string().uuid() })
  },
  handler: async ({ req, serviceContext, params }) => {
    const agreements = await createAgreementRepository()
    const service = createAdminAgreementService({ agreements }, serviceContext)
    await service.deleteAgreement(params.id)

    return createJsonApiResponse(req, ok({ deleted: true }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
