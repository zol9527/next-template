import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { AdminCreateSettlementRequestSchema, AdminSettlementListQuerySchema } from '@/plugins/promotion/contracts/settlements.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createCommissionRepository, createSettlementRepository } from '@/repositories/factory'
import { createAdminSettlementService } from '@/plugins/promotion/services/admin-settlement.service'

export const GET = withV1Route({
  pluginGuard: 'promotion',
  action: 'admin:settlements:read',
  requireAccess: { action: 'read' as Action, scope: 'settlements' as Scope },
  schemas: { query: AdminSettlementListQuerySchema },
  handler: async ({ req, query, serviceContext, auth }) => {
    const service = createAdminSettlementService({
      commissions: await createCommissionRepository(),
      settlements: await createSettlementRepository(),
    }, serviceContext!)

    const isAdmin = auth?.roles.includes('admin') ?? false
    const { items, nextCursor } = await service.listSettlements({
      limit: query.limit,
      cursor: query.cursor ?? null,
      status: query.status ?? null,
      settlementId: query.settlementId ?? null,
      promoterUserId: !isAdmin ? auth!.userId : undefined,
    })

    return createJsonApiResponse(req, ok({ items, nextCursor }))
  },
})

export const POST = withV1Route({
  pluginGuard: 'promotion',
  action: 'admin:settlements:write',
  requireAccess: { action: 'write' as Action, scope: 'settlements' as Scope },
  schemas: { body: AdminCreateSettlementRequestSchema },
  handler: async ({ req, body, serviceContext, userId }) => {

    const service = createAdminSettlementService({
      commissions: await createCommissionRepository(),
      settlements: await createSettlementRepository(),
    }, serviceContext!)

    const data = await service.createSettlement({
      commissionRecordIds: body!.commissionRecordIds,
      createdBy: userId!,
    })

    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
