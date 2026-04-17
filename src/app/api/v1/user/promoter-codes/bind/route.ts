/**
 * POST /api/v1/promoter-codes/bind
 * 通过推广码绑定分销关系
 */

import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import {
  type BindByPromoterCodeResponse,
  BindByPromoterCodeRequestSchema,
} from '@/plugins/promotion/contracts/promoter-codes.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { createPromoterCodeRepository, createDistributionRepository } from '@/repositories/factory'
import { createPromoterCodeService } from '@/plugins/promotion/services/promoter-code.service'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

export const POST = withV1Route({
  pluginGuard: 'promotion',
  requireAuth: true,
  action: 'promoter_codes:bind',
  schemas: { body: BindByPromoterCodeRequestSchema },
  handler: async ({ req, serviceContext, userId, body }) => {

    const [promoterCodes, distributions] = await Promise.all([
      createPromoterCodeRepository(),
      createDistributionRepository(),
    ])

    const service = createPromoterCodeService({
      promoterCodes,
      distributions,
    }, serviceContext)

    const relation = await service.bindByPromoterCode({ userId, code: body!.code })

    const payload: BindByPromoterCodeResponse = { relation }
    return createJsonApiResponse(req, ok(payload))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
