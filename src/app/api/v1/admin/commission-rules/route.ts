import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { CreateCommissionRuleRequestSchema, AdminCommissionRuleListQuerySchema } from '@/plugins/promotion/contracts/commission-rules.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createCommissionRepository } from '@/repositories/factory'
import { createAdminCommissionRuleService } from '@/plugins/promotion/services/admin-commission-rule.service'

export const GET = withV1Route({
  pluginGuard: 'promotion',
  action: 'admin:commission-rules:read',
  requireAccess: { action: 'read' as Action, scope: 'commission-rules' as Scope },
  schemas: {
    query: AdminCommissionRuleListQuerySchema,
  },
  handler: async ({ req, query, serviceContext }) => {
    const service = createAdminCommissionRuleService({
      commissions: await createCommissionRepository(),
    }, serviceContext!)

    const data = await service.listRules(query)
    return createJsonApiResponse(req, ok(data))
  },
})

export const POST = withV1Route({
  pluginGuard: 'promotion',
  action: 'admin:commission-rule:manage',
  requireAccess: { action: 'write' as Action, scope: 'commission-rules' as Scope },
  schemas: {
    body: CreateCommissionRuleRequestSchema,
  },
  handler: async ({ req, body, serviceContext, userId }) => {

    const service = createAdminCommissionRuleService({
      commissions: await createCommissionRepository(),
    }, serviceContext!)

    const data = await service.createRule({
      rule: body!,
      createdBy: userId!,
    })
    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
