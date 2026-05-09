import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { ApplySettlementRequestSchema } from '@/plugins/promotion/contracts/distribution.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSettlementApplicationRepository, createSystemSettingsRepository, createCommissionRepository, createSettlementRepository } from '@/repositories/factory'
import { createAdminSettlementService } from '@/plugins/promotion/services/admin-settlement.service'
import { createSettlementApplicationService } from '@/plugins/promotion/services/settlement-application.service'

export const POST = withV1Route({
  pluginGuard: 'promotion',
  action: 'distribution:apply_settlement',
  requireAuth: true,
  schemas: { body: ApplySettlementRequestSchema },
  handler: async ({ req, body, serviceContext, userId }) => {

    const [commissions, settlements] = await Promise.all([
      createCommissionRepository(),
      createSettlementRepository(),
    ])

    const settlementService = createAdminSettlementService({
      commissions,
      settlements,
    }, serviceContext)

    const [applications, settings, commissions2] = await Promise.all([
      createSettlementApplicationRepository(),
      createSystemSettingsRepository(),
      createCommissionRepository(),
    ])

    const service = createSettlementApplicationService({
      applications,
      settings,
      commissions: commissions2,
      settlementService,
    }, serviceContext)

    // body 由 withV1Route 根据 schemas.body 校验并解析，保证存在
    const data = await service.apply({
      userId,
      request: body!,
    })

    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
