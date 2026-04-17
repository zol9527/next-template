import type {
	AdminCompleteOrderResponse,
	AdminOrder,
	AdminOrderListResponse,
	AdminRefundOrderResponse,
	AdminOrderDetailResponse,
} from '@/plugins/ecommerce/contracts/admin-orders.dto'
import type { Order } from '@/plugins/ecommerce/contracts/orders.dto'
import type { OrderRepository } from '@/plugins/ecommerce/repositories/interfaces/order.interface'
import { OrderHookRegistry } from '@/services/core/order-hooks.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import type { ProductRepository } from '@/plugins/ecommerce/repositories/interfaces/product.interface'
import type { CommissionRepository } from '@/plugins/promotion/repositories/interfaces/commission.interface'
import type { DistributionRepository } from '@/plugins/promotion/repositories/interfaces/distribution.interface'
import type { UserRepository } from '@/repositories/interfaces/core/user.interface'
import type { CouponRepository } from '@/plugins/ecommerce/repositories/interfaces/coupon.interface'

/**
 * 本地接口：佣金服务的能力契约。
 * 用于解耦 admin-order.service 对 promotion 模块具体实现的直接依赖。
 * 路由层传入的 commissionService 必须满足此接口。
 */
interface CommissionServiceLike {
	markCommissionPayableForCompletedOrder(params: {
		orderId: string
		completedAtIso: string
	}): Promise<any>
	getCommissionsByOrderId(orderId: string): Promise<Array<{ status: string }>>
	adjustCommissionForRefund(params: { orderId: string; refundAmount: string }): Promise<void>
}

/**
 * 本地接口：微信支付退款能力契约。
 * 用于解耦 admin-order.service 对 wechat 模块具体实现的直接依赖。
 * 路由层传入的 wechatPayService 必须满足此接口。
 */
interface WechatPayRefundLike {
	refund(params: {
		orderId: string
		refundAmount: string
		reason?: string
		refundIntentId?: string
	}): Promise<{ applied: boolean; outRefundNo: string }>
}

export class AdminOrderServiceError extends Error {
	public readonly code: 'NOT_FOUND' | 'INVALID_STATE' | 'INTERNAL_ERROR'

	constructor(code: AdminOrderServiceError['code'], message: string) {
		super(message)
		this.code = code
	}
}

function toAdminOrder(order: Order): AdminOrder {
	return {
		id: order.id,
		orderNo: order.orderNo,
		userId: order.userId,
		userUsername: null,
		userPhone: null,
		productId: order.productId,
		productName: null,
		priceAmount: order.priceAmount,
		currencyCode: order.currencyCode,
		paidAmount: order.paidAmount,
		refundedAmount: order.refundedAmount,
		status: order.status,
		createdAt: order.createdAt,
		paidAt: order.paidAt,
		completedAt: order.completedAt,
		closedAt: order.closedAt,
		updatedAt: order.updatedAt,
	}
}

/**
 * Function: createAdminOrderService
 *
 * Description: 创建后台订单服务，提供订单列表查询与"确认完成/交付确认"（幂等）能力。
 *   跨域操作（佣金推进、微信支付退款）通过 OrderHookRegistry 钩子机制解耦。
 *
 * Parameters:
 *   deps({ orders, products, commissions, distributions, users, coupons, commissionService?, wechatPayService?, hookRegistry? }): 依赖注入
 *   ctx(ServiceContext): Service 上下文
 *
 * Returns:
 *   service(object): 提供 listOrders/completeOrder/refundOrder/getOrderDetail 的服务对象
 */
