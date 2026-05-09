/**
 * GET /api/v1/promoter/profile
 * 获取推广员个人信息和等级
 */

import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { createPromoterRepository, createCommissionRepository, createDistributionRepository } from '@/repositories/factory'
import { createPromoterService } from '@/plugins/promotion/services/promoter.service'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

export const GET = withV1Route({
  pluginGuard: 'promotion',
  requireAuth: true,
  action: 'promoter:profile:read',
  handler: async ({ req, serviceContext, userId }) => {

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

    const profile = await service.getProfile(userId)

    const payload = { profile }
    return createJsonApiResponse(req, ok(payload))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
