/**
 * Function: OrderHooks
 *
 * Description: 订单生命周期钩子接口。
 *   业务插件可注册自己的处理逻辑，核心模块不直接依赖插件模块。
 *
 * Methods:
 *   onOrderCreated(order): 订单创建后回调
 *   onOrderPaid(order, payment): 订单支付成功后回调
 *   onOrderCancelled(order): 订单取消后回调
 *   onOrderRefunded(order): 订单退款后回调
 *   onOrderCompleted(order, completedAtIso): 订单完成（交付确认）后回调
 *   beforeOrderRefund(order, refundAmount): 退款前校验回调，可抛出异常中止退款
 *   processOrderRefund(params): 执行支付退款，返回退款结果
 *   onOrderRefundApplied(order, refundAmount): 退款成功后调账回调
 */
export interface OrderHooks {
	onOrderCreated?(order: any): Promise<void>
	onOrderPaid?(order: any, payment?: any): Promise<void>
	onOrderCancelled?(order: any): Promise<void>
	onOrderRefunded?(order: any): Promise<void>
	/** 订单完成（交付确认）后回调，例如将佣金推进为可结算 */
	onOrderCompleted?(order: any, completedAtIso: string): Promise<void>
	/** 退款前校验回调，抛出异常可中止退款流程 */
	beforeOrderRefund?(order: any, refundAmount: string): Promise<void>
	/** 执行支付退款，返回退款结果（仅第一个注册的处理器会被调用） */
	processOrderRefund?(params: {
		orderId: string
		refundAmount: string
		reason?: string
		refundIntentId?: string
	}): Promise<{ applied: boolean; outRefundNo: string }>
	/** 退款成功后调账回调，例如调整佣金 */
	onOrderRefundApplied?(order: any, refundAmount: string): Promise<void>
}

/**
 * Function: OrderHookRegistry
 *
 * Description: 订单钩子注册表。
 *   支持通过 emit 广播事件（fire-and-forget）和 invoke 调用处理器（返回结果）。
 *   每次 service 实例化时应创建独立的 registry 实例，避免跨请求状态污染。
 */
export class OrderHookRegistry {
	private hooks: OrderHooks[] = []

	register(hooks: OrderHooks): void {
		this.hooks.push(hooks)
	}

	/**
	 * Function: emit
	 *
	 * Description: 广播事件到所有注册的钩子（fire-and-forget，错误会传播给调用方）
	 *
	 * Parameters:
	 *   event(keyof OrderHooks): 事件名称
	 *   args(...any[]): 事件参数
	 */
	async emit(event: keyof OrderHooks, ...args: any[]): Promise<void> {
		for (const hook of this.hooks) {
			const handler = hook[event]
			if (handler) {
				await (handler as (...a: any[]) => Promise<any>).apply(hook, args)
			}
		}
	}

	/**
	 * Function: invoke
	 *
	 * Description: 调用第一个注册的钩子处理器并返回结果（用于需要返回值的操作）
	 *
	 * Parameters:
	 *   event(keyof OrderHooks): 事件名称
	 *   args(...any[]): 事件参数
	 *
	 * Returns:
	 *   result(T | undefined): 第一个处理器的返回值，无处理器时返回 undefined
	 */
	async invoke<T>(event: keyof OrderHooks, ...args: any[]): Promise<T | undefined> {
		for (const hook of this.hooks) {
			const handler = hook[event]
			if (handler) {
				return await (handler as (...a: any[]) => Promise<T>).apply(hook, args)
			}
		}
		return undefined
	}
}
