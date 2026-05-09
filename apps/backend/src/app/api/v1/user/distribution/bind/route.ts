import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { BindDistributionRequestSchema, type BindDistributionResponse } from '@/plugins/promotion/contracts/distribution.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { createDistributionRepository } from '@/repositories/factory'
import { createDistributionService } from '@/plugins/promotion/services/distribution.service'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

export const POST = withV1Route({
  pluginGuard: 'promotion',
  action: 'distribution:bind',
  requireAuth: true,
  schemas: { body: BindDistributionRequestSchema },
  handler: async ({ req, body, serviceContext, userId }) => {

    const distributions = await createDistributionRepository()
    const service = createDistributionService({ distributions }, serviceContext)
    const relation = await service.bindDistribution({ userId, promoterUserId: body!.promoterUserId })

    const payload: BindDistributionResponse = { relation }
    return createJsonApiResponse(req, ok(payload))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
