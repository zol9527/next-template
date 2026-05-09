import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import type { OrderStatsResponse } from '@/plugins/ecommerce/contracts/orders.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createOrderRepository, createProductRepository } from '@/repositories/factory'
import { createOrderService } from '@/plugins/ecommerce/services/order.service'

/**
 * Route: GET /api/v1/user/orders/stats
 *
 * Description: 获取当前用户的订单统计（待支付/已支付/已完成）
 */
export const GET = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'orders:stats',
  requireAuth: true,
  handler: async ({ req, serviceContext, userId }) => {
    const [orders, products] = await Promise.all([
      createOrderRepository(),
      createProductRepository(),
    ])

    const service = createOrderService({
      orders,
      products,
    }, serviceContext)

    const stats = await service.getOrderStatsForUser({ userId })
    const payload: OrderStatsResponse = stats

    return createJsonApiResponse(req, ok(payload))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
