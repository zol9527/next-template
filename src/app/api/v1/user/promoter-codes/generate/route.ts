/**
 * POST /api/v1/promoter-codes/generate
 * 生成推广码
 */

import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import {
  type GeneratePromoterCodeResponse,
  GeneratePromoterCodeRequestSchema,
} from '@/plugins/promotion/contracts/promoter-codes.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { createPromoterCodeRepository, createDistributionRepository } from '@/repositories/factory'
import { createPromoterCodeService } from '@/plugins/promotion/services/promoter-code.service'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

export const POST = withV1Route({
  pluginGuard: 'promotion',
  requireAuth: true,
  action: 'promoter_codes:generate',
  schemas: { body: GeneratePromoterCodeRequestSchema },
  handler: async ({ req, body, serviceContext, userId }) => {
    const [promoterCodes, distributions] = await Promise.all([
      createPromoterCodeRepository(),
      createDistributionRepository(),
    ])

    const service = createPromoterCodeService({
      promoterCodes,
      distributions,
    }, serviceContext)

    const code = await service.generateCodeForPromoter({
      promoterUserId: userId,
      type: body!.type,
      customCode: body!.customCode,
      activeTo: body!.activeTo,
    })

    const payload: GeneratePromoterCodeResponse = { code }
    return createJsonApiResponse(req, ok(payload))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
