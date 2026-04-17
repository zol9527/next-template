import type { NextRequest } from 'next/server'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import type { AdminRunOrderFulfillmentResponse } from '@/plugins/ecommerce/contracts/order-fulfillment-jobs.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createOrderFulfillmentJobRepository } from '@/repositories/factory'
import { createOrderFulfillmentService } from '@/plugins/ecommerce/services/order-fulfillment.service'

export const POST = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:orders:write',
  requireAccess: { action: 'write' as Action, scope: 'orders' as Scope },
  handler: async ({ req, serviceContext }) => {
    const jobs = await createOrderFulfillmentJobRepository()
    const service = createOrderFulfillmentService({
      jobs,
    }, serviceContext)

    const result = await service.runDueJobs()
    const payload: AdminRunOrderFulfillmentResponse = { result }

    return createJsonApiResponse(req, ok(payload))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