export function createAdminOrderService(
	deps: {
		orders: OrderRepository
		products: ProductRepository
		commissions: CommissionRepository
		distributions: DistributionRepository
		users: UserRepository
		coupons: CouponRepository
		/** @deprecated 使用 hookRegistry 替代，将在下一阶段移除 */
		commissionService?: CommissionServiceLike
		/** @deprecated 使用 hookRegistry 替代，将在下一阶段移除 */
		wechatPayService?: WechatPayRefundLike
		/** 外部传入的钩子注册表，如果不传则自动创建并从上述服务注册 */
		hookRegistry?: OrderHookRegistry
	},
	ctx: ServiceContext,
) {
	const { logger } = ctx

	const repoCtx: RepoContext = {
		traceId: ctx.traceId,
		logger: ctx.logger.child({ layer: 'repository' }),
	}

	// 初始化钩子注册表：优先使用外部传入，否则自动创建并从 deps 注册
	const registry = deps.hookRegistry ?? new OrderHookRegistry()

	if (deps.commissionService && !deps.hookRegistry) {
		const cs = deps.commissionService
		registry.register({
			async onOrderCompleted(order, completedAtIso) {
				await cs.markCommissionPayableForCompletedOrder({
					orderId: order.id,
					completedAtIso,
				})
			},
			async beforeOrderRefund(order, _refundAmount) {
				const commissions = await cs.getCommissionsByOrderId(order.id)
				const hasSettlingOrSettled = commissions.some(
					(c) => c.status === 'settling' || c.status === 'settled',
				)
				if (hasSettlingOrSettled) {
					throw new AdminOrderServiceError(
						'INVALID_STATE',
						'佣金已进入结算流程，不可退款。请联系财务人工处理。',
					)
				}
			},
			async onOrderRefundApplied(order, refundAmount) {
				await cs.adjustCommissionForRefund({
					orderId: order.id,
					refundAmount,
				})
			},
		})
	}

	if (deps.wechatPayService && !deps.hookRegistry) {
		const ws = deps.wechatPayService
		registry.register({
			async processOrderRefund(params) {
				return ws.refund(params)
			},
		})
	}

	return {
		async listOrders(params?: {
			limit?: number
			cursor?: string | null
			orderNo?: string | null
			userUsername?: string | null
			userPhone?: string | null
			orderId?: string | null
			promoterUserId?: string
		}): Promise<AdminOrderListResponse> {
			const limit = Math.max(1, Math.min(params?.limit ?? 50, 50))
			const cursor = params?.cursor ?? null
			const orderNo = params?.orderNo ?? null
			const userUsername = params?.userUsername ?? null
			const userPhone = params?.userPhone ?? null
			const orderId = params?.orderId ?? null
			const promoterUserId = params?.promoterUserId

			let userIds: string[] | undefined
			if (promoterUserId) {
				const relations = await deps.distributions.findManyByPromoterUserId(repoCtx, { promoterUserId })
				userIds = [promoterUserId, ...relations.map((r) => r.userId)]
			}

			const page = await deps.orders.listAdminOrders(repoCtx, {
				limit,
				cursor,
				orderNo,
				userUsername,
				userPhone,
				orderId,
				userIds,
			})
			return { items: page.items, nextCursor: page.nextCursor, totalCount: page.totalCount }
		},

		async completeOrder(params: { orderId: string; completedBy: string }): Promise<AdminCompleteOrderResponse> {
			const existing = await deps.orders.getOrderById(repoCtx, { orderId: params.orderId })
			if (!existing) {
				throw new AdminOrderServiceError('NOT_FOUND', 'Order not found')
			}

			if (existing.status === 'completed') {
				logger.info({ action: 'admin_order.complete.idempotent', userId: params.completedBy, orderId: params.orderId })
				return { order: toAdminOrder(existing) }
			}

			if (existing.status !== 'paid') {
				throw new AdminOrderServiceError('INVALID_STATE', 'Order is not completable')
			}

			const nowIso = new Date().toISOString()
			const updated = await deps.orders.updateOrderStatus(repoCtx, {
				orderId: params.orderId,
				status: 'completed',
				completedAt: nowIso,
				updatedAt: nowIso,
			})

			if (!updated) {
				throw new AdminOrderServiceError('INTERNAL_ERROR', 'Order not found')
			}

			// 通过钩子触发佣金推进（不再直接依赖 commission.service）
			try {
				await registry.emit('onOrderCompleted', { id: params.orderId }, nowIso)
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : 'Commission processing failed'
				throw new AdminOrderServiceError('INVALID_STATE', message)
			}

			logger.info({ action: 'admin_order.complete', userId: params.completedBy, orderId: params.orderId })
			return { order: toAdminOrder(updated) }
		},

		async refundOrder(params: { orderId: string; refundAmount: string; reason?: string; refundIntentId?: string; refundedBy: string }): Promise<AdminRefundOrderResponse> {
			const existing = await deps.orders.getOrderById(repoCtx, { orderId: params.orderId })
			if (!existing) {
				throw new AdminOrderServiceError('NOT_FOUND', 'Order not found')
			}

			if (existing.status !== 'paid' && existing.status !== 'completed') {
				throw new AdminOrderServiceError('INVALID_STATE', 'Only paid or completed orders can be refunded')
			}

			const remainingAmount = Number(existing.paidAmount || existing.priceAmount) - Number(existing.refundedAmount || 0)
			if (Number(params.refundAmount) > remainingAmount) {
				throw new AdminOrderServiceError('INVALID_STATE', 'Refund amount exceeds remaining paid amount')
			}

			// 通过钩子执行退款前校验（例如佣金结算状态检查）
			await registry.emit('beforeOrderRefund', existing, params.refundAmount)

			// 通过钩子执行支付退款（不再直接依赖 wechat-pay.service）
			const refundResult = await registry.invoke<{ applied: boolean; outRefundNo: string }>(
				'processOrderRefund',
				{
					orderId: params.orderId,
					refundAmount: params.refundAmount,
					reason: params.reason,
					refundIntentId: params.refundIntentId,
				},
			)

			if (!refundResult) {
				throw new AdminOrderServiceError('INTERNAL_ERROR', 'No payment refund handler registered')
			}

			if (!refundResult.applied) {
				const latest = await deps.orders.getOrderById(repoCtx, { orderId: params.orderId })
				if (!latest) {
					throw new AdminOrderServiceError('INTERNAL_ERROR', 'Order not found after idempotent refund')
				}

				logger.info({
					action: 'admin_order.refund.idempotent_hit',
					userId: params.refundedBy,
					orderId: params.orderId,
					refundAmount: params.refundAmount,
					refundIntentId: params.refundIntentId,
				})

				return { order: toAdminOrder(latest) }
			}

			// 更新订单状态
			const nowIso = new Date().toISOString()
			const newRefundedAmount = (Number(existing.refundedAmount || 0) + Number(params.refundAmount)).toFixed(2)
			const isFullRefund = Number(newRefundedAmount) >= Number(existing.paidAmount || existing.priceAmount)

			const updated = await deps.orders.updateOrderStatus(repoCtx, {
				orderId: params.orderId,
				status: isFullRefund ? 'refunded' : 'refunding',
				refundedAmount: newRefundedAmount,
				updatedAt: nowIso,
			})

			if (!updated) {
				throw new AdminOrderServiceError('INTERNAL_ERROR', 'Failed to update order status after refund')
			}

			// 通过钩子执行退款后调账（例如佣金调整）
			await registry.emit('onOrderRefundApplied', updated, params.refundAmount)

			logger.info({ action: 'admin_order.refund', userId: params.refundedBy, orderId: params.orderId, refundAmount: params.refundAmount })
			return { order: toAdminOrder(updated) }
		},

		/**
		Function: getOrderDetail

		Description: 获取订单详情，包括商品、优惠券、推广人信息

		Parameters:
				params(object): 包含 orderId 的参数对象

		Returns:
				detail(AdminOrderDetailResponse): 订单详情响应，包含订单、商品、优惠券、推广人信息
		*/
		async getOrderDetail(params: { orderId: string }): Promise<AdminOrderDetailResponse> {
			const order = await deps.orders.getOrderById(repoCtx, { orderId: params.orderId })
			if (!order) {
				throw new AdminOrderServiceError('NOT_FOUND', 'Order not found')
			}

			const [product, couponData, relation] = await Promise.all([
				deps.products.getProductById(repoCtx, { productId: order.productId }),
				order.couponRedemptionId
					? deps.coupons.getCouponById(repoCtx, { id: order.couponRedemptionId })
					: Promise.resolve(null),
				deps.distributions.getRelationByUserId(repoCtx, { userId: order.userId }),
			])

			let coupon = null
			if (couponData) {
				coupon = {
					id: couponData.id,
					name: couponData.name,
					type: couponData.type,
					discountAmount: order.discountAmount || '0.00',
				}
			}

			let promoter = null
			if (relation && relation.promoterUserId) {
				const [promoterUser, commission] = await Promise.all([
					deps.users.getUserById(repoCtx, { userId: relation.promoterUserId }),
					deps.commissions.getCommissionByOrderAndPromoter(repoCtx, {
						orderId: order.id,
						promoterUserId: relation.promoterUserId,
					}),
				])

				promoter = {
					userId: relation.promoterUserId,
					username: promoterUser?.username ?? null,
					level: 1,
					commission: commission
						? {
								amount: commission.commissionAmount,
								status: commission.status,
							}
						: null,
				}
			}

			return {
				detail: {
					order: {
						id: order.id,
						orderNo: order.orderNo,
						userId: order.userId,
						userUsername: null,
						userPhone: null,
						productId: order.productId,
						productName: product?.name ?? null,
						priceAmount: order.priceAmount,
						currencyCode: order.currencyCode,
						paidAmount: order.paidAmount,
						refundedAmount: order.refundedAmount,
						status: order.status,
						createdAt: order.createdAt,
						paidAt: order.paidAt,
						completedAt: order.completedAt,
						closedAt: order.closedAt,
						updatedAt: order.updatedAt,
					},
					product: product
						? {
								id: product.id,
								name: product.name,
								coverUrl: product.coverUrl ?? null,
								price: product.price,
								originalPrice: product.originalPrice,
								kind: product.kind,
							}
						: null,
					coupon,
					promoter,
				},
			}
		},
	}
}
