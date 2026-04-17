import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { AdminOrderSettlementViewQuerySchema } from '@/plugins/ecommerce/contracts/order-settlement-view.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createCommissionRepository } from '@/repositories/factory'
import { createAdminOrderSettlementViewService } from '@/plugins/ecommerce/services/admin-order-settlement-view.service'

export const GET = withV1Route({
  pluginGuard: 'promotion',
  action: 'admin:settlements:read',
  requireAccess: { action: 'read' as Action, scope: 'settlements' as Scope },
  schemas: { query: AdminOrderSettlementViewQuerySchema },
  handler: async ({ req, query, serviceContext }) => {
    const service = createAdminOrderSettlementViewService({
      commissions: await createCommissionRepository(),
    }, serviceContext!)

    const data = await service.listOrderView(query)

    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
