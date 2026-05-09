import type { NextRequest } from 'next/server'
import { z } from 'zod'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { ReviewSettlementApplicationRequestSchema } from '@/plugins/promotion/contracts/settlement-applications.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSettlementApplicationRepository, createSystemSettingsRepository, createCommissionRepository, createSettlementRepository } from '@/repositories/factory'
import { createAdminSettlementService } from '@/plugins/promotion/services/admin-settlement.service'
import { createSettlementApplicationService } from '@/plugins/promotion/services/settlement-application.service'

const ParamsSchema = z.object({
  id: z.string().uuid(),
})

export const POST = withV1Route({
  pluginGuard: 'promotion',
  action: 'admin:settlement-application:review',
  requireAccess: { action: 'execute' as Action, scope: 'settlement-applications' as Scope },
  schemas: {
    params: ParamsSchema,
    body: ReviewSettlementApplicationRequestSchema,
  },
  handler: async ({ req, params, body, serviceContext, userId }) => {

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

    const data = await service.reviewApplication({
      id: params.id,
      review: body!,
      reviewedBy: userId!,
    })
    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
