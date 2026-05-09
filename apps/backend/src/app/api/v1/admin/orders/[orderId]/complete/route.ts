import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { OrderIdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import {
	createOrderRepository,
	createCommissionRepository,
	createDistributionRepository,
	createPromoterRepository,
	createPaymentRepository,
	createProductRepository,
	createOrderFulfillmentJobRepository,
	createWechatAccountRepository,
	createUserRepository,
	createCouponRepository,
} from '@/repositories/factory'
import { createCommissionService } from '@/plugins/promotion/services/commission.service'
import { createAdminOrderService } from '@/plugins/ecommerce/services/admin-order.service'
import { createWechatPayService } from '@/plugins/wechat/services/wechat-pay.service'

export const POST = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:orders:write',
  schemas: { params: OrderIdParamsSchema },
  requireAccess: { action: 'write' as Action, scope: 'orders' as Scope },
  handler: async ({ req, params, userId, serviceContext }) => {
    const { orderId } = params

    const [orders, commissions, distributions, promoters, payments, products, fulfillmentJobs, wechatAccounts, users, coupons] = await Promise.all([
      createOrderRepository(),
      createCommissionRepository(),
      createDistributionRepository(),
      createPromoterRepository(),
      createPaymentRepository(),
      createProductRepository(),
      createOrderFulfillmentJobRepository(),
      createWechatAccountRepository(),
      createUserRepository(),
      createCouponRepository(),
    ])

    const commissionService = createCommissionService({
      commissions,
      distributions,
      promoters,
    }, serviceContext!)

    const wechatPayService = createWechatPayService({
      orders,
      payments,
      products,
      fulfillmentJobs,
      wechatAccounts,
    }, serviceContext!)

    const service = createAdminOrderService({
      orders,
      products,
      commissions,
      distributions,
      users,
      coupons,
      commissionService,
      wechatPayService,
    }, serviceContext!)

    const data = await service.completeOrder({ orderId, completedBy: userId! })
    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
