/**
 * PATCH /api/v1/promoter-codes/[id]/status
 * 更新推广码状态
 */

import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { ok } from '@/contracts/api-response.schema'
import {
  type UpdatePromoterCodeStatusResponse,
  UpdatePromoterCodeStatusRequestSchema,
} from '@/plugins/promotion/contracts/promoter-codes.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { createPromoterCodeRepository, createDistributionRepository } from '@/repositories/factory'
import { createPromoterCodeService } from '@/plugins/promotion/services/promoter-code.service'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

export const PATCH = withV1Route({
  pluginGuard: 'promotion',
  requireAuth: true,
  action: 'promoter_codes:update_status',
  schemas: {
    params: z.object({ id: z.string().uuid() }),
    body: UpdatePromoterCodeStatusRequestSchema
  },
  handler: async ({ req, serviceContext, userId, params, body }) => {
    const [promoterCodes, distributions] = await Promise.all([
      createPromoterCodeRepository(),
      createDistributionRepository(),
    ])

    const service = createPromoterCodeService({
      promoterCodes,
      distributions,
    }, serviceContext)

    // body 由 withV1Route 根据 schemas.body 校验并解析，保证存在
    const code = await service.updateCodeStatus({
      id: params.id,
      status: body!.status,
      promoterUserId: userId,
    })

    const payload: UpdatePromoterCodeStatusResponse = { code }
    return createJsonApiResponse(req, ok(payload))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
