import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { AdminCommissionListQuerySchema } from '@/plugins/promotion/contracts/commissions.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createDistributionRepository, createCommissionRepository, createPromoterRepository } from '@/repositories/factory'
import { createCommissionService } from '@/plugins/promotion/services/commission.service'

export const GET = withV1Route({
  pluginGuard: 'promotion',
  action: 'admin:commissions:read',
  requireAccess: { action: 'read' as Action, scope: 'commissions' as Scope },
  schemas: { query: AdminCommissionListQuerySchema },
  handler: async ({ req, query, serviceContext, auth }) => {
    const service = createCommissionService({
      commissions: await createCommissionRepository(),
      distributions: await createDistributionRepository(),
      promoters: await createPromoterRepository(),
    }, serviceContext!)

    const isAdmin = auth?.roles.includes('admin') ?? false
    const data = await service.listAdminCommissionRecords({
      limit: query.limit,
      cursor: query.cursor ?? null,
      status: query.status ?? null,
      promoterUserId: !isAdmin ? auth!.userId : (query.promoterUserId ?? null),
      orderNo: query.orderNo ?? null,
      keyword: query.keyword ?? null,
    })

    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
