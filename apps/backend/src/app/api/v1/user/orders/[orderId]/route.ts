import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { type OrderDetailResponse } from '@/plugins/ecommerce/contracts/orders.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { createOrderRepository, createProductRepository, createOrderFulfillmentJobRepository } from '@/repositories/factory'
import { createOrderService } from '@/plugins/ecommerce/services/order.service'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

export const GET = withV1Route<{ orderId: string }>({
  action: 'orders:get',
  requireAuth: true,
  handler: async ({ req, params, serviceContext, userId }) => {

    const [orders, products, fulfillmentJobs] = await Promise.all([
      createOrderRepository(),
      createProductRepository(),
      createOrderFulfillmentJobRepository(),
    ])

    const service = createOrderService({
      orders,
      products,
      fulfillmentJobs,
    }, serviceContext)

    const order = await service.getOrderForUser({ userId, orderId: params.orderId })
    const payload: OrderDetailResponse = { order }

    return createJsonApiResponse(req, ok(payload))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
