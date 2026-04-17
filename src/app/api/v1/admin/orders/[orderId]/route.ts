import type { Action, Scope } from '@/config/access'
/**
 * API: 订单详情
 *
 * GET /api/v1/admin/orders/[orderId] - 获取订单详情（包含商品、优惠券、推广人信息）
 *
 * @module api/v1/admin/orders/[orderId]
 */

import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import {
	createOrderRepository,
	createCommissionRepository,
	createDistributionRepository,
	createPromoterRepository,
	createProductRepository,
	createUserRepository,
	createCouponRepository,
} from '@/repositories/factory'
import { createCommissionService } from '@/plugins/promotion/services/commission.service'
import { createAdminOrderService } from '@/plugins/ecommerce/services/admin-order.service'

export const GET = withV1Route({
  pluginGuard: 'ecommerce',
	action: 'admin:orders:detail',
	schemas: {
		params: z.object({ orderId: z.string().uuid() })
	},
	requireAccess: { action: 'read' as Action, scope: 'orders' as Scope },
	handler: async ({ req, params, serviceContext }) => {
		// 注入依赖
		const [orders, products, commissions, distributions, promoters, users, coupons] = await Promise.all([
			createOrderRepository(),
			createProductRepository(),
			createCommissionRepository(),
			createDistributionRepository(),
			createPromoterRepository(),
			createUserRepository(),
			createCouponRepository(),
		])

		const commissionService = createCommissionService(
			{
				commissions,
				distributions,
				promoters,
			},
			serviceContext!,
		)

		const service = createAdminOrderService(
			{
				orders,
				products,
				commissions,
				distributions,
				users,
				coupons,
				commissionService,
				wechatPayService: null as never, // 不需要微信支付服务
			},
			serviceContext!,
		)

		const orderId = params.orderId
		const data = await service.getOrderDetail({ orderId })

		return createJsonApiResponse(req, ok(data))
	},
})

export function OPTIONS(req: NextRequest) {
	return createOptionsResponse(req)
}
