import type { Order, OrderListItem } from '@/plugins/ecommerce/contracts/orders.dto'
import type { AdminProduct } from '@/plugins/ecommerce/contracts/admin-products.dto'
import type { IdempotencyRequest } from '@/contracts/dtos/idempotency.dto'
import { env } from '@/config'
import { generateOrderNo, hashCreateOrderPayload, fingerprintIdempotencyKey, isCompletedWithOrder, normalizeFulfillmentStatus, mapOrder } from '@/lib/utils/order.util'
import type { IdempotencyRepository } from '@/repositories/interfaces/core/idempotency.interface'
import type { OrderRepository } from '@/plugins/ecommerce/repositories/interfaces/order.interface'
import type { ProductRepository } from '@/plugins/ecommerce/repositories/interfaces/product.interface'
import type { OrderFulfillmentJobRepository } from '@/plugins/ecommerce/repositories/interfaces/order-fulfillment-job.interface'
import type { PromoterCodeRepository } from '@/plugins/promotion/repositories/interfaces/promoter-code.interface'
import type { DistributionRepository } from '@/plugins/promotion/repositories/interfaces/distribution.interface'
import type { CouponRepository, UserCouponRepository, CouponRedemptionRepository } from '@/plugins/ecommerce/repositories/interfaces/coupon.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'

/**
 * Type: CouponService
 *
 * Description: 优惠券服务类型定义
 */
type CouponService = ReturnType<typeof import('@/plugins/ecommerce/services/coupon.service').createCouponService>

/**
 * Type: IdempotencyHitError
 *
 * Description: 幂等性缓存命中错误类型
 */
interface IdempotencyHitError extends OrderServiceError {
	orderId: string
	order: Order
}

/**
 * Class: OrderServiceError
 *
 * Description: 订单服务自定义错误类，用于封装订单业务逻辑中的错误状态
 */
export class OrderServiceError extends Error {
	/**
	 * 错误代码枚举
	 * - UNAUTHORIZED: 未授权访问
	 * - NOT_FOUND: 资源不存在
	 * - INVALID_INPUT: 输入参数无效
	 * - INVALID_STATE: 订单状态不允许该操作
	 * - CONFLICT: 资源冲突（如并发操作）
	 * - IDEMPOTENCY_CONFLICT: 幂等键冲突
	 * - IDEMPOTENCY_KEY_EXPIRED: 幂等键已过期
	 * - IDEMPOTENCY_HIT: 幂等性缓存命中（内部使用）
	 */
	public readonly code:
		| 'UNAUTHORIZED'
		| 'NOT_FOUND'
		| 'INVALID_INPUT'
		| 'INVALID_STATE'
		| 'CONFLICT'
		| 'IDEMPOTENCY_CONFLICT'
		| 'IDEMPOTENCY_KEY_EXPIRED'
		| 'IDEMPOTENCY_HIT'

	constructor(code: OrderServiceError['code'], message: string) {
		super(message)
		this.code = code
	}
}

