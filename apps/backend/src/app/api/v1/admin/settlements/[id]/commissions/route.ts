import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSettlementRepository, createCommissionRepository } from '@/repositories/factory'
import { createAdminSettlementService } from '@/plugins/promotion/services/admin-settlement.service'

export const GET = withV1Route({
  pluginGuard: 'promotion',
  action: 'admin:settlements:read',
  requireAccess: { action: 'read' as Action, scope: 'settlements' as Scope },
  handler: async ({ req, params, serviceContext }) => {
    const { id } = params as { id: string }
    const service = createAdminSettlementService({
      commissions: await createCommissionRepository(),
      settlements: await createSettlementRepository(),
    }, serviceContext!)
    const items = await service.getSettlementCommissions(id)

    return createJsonApiResponse(req, ok({ items }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
