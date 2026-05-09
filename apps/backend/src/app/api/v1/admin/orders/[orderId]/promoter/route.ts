import type { Action, Scope } from '@/config/access'
/**
 * API: 订单绑定推广人
 *
 * POST /api/v1/admin/orders/[orderId]/promoter - 为订单用户绑定推广人
 *
 * @module api/v1/admin/orders/[orderId]/promoter
 */

import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { BindDistributionRequestSchema } from '@/plugins/promotion/contracts/distribution.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createOrderRepository, createDistributionRepository } from '@/repositories/factory'
import { createDistributionService } from '@/plugins/promotion/services/distribution.service'
import type { RepoContext } from '@/types/repo/repo-context'

export const POST = withV1Route({
  pluginGuard: 'promotion',
	action: 'admin:orders:bind_promoter',
	schemas: { body: BindDistributionRequestSchema },
	requireAccess: { action: 'execute' as Action, scope: 'orders.promoter' as Scope },
	handler: async ({ req, params, body, serviceContext }) => {
		const repoCtx: RepoContext = {
			traceId: serviceContext!.traceId,
			logger: serviceContext!.logger.child({ layer: 'repository' }),
		}

		const [orders, distributions] = await Promise.all([
			createOrderRepository(),
			createDistributionRepository(),
		])

		// 获取订单信息
		const order = await orders.getOrderById(repoCtx, { orderId: params.orderId as string })
		if (!order) {
			return createJsonApiResponse(
				req,
				{
					success: false,
					error: { code: 'NOT_FOUND', message: '订单不存在' },
				},
				{ status: 404 },
			)
		}

		const service = createDistributionService({ distributions }, serviceContext!)

		try {
			// 绑定推广关系（如果已存在且不同推广人会抛出错误）
			const relation = await service.bindDistribution({
				userId: order.userId,
				promoterUserId: body!.promoterUserId,
			})

			return createJsonApiResponse(req, ok({ relation }))
		} catch (error) {
			// 处理已有推广人的情况 - 使用 CONFLICT 状态码表示资源冲突
			return createJsonApiResponse(
				req,
				{
					success: false,
					error: {
						code: 'CONFLICT',
						message: error instanceof Error ? error.message : '绑定失败',
					},
				},
				{ status: 409 },
			)
		}
	},
})

export function OPTIONS(req: NextRequest) {
	return createOptionsResponse(req)
}
