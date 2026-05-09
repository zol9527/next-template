import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { OrderIdParamsSchema } from '@/contracts/dtos/route-params.dto'
import { AdminRefundOrderRequestSchema } from '@/plugins/ecommerce/contracts/admin-orders.dto'
import { fail } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createDistributionRepository, createCommissionRepository, createOrderRepository, createPaymentRepository, createProductRepository, createOrderFulfillmentJobRepository, createWechatAccountRepository, createPromoterRepository, createUserRepository, createCouponRepository, createIdempotencyRepository, createMfaRepository } from '@/repositories/factory'
import { createCommissionService } from '@/plugins/promotion/services/commission.service'
import { MfaActionTokenService } from '@/services/core/mfa-action-token.service'
import { createHash } from 'node:crypto'
import { createAdminOrderService } from '@/plugins/ecommerce/services/admin-order.service'
import { createWechatPayService } from '@/plugins/wechat/services/wechat-pay.service'

export const POST = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:orders:write',
  schemas: {
    params: OrderIdParamsSchema,
    body: AdminRefundOrderRequestSchema
  },
  requireAccess: { action: 'write' as Action, scope: 'orders' as Scope },
  handler: async ({ req, params, body, userId, serviceContext }) => {
    const { orderId } = params
    const { refundAmount, reason, refundIntentId, actionToken } = body!

    const mfaRepo = await createMfaRepository()
    const tokenHash = createHash('sha256').update(actionToken).digest('hex')
    const storedToken = await mfaRepo.getActionToken(serviceContext!, { tokenHash })

    if (!storedToken) {
      return createJsonApiResponse(req, fail('INVALID_INPUT', '无效的或已过期的操作令牌'), { status: 400 })
    }

    const verification = MfaActionTokenService.verifyAndConsumeToken(actionToken, 'refund', storedToken)

    if (!verification.valid) {
      return createJsonApiResponse(req, fail('INVALID_INPUT', '无效的或已过期的操作令牌'), { status: 400 })
    }

    await mfaRepo.consumeActionToken(serviceContext!, { tokenHash })

    const [orders, commissions, distributions, promoters, payments, products, fulfillmentJobs, wechatAccounts, users, coupons, idempotency] = await Promise.all([
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
      createIdempotencyRepository(),
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
      idempotency,
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

    const data = await service.refundOrder({
      orderId,
      refundAmount,
      reason,
      refundIntentId,
      refundedBy: userId!
    })

    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
