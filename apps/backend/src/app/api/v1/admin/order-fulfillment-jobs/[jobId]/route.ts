import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok, fail } from '@/contracts/api-response.schema'
import type { AdminOrderFulfillmentJobDetailResponse } from '@/plugins/ecommerce/contracts/order-fulfillment-jobs.dto'
import { OrderFulfillmentJobIdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createOrderFulfillmentJobRepository } from '@/repositories/factory'
import { createAdminOrderFulfillmentJobService } from '@/plugins/ecommerce/services/admin-order-fulfillment-job.service'

export const GET = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:orders:read',
  requireAccess: { action: 'read' as Action, scope: 'orders' as Scope },
  schemas: { params: OrderFulfillmentJobIdParamsSchema },
  handler: async ({ req, serviceContext, params }) => {
    const jobs = await createOrderFulfillmentJobRepository()
    const service = createAdminOrderFulfillmentJobService({
      jobs,
    }, serviceContext)

    const job = await service.getJobById({ jobId: params.jobId })
    if (!job) {
      return createJsonApiResponse(req, fail('NOT_FOUND', 'Job not found'), { status: 404 })
    }

    const payload: AdminOrderFulfillmentJobDetailResponse = { job }
    return createJsonApiResponse(req, ok(payload))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