/**
Function: createOrderService

Description: 创建用户侧订单服务，负责下单与订单查询的业务编排（不直接访问数据库）

Parameters:
		deps({ orders: OrderRepository, products: ProductRepository, promoterCodes?: PromoterCodeRepository, distributions?: DistributionRepository, coupons?: CouponRepository, userCoupons?: UserCouponRepository, redemptions?: CouponRedemptionRepository }): 依赖注入的订单/商品仓储
		ctx(ServiceContext): Service 上下文

Returns:
		service(object): 提供 createOrderForUser/getOrderForUser 等方法的服务对象
*/
export function createOrderService(
	deps: {
		orders: OrderRepository
		products: ProductRepository
		idempotency?: IdempotencyRepository
		fulfillmentJobs?: OrderFulfillmentJobRepository
		promoterCodes?: PromoterCodeRepository
		distributions?: DistributionRepository
		coupons?: CouponRepository
		userCoupons?: UserCouponRepository
		redemptions?: CouponRedemptionRepository
	},
	ctx: ServiceContext,
) {
	const { logger } = ctx

	const repoCtx: RepoContext = {
		traceId: ctx.traceId,
		logger: ctx.logger.child({ layer: 'repository' }),
	}

	/**
	 * Function: validateIdempotencyRequest
	 *
	 * Description: 验证幂等性请求的有效性，统一处理过期、冲突、缓存命中、进行中状态
	 *
	 * Parameters:
	 * 	request(IdempotencyRequest): 幂等性请求记录
	 * 	userId(string): 用户 ID
	 * 	idempotencyKeyFp(string): 幂等键指纹
	 * 	requestHash(string): 请求参数哈希
	 *
	 * Returns:
	 * 	Order | null: 如果缓存命中返回订单，否则返回 null
	 *
	 * Throws:
	 * 	OrderServiceError: 过期、冲突、进行中等情况
	 */
	async function validateIdempotencyRequest(params: {
		request: IdempotencyRequest
		userId: string
		idempotencyKeyFp: string
		requestHash: string
	}): Promise<Order | null> {
		const { request, userId, idempotencyKeyFp, requestHash } = params
		const nowIso = new Date().toISOString()

		// 1️⃣ 过期检查：幂等键已超过 24 小时有效期
		if (request.expiresAt <= nowIso) {
			logger.info({ action: 'order.idempotent.expired', userId, idempotencyKeyFp })
			throw new OrderServiceError('IDEMPOTENCY_KEY_EXPIRED', 'Idempotency key expired')
		}

		// 2️⃣ 请求参数冲突检查：相同幂等键但请求参数不同（防止参数篡改）
		if (request.requestHash !== requestHash) {
			logger.warn({ action: 'order.idempotent.conflict', userId, idempotencyKeyFp })
			throw new OrderServiceError('IDEMPOTENCY_CONFLICT', 'Idempotency key conflict')
		}

		// 3️⃣ 缓存命中：请求已成功完成，直接返回关联的订单
		if (isCompletedWithOrder(request)) {
			const order = await deps.orders.getOrderById(repoCtx, { orderId: request.resourceId! })
			if (!order) throw new OrderServiceError('NOT_FOUND', 'Order not found')
			logger.info({ action: 'order.idempotent.hit', userId, orderId: order.id })
			return order
		}

		// 4️⃣ 并发请求处理：当前请求正在处理中
		if (request.status === 'pending') {
			logger.info({ action: 'order.idempotent.in_progress', userId, idempotencyKeyFp })
			throw new OrderServiceError('CONFLICT', 'Idempotency request in progress')
		}

		return null
	}

	/**
	 * Function: validateProductForOrder
	 *
	 * Description: 验证商品存在且可购买
	 *
	 * Parameters:
	 * 	productId(string): 商品 ID
	 *
	 * Returns:
	 * 	AdminProduct: 商品对象
	 *
	 * Throws:
	 * 	OrderServiceError: 商品不存在或不可购买
	 */
	async function validateProductForOrder(productId: string): Promise<AdminProduct> {
		const product = await deps.products.getProductById(repoCtx, { productId })
		if (!product) {
			throw new OrderServiceError('INVALID_INPUT', 'Invalid product')
		}

		if (product.status !== 'published') {
			throw new OrderServiceError('INVALID_STATE', 'Product is not purchasable')
		}

		return product
	}

	/**
	 * Function: checkIdempotencyOrThrow
	 *
	 * Description: 执行完整的幂等性检查逻辑，包括过期、冲突、缓存命中、并发处理和记录创建
	 *
	 * Parameters:
	 * 	userId(string): 用户 ID
	 * 	idempotencyKey(string): 幂等性键
	 * 	requestHash(string): 请求参数哈希
	 * 	action(string): 操作标识
	 *
	 * Returns:
	 * 	IdempotencyRequest: 可用的幂等性记录（pending 状态）
	 *
	 * Throws:
	 * 	OrderServiceError: 幂等性键过期、冲突、请求进行中等情况
	 */
	async function checkIdempotencyOrThrow(params: {
		userId: string
		idempotencyKey: string
		requestHash: string
		action: string
	}): Promise<IdempotencyRequest> {
		const { userId, idempotencyKey, requestHash, action } = params
		const idempotencyKeyFp = fingerprintIdempotencyKey(idempotencyKey)
		const nowIso = new Date().toISOString()
		const expiresAtIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

		// 检查是否已有相同幂等键的请求
		const existing = await deps.idempotency!.getRequest(repoCtx, {
			userId,
			action,
			idempotencyKey,
		})

		// 验证已存在的幂等请求记录
		if (existing) {
			const cachedOrder = await validateIdempotencyRequest({
				request: existing,
				userId,
				idempotencyKeyFp,
				requestHash,
			})
			if (cachedOrder) {
				const error = new OrderServiceError('IDEMPOTENCY_HIT', 'Idempotency cache hit') as IdempotencyHitError
				error.orderId = cachedOrder.id
				error.order = cachedOrder
				throw error
			}
		}

		// 创建幂等性记录（如果不存在）
		let request = existing
		if (!request) {
			try {
				request = await deps.idempotency!.createRequest(repoCtx, {
					userId,
					action,
					idempotencyKey,
					requestHash,
					expiresAt: expiresAtIso,
					createdAt: nowIso,
				})
			} catch (error: unknown) {
				// 并发竞争处理：捕获数据库唯一约束冲突
				const e = error as { code?: unknown }
				if (e.code === '23505') {
					request = await deps.idempotency!.getRequest(repoCtx, {
						userId,
						action,
						idempotencyKey,
					})
					if (request) {
						const cachedOrder = await validateIdempotencyRequest({
							request,
							userId,
							idempotencyKeyFp,
							requestHash,
						})
						if (cachedOrder) {
							const hitError = new OrderServiceError('IDEMPOTENCY_HIT', 'Idempotency cache hit') as IdempotencyHitError
							hitError.orderId = cachedOrder.id
							hitError.order = cachedOrder
							throw hitError
						}
					}
				}
				if (!request) throw error
			}
		}

		return request
	}

	/**
	 * Function: calculateCouponDiscount
	 *
	 * Description: 计算优惠券折扣（带错误处理）
	 *
	 * Parameters:
	 * 	userId(string): 用户 ID
	 * 	userCouponId(string): 用户优惠券 ID
	 * 	productId(string): 商品 ID
	 * 	originalAmount(string): 原始金额
	 *
	 * Returns:
	 * 	discountAmount(string): 折扣金额（失败时为 '0.00'）
	 * 	finalAmount(string): 最终金额
	 */
	async function calculateCouponDiscount(params: {
		userId: string
		userCouponId: string
		productId: string
		originalAmount: string
	}): Promise<{ discountAmount: string; finalAmount: string }> {
		const { userId, userCouponId, productId, originalAmount } = params

		if (!deps.coupons || !deps.userCoupons || !deps.redemptions) {
			return { discountAmount: '0.00', finalAmount: originalAmount }
		}

		try {
			const { createCouponService } = await import('@/plugins/ecommerce/services/coupon.service')
			const couponService = createCouponService(
				{ coupons: deps.coupons, userCoupons: deps.userCoupons, redemptions: deps.redemptions },
				ctx
			)

			const calculation = await couponService.calculateDiscount({
				userCouponId,
				userId,
				productId,
				originalAmount,
			})

			if (calculation.canUse) {
				logger.info({
					action: 'order.coupon_discount_calculated',
					userId,
					userCouponId,
					discountAmount: calculation.discountAmount,
					finalAmount: calculation.finalAmount,
				})
				return {
					discountAmount: calculation.discountAmount,
					finalAmount: calculation.finalAmount,
				}
			} else {
				logger.warn({
					action: 'order.coupon_not_applicable',
					userId,
					userCouponId,
					reason: calculation.reason ?? 'Coupon not applicable',
				})
				return { discountAmount: '0.00', finalAmount: originalAmount }
			}
		} catch (error: unknown) {
			const e = error as { message?: string }
			logger.error({
				action: 'order.coupon_calculation_failed',
				userId,
				userCouponId,
				error: e.message ?? 'Coupon calculation failed',
			})
			return { discountAmount: '0.00', finalAmount: originalAmount }
		}
	}

	/**
	 * Function: redeemCouponWithRollback
	 *
	 * Description: 核销优惠券，失败时自动回滚订单
	 *
	 * Parameters:
	 * 	orderId(string): 订单 ID
	 * 	userId(string): 用户 ID
	 * 	userCouponId(string): 用户优惠券 ID
	 * 	productId(string): 商品 ID
	 * 	originalAmount(string): 原始金额
	 * 	couponService(CouponService): 优惠券服务实例
	 *
	 * Returns:
	 * 	couponRedemptionId(string | null): 核销记录 ID（失败时为 null）
	 * 	discountAmount(string): 实际应用的折扣金额（失败时为 '0.00'）
	 */
	async function redeemCouponWithRollback(params: {
		orderId: string
		userId: string
		userCouponId: string
		productId: string
		originalAmount: string
		couponService: CouponService
	}): Promise<{ couponRedemptionId: string | null; discountAmount: string }> {
		const { orderId, userId, userCouponId, productId, originalAmount, couponService } = params

		try {
			const redemption = await couponService.redeemCoupon({
				userCouponId,
				userId,
				productId,
				originalAmount,
				orderId,
			})

			// 更新订单的核销记录 ID
			const updated = await deps.orders.updateOrder(repoCtx, {
				orderId,
				couponRedemptionId: redemption.id,
			})

			if (updated) {
				logger.info({
					action: 'order.coupon_redeemed',
					userId,
					orderId,
					redemptionId: redemption.id,
					discountAmount: redemption.discountAmount,
				})
				return { couponRedemptionId: redemption.id, discountAmount: redemption.discountAmount }
			}

			return { couponRedemptionId: null, discountAmount: '0.00' }
		} catch (error: unknown) {
			const e = error as { message?: string }
			const errorMsg = e.message ?? 'Coupon redemption failed'

			logger.error({
				action: 'order.coupon_redemption_failed',
				userId,
				orderId,
				userCouponId,
				error: errorMsg,
			})

			// 核销失败时，回滚订单状态
			await deps.orders.updateOrder(repoCtx, {
				orderId,
				couponRedemptionId: null,
				discountAmount: '0.00',
			})

			logger.warn({
				action: 'order.coupon_redemption_rolled_back',
				userId,
				orderId,
				reason: 'Discount rolled back due to redemption failure',
			})

			return { couponRedemptionId: null, discountAmount: '0.00' }
		}
	}

	/**
	 * Function: bindPromoterCodeIfExists
	 *
	 * Description: 绑定推广码（如果提供），失败不影响订单
	 *
	 * Parameters:
	 * 	userId(string): 用户 ID
	 * 	promoterCode(string): 推广码
	 * 	orderId(string): 订单 ID
	 *
	 * Returns:
	 * 	void
	 */
	async function bindPromoterCodeIfExists(params: {
		userId: string
		promoterCode: string
		orderId: string
	}): Promise<void> {
		const { userId, promoterCode, orderId } = params

		if (!deps.promoterCodes || !deps.distributions) {
			return
		}

		try {
			const { createPromoterCodeService } = await import('@/plugins/promotion/services/promoter-code.service')
			const promoterCodeService = createPromoterCodeService(
				{
					promoterCodes: deps.promoterCodes,
					distributions: deps.distributions,
				},
				ctx
			)

			await promoterCodeService.bindByPromoterCode({
				userId,
				code: promoterCode,
			})

			logger.info({
				action: 'order.promoter_code_bind',
				userId,
				orderId,
				promoterCode,
			})
		} catch (error: unknown) {
			// 推广码绑定失败不阻止订单（静默处理）
			const e = error as { message?: string; code?: string }
			logger.warn({
				action: 'order.promoter_code_bind_failed',
				userId,
				orderId,
				promoterCode,
				error: e.message ?? 'Unknown error',
				code: e.code,
			})
		}
	}

	return {
		/**
		 * Function: createOrderForUser
		 *
		 * Description: 为用户创建订单，包含完整的幂等性控制、优惠券计算、推广码绑定等业务逻辑
		 *
		 * 业务流程：
		 * 1. 验证商品存在且状态可购买
		 * 2. 执行幂等性检查（避免重复下单）
		 * 3. 计算并应用优惠券折扣（如果提供）
		 * 4. 创建订单记录
		 * 5. 核销优惠券（如果折扣成功应用）
		 * 6. 绑定推广码（如果提供）
		 * 7. 更新幂等性记录状态为成功
		 *
		 * Parameters:
		 * 	params.userId(string): 用户 ID
		 * 	params.productId(string): 商品 ID
		 * 	params.idempotencyKey(string): 幂等性键，用于防止重复下单
		 * 	params.promoterCode(string): 可选，推广码
		 * 	params.userCouponId(string): 可选，用户优惠券 ID
		 *
		 * Returns:
		 * 	Order(Order): 创建的订单对象
		 *
		 * Throws:
		 * 	OrderServiceError: 商品不存在、商品不可购买、幂等性冲突、优惠券错误等情况
		 */
		async createOrderForUser(params: {
			userId: string
			productId: string
			idempotencyKey: string
			promoterCode?: string
			userCouponId?: string
		}): Promise<Order> {
			// 1️⃣ 验证商品存在且可购买
			const product = await validateProductForOrder(params.productId)

			// 2️⃣ 执行幂等性检查
			if (!deps.idempotency) {
				throw new OrderServiceError('INVALID_STATE', 'Idempotency repository not configured')
			}

			const requestHash = hashCreateOrderPayload({
				productId: params.productId,
				userCouponId: params.userCouponId,
			})

			let request: IdempotencyRequest
			try {
				request = await checkIdempotencyOrThrow({
					userId: params.userId,
					idempotencyKey: params.idempotencyKey,
					requestHash,
					action: 'orders:create',
				})
			} catch (error: unknown) {
				const e = error as OrderServiceError
				// 幂等性缓存命中，直接返回订单
				if (e.code === 'IDEMPOTENCY_HIT') {
					const hitError = e as IdempotencyHitError
					return hitError.order
				}
				throw error
			}

			// 3️⃣ 计算优惠券折扣（如果提供）
			let discountAmount = '0.00'
			let couponRedemptionId: string | null = null
			let couponService: CouponService | null = null

			if (params.userCouponId) {
				const discountResult = await calculateCouponDiscount({
					userId: params.userId,
					userCouponId: params.userCouponId,
					productId: params.productId,
					originalAmount: product.price.amount,
				})
				discountAmount = discountResult.discountAmount

				// 如果有折扣，创建优惠券服务用于后续核销
				if (discountAmount !== '0.00' && deps.coupons && deps.userCoupons && deps.redemptions) {
					const { createCouponService } = await import('@/plugins/ecommerce/services/coupon.service')
					couponService = createCouponService(
						{ coupons: deps.coupons, userCoupons: deps.userCoupons, redemptions: deps.redemptions },
						ctx
					)
				}
			}

			// 4️⃣ 创建订单记录
			const currencyCode = env.SITE_CURRENCY_CODE
			const orderNo = generateOrderNo()

			const created = await deps.orders.createOrder(repoCtx, {
				orderNo,
				userId: params.userId,
				productId: params.productId,
				priceAmount: product.price.amount,
				currencyCode,
				status: 'pending_payment',
				couponRedemptionId,
				discountAmount,
			})

			// 5️⃣ 核销优惠券（如果计算成功且有折扣）
			if (couponService && discountAmount !== '0.00') {
				const redemptionResult = await redeemCouponWithRollback({
					orderId: created.id,
					userId: params.userId,
					userCouponId: params.userCouponId!,
					productId: params.productId,
					originalAmount: product.price.amount,
					couponService,
				})
				couponRedemptionId = redemptionResult.couponRedemptionId
				discountAmount = redemptionResult.discountAmount
			}

			// 6️⃣ 更新幂等性状态为成功
			await deps.idempotency!.markSucceeded(repoCtx, {
				id: request.id,
				resourceType: 'order',
				resourceId: created.id,
				updatedAt: new Date().toISOString(),
			})

			// 7️⃣ 绑定推广码（如果提供）
			if (params.promoterCode) {
				await bindPromoterCodeIfExists({
					userId: params.userId,
					promoterCode: params.promoterCode,
					orderId: created.id,
				})
			}

			// 8️⃣ 记录日志并返回结果
			const idempotencyKeyFp = fingerprintIdempotencyKey(params.idempotencyKey)
			logger.info({
				action: 'order.create',
				userId: params.userId,
				orderId: created.id,
				idempotencyKeyFp,
				discountAmount,
			})

			return mapOrder(created, null)
		},

		/**
		 * Function: getOrderForUser
		 *
		 * Description: 获取用户的订单详情，包含订单履约状态
		 *
		 * 业务流程：
		 * 1. 根据订单 ID 查询订单
		 * 2. 验证订单归属（防止越权访问）
		 * 3. 查询订单履约状态（如果配置了履约任务仓储）
		 * 4. 返回完整的订单信息
		 *
		 * Parameters:
		 * 	params.userId(string): 用户 ID
		 * 	params.orderId(string): 订单 ID
		 *
		 * Returns:
		 * 	Order(Order): 包含履约状态的订单对象
		 *
		 * Throws:
		 * 	OrderServiceError: 订单不存在、未授权访问等情况
		 */
		async getOrderForUser(params: { userId: string; orderId: string }): Promise<Order> {
			const order = await deps.orders.getOrderById(repoCtx, { orderId: params.orderId })
			if (!order) {
				throw new OrderServiceError('NOT_FOUND', 'Order not found')
			}

			if (order.userId !== params.userId) {
				throw new OrderServiceError('UNAUTHORIZED', 'Unauthorized')
			}

			const fulfillmentStatus = deps.fulfillmentJobs
				? normalizeFulfillmentStatus(await deps.fulfillmentJobs.getFulfillmentStatusByOrderId(repoCtx, { orderId: order.id }))
				: null

			return mapOrder(order, fulfillmentStatus)
		},

		/**
		 * Function: listOrdersForUser
		 *
		 * Description: 分页查询用户的订单列表
		 *
		 * 业务流程：
		 * 1. 根据用户 ID 和查询条件查询订单
		 * 2. 支持按订单状态、订单号筛选
		 * 3. 支持游标分页（高效处理大数据集）
		 * 4. 返回订单列表和下一页游标
		 *
		 * Parameters:
		 * 	params.userId(string): 用户 ID
		 * 	params.limit(number): 每页数量限制
		 * 	params.cursor(string): 当前页游标（首次查询为 null）
		 * 	params.status(string): 可选，订单状态筛选
		 * 	params.orderNo(string): 可选，订单号筛选（精确匹配）
		 *
		 * Returns:
		 * 	orders(Order[]): 订单列表
		 * 	nextCursor(string | null): 下一页游标，如果没有更多数据则为 null
		 */
		async listOrdersForUser(params: { userId: string; limit: number; cursor: string | null; status?: string; orderNo?: string | null }): Promise<{ orders: OrderListItem[]; nextCursor: string | null }> {
			const { items, nextCursor } = await deps.orders.listOrders(repoCtx, {
				limit: params.limit,
				cursor: params.cursor,
				userId: params.userId,
				status: params.status,
				orderNo: params.orderNo ?? null,
			})

			const productIds = Array.from(new Set(items.map((order) => order.productId).filter(Boolean)))
			const products = await deps.products.listProductsByIds(repoCtx, { productIds })
			const productsMap = new Map(products.map((product) => [product.id, product]))

			const orders = items.map((order) => {
				const mapped = mapOrder(order, null)
				const product = productsMap.get(order.productId)
				return {
					...mapped,
					product: product
						? {
							id: product.id,
							name: product.name,
							summary: product.summary ?? null,
						}
						: null,
				}
			})

			return { orders, nextCursor }
		},

		/**
		Function: getOrderStatsForUser

		Description: 获取用户订单统计数据（待支付、已支付、已完成）

		Parameters:
			params({ userId: string }): 用户 ID

		Returns:
			stats({ pendingCount: number; paidCount: number; completedCount: number }): 订单统计数据
		*/
		async getOrderStatsForUser(params: { userId: string }): Promise<{ pendingCount: number; paidCount: number; completedCount: number }> {
			const statuses = ['pending_payment', 'paid', 'completed'] as const
			const counts = await deps.orders.countOrdersByStatus(repoCtx, {
				userId: params.userId,
				statuses: [...statuses],
			})

			return {
				pendingCount: counts.pending_payment ?? 0,
				paidCount: counts.paid ?? 0,
				completedCount: counts.completed ?? 0,
			}
		},

		/**
		 * Function: cancelOrderForUser
		 *
		 * Description: 取消用户的待支付订单
		 *
		 * 业务流程：
		 * 1. 验证订单存在
		 * 2. 验证订单归属（防止越权操作）
		 * 3. 验证订单状态（仅允许取消待支付订单）
		 * 4. 更新订单状态为已取消
		 *
		 * Parameters:
		 * 	params.userId(string): 用户 ID
		 * 	params.orderId(string): 订单 ID
		 *
		 * Returns:
		 * 	Order(Order): 已取消的订单对象
		 *
		 * Throws:
		 * 	OrderServiceError: 订单不存在、未授权、订单状态不允许取消等情况
		 */
		async cancelOrderForUser(params: { userId: string; orderId: string }): Promise<Order> {
			const order = await deps.orders.getOrderById(repoCtx, { orderId: params.orderId })
			if (!order) {
				throw new OrderServiceError('NOT_FOUND', 'Order not found')
			}

			if (order.userId !== params.userId) {
				throw new OrderServiceError('UNAUTHORIZED', 'Unauthorized')
			}

			if (order.status !== 'pending_payment') {
				throw new OrderServiceError('INVALID_STATE', 'Only pending payment orders can be cancelled')
			}

			const nowIso = new Date().toISOString()
			const updated = await deps.orders.updateOrderStatus(repoCtx, {
				orderId: params.orderId,
				status: 'cancelled',
				updatedAt: nowIso,
				closedAt: nowIso,
			})

			if (!updated) {
				throw new OrderServiceError('NOT_FOUND', 'Order not found')
			}

			logger.info({ action: 'order.cancel', userId: params.userId, orderId: params.orderId })
			return mapOrder(updated, null)
		},

		/**
		 * Function: cancelExpiredOrders
		 *
		 * Description: 批量取消超时的待支付订单（定时任务调用）
		 *
		 * 业务流程：
		 * 1. 计算超时截止时间（当前时间 - 超时时长）
		 * 2. 查询所有待支付订单（限制 100 条）
		 * 3. 逐个检查订单创建时间
		 * 4. 取消已超时的订单
		 * 5. 记录成功和失败的订单数量
		 *
		 * Parameters:
		 * 	params.timeoutMinutes(number): 超时时长（分钟）
		 *
		 * Returns:
		 * 	cancelled(number): 成功取消的订单数量
		 *
		 * 注意事项：
		 * 	- 此方法通常由定时任务调用，建议每小时执行一次
		 * 	- 批量查询限制为 100 条，避免单次处理过多数据
		 * 	- 单个订单取消失败不影响其他订单的处理
		 */
		async cancelExpiredOrders(params: { timeoutMinutes: number }): Promise<{ cancelled: number }> {
			const timeoutMs = params.timeoutMinutes * 60 * 1000
			const cutoffIso = new Date(Date.now() - timeoutMs).toISOString()

			// Security: Use cursor-based filtering to fetch only orders older than the cutoff.
			// Passing 'cursor: cutoffIso' leverages the repository's 'lt' filter,
			// ensuring we target expired orders even if there are many new pending orders.
			const { items } = await deps.orders.listOrders(repoCtx, {
				limit: 100,
				cursor: cutoffIso,
				status: 'pending_payment',
			})

			let cancelled = 0
			const nowIso = new Date().toISOString()

			for (const order of items) {
				// Double-check expiration (redundant if repository 'lt' works, but safe)
				if (order.createdAt < cutoffIso) {
					try {
						await deps.orders.updateOrderStatus(repoCtx, {
							orderId: order.id,
							status: 'cancelled',
							updatedAt: nowIso,
							closedAt: nowIso,
						})
						cancelled += 1
						logger.info({ action: 'order.auto_cancel', orderId: order.id, createdAt: order.createdAt })
					} catch (error) {
						logger.error({ action: 'order.auto_cancel.failed', orderId: order.id, error })
					}
				}
			}

			return { cancelled }
		},
	}
}
