/**
 * DELETE /api/v1/promoter-codes/:id
 * 删除推广码
 */

import type { NextRequest } from 'next/server'


import { z } from 'zod'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { createPromoterCodeRepository, createDistributionRepository } from '@/repositories/factory'
import { createPromoterCodeService } from '@/plugins/promotion/services/promoter-code.service'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

export const DELETE = withV1Route({
  pluginGuard: 'promotion',
  requireAuth: true,
  action: 'promoter_codes:delete',
    schemas: {
      params: z.object({ id: z.string().uuid() })
    },
  handler: async ({ req, serviceContext, userId, params }) => {
    const promoterCodes = await createPromoterCodeRepository()
    const distributions = await createDistributionRepository()

    const service = createPromoterCodeService({
      promoterCodes,
      distributions,
    }, serviceContext)

    const { id } = params

    await service.deleteCode({
      id,
      promoterUserId: userId,
    })

    return createJsonApiResponse(req, ok({ success: true }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
