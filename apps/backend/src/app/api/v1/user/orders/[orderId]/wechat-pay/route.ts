import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { CreateWechatPayRequestSchema, type CreateWechatPayResponse } from '@/plugins/wechat/contracts/wechat-pay.dto'
import { OrderIdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { createOrderRepository, createPaymentRepository, createProductRepository, createOrderFulfillmentJobRepository, createWechatAccountRepository } from '@/repositories/factory'
import { createWechatPayService } from '@/plugins/wechat/services/wechat-pay.service'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

export const POST = withV1Route({
  pluginGuard: 'wechat',
  requireAuth: true,
  action: 'wechat:pay:create',
  schemas: { params: OrderIdParamsSchema, body: CreateWechatPayRequestSchema },
  handler: async ({ req, params, body, serviceContext, userId }) => {

    const [orders, payments, products, fulfillmentJobs, wechatAccounts] = await Promise.all([
      createOrderRepository(),
      createPaymentRepository(),
      createProductRepository(),
      createOrderFulfillmentJobRepository(),
      createWechatAccountRepository(),
    ])

    const service = createWechatPayService({
      orders,
      payments,
      products,
      fulfillmentJobs,
      wechatAccounts,
    }, serviceContext)

    const result = await service.createJsapiPayForOrder({ userId, orderId: params.orderId, payerOpenId: body!.payerOpenId })
    const payload: CreateWechatPayResponse = { prepayId: result.prepayId, params: result.params }

    return createJsonApiResponse(req, ok(payload))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
