/**
 * GET /api/v1/promoter-codes
 * 列出我的推广码
 */

import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import {
  type ListPromoterCodesResponse,
  ListPromoterCodesQuerySchema,
} from '@/plugins/promotion/contracts/promoter-codes.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { createPromoterCodeRepository, createDistributionRepository } from '@/repositories/factory'
import { createPromoterCodeService } from '@/plugins/promotion/services/promoter-code.service'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

export const GET = withV1Route({
  pluginGuard: 'promotion',
  requireAuth: true,
  action: 'promoter_codes:list',
  schemas: { query: ListPromoterCodesQuerySchema },
  handler: async ({ req, serviceContext, userId, query }) => {

    const [promoterCodes, distributions] = await Promise.all([
      createPromoterCodeRepository(),
      createDistributionRepository(),
    ])

    const service = createPromoterCodeService({
      promoterCodes,
      distributions,
    }, serviceContext)

    const result = await service.listCodesForPromoter({
      promoterUserId: userId,
      limit: query.limit ?? 10,
      cursor: query.cursor ?? null,
      status: query.status ?? undefined,
    })

    const payload: ListPromoterCodesResponse = { codes: result.codes, nextCursor: result.nextCursor }
    return createJsonApiResponse(req, ok(payload))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
