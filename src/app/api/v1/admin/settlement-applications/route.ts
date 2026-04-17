import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { AdminSettlementApplicationListQuerySchema } from '@/plugins/promotion/contracts/settlement-applications.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSettlementApplicationRepository, createSystemSettingsRepository, createCommissionRepository, createSettlementRepository } from '@/repositories/factory'
import { createAdminSettlementService } from '@/plugins/promotion/services/admin-settlement.service'
import { createSettlementApplicationService } from '@/plugins/promotion/services/settlement-application.service'

export const GET = withV1Route({
  pluginGuard: 'promotion',
  action: 'admin:settlement-application:list',
  requireAccess: { action: 'read' as Action, scope: 'settlement-applications' as Scope },
  schemas: {
    query: AdminSettlementApplicationListQuerySchema,
  },
  handler: async ({ req, query, serviceContext, auth }) => {
    const settlementService = createAdminSettlementService({
      commissions: await createCommissionRepository(),
      settlements: await createSettlementRepository(),
    }, serviceContext!)

    const service = createSettlementApplicationService({
      applications: await createSettlementApplicationRepository(),
      settings: await createSystemSettingsRepository(),
      commissions: await createCommissionRepository(),
      settlementService,
    }, serviceContext!)

    const isAdmin = auth?.roles.includes('admin') ?? false
    const data = await service.listApplications({
      ...query,
      promoterUserId: !isAdmin ? auth!.userId : undefined,
    })
    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
