/**
 * GET /api/v1/promoter/commissions
 * 获取佣金记录列表
 */

import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import type { PromoterCommissionsResponse } from '@/plugins/promotion/contracts/promoter.dto'
import { PromoterCommissionsQuerySchema } from '@/plugins/promotion/contracts/promoter.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { createPromoterRepository, createCommissionRepository, createDistributionRepository } from '@/repositories/factory'
import { createPromoterService } from '@/plugins/promotion/services/promoter.service'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

export const GET = withV1Route({
  pluginGuard: 'promotion',
  requireAuth: true,
  action: 'promoter:commissions:read',
  schemas: { query: PromoterCommissionsQuerySchema },
  handler: async ({ req, serviceContext, userId, query }) => {

    const [promoters, commissions, distributions] = await Promise.all([
      createPromoterRepository(),
      createCommissionRepository(),
      createDistributionRepository(),
    ])

    const service = createPromoterService({
      promoters,
      commissions,
      distributions,
    }, serviceContext)

    const data = await service.listCommissions({
      userId,
      ...query,
    })

    const payload: PromoterCommissionsResponse = data
    return createJsonApiResponse(req, ok(payload))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
