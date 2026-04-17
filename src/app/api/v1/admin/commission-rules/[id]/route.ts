import type { NextRequest } from 'next/server'
import { z } from 'zod'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { UpdateCommissionRuleRequestSchema } from '@/plugins/promotion/contracts/commission-rules.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createCommissionRepository } from '@/repositories/factory'
import { createAdminCommissionRuleService } from '@/plugins/promotion/services/admin-commission-rule.service'

const ParamsSchema = z.object({
  id: z.string().uuid(),
})

export const PATCH = withV1Route({
  pluginGuard: 'promotion',
  action: 'admin:commission-rule:manage',
  requireAccess: { action: 'write' as Action, scope: 'commission-rules' as Scope },
  schemas: {
    params: ParamsSchema,
    body: UpdateCommissionRuleRequestSchema,
  },
  handler: async ({ req, params, body, serviceContext, userId }) => {

    const service = createAdminCommissionRuleService({
      commissions: await createCommissionRepository(),
    }, serviceContext!)

    const data = await service.updateRule({
      id: params.id,
      rule: body!,
      updatedBy: userId!,
    })
    return createJsonApiResponse(req, ok(data))
  },
})

export const DELETE = withV1Route({
  pluginGuard: 'promotion',
  action: 'admin:commission-rule:manage',
  requireAccess: { action: 'write' as Action, scope: 'commission-rules' as Scope },
  schemas: {
    params: ParamsSchema,
  },
  handler: async ({ req, params, serviceContext, userId }) => {
    const service = createAdminCommissionRuleService({
      commissions: await createCommissionRepository(),
    }, serviceContext!)

    await service.deleteRule({
      id: params.id,
      deletedBy: userId!,
    })
    return createJsonApiResponse(req, ok({ success: true }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
