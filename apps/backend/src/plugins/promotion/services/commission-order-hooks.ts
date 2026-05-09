import type { OrderHooks } from '@/services/core/order-hooks.interface'
import type { createCommissionService } from '@/plugins/promotion/services/commission.service'

/**
 * Function: createCommissionOrderHooks
 *
 * Description: 从佣金服务实例创建 OrderHooks 实现。
 *   将佣金相关的业务逻辑封装为钩子，供 admin-order.service 通过注册表调用。
 *   此函数应由路由层或模块初始化阶段调用，将返回值注册到 OrderHookRegistry。
 *
 * Parameters:
 *   commissionService(ReturnType<typeof createCommissionService>): 佣金服务实例
 *
 * Returns:
 *   hooks(OrderHooks): 可注册到 OrderHookRegistry 的钩子实现
 */
export function createCommissionOrderHooks(
	commissionService: ReturnType<typeof createCommissionService>,
): OrderHooks {
	return {
		async onOrderCompleted(order, completedAtIso) {
			await commissionService.markCommissionPayableForCompletedOrder({
				orderId: order.id,
				completedAtIso,
			})
		},

		async beforeOrderRefund(order, _refundAmount) {
			const commissions = await commissionService.getCommissionsByOrderId(order.id)
			const hasSettlingOrSettled = commissions.some(
				(c) => c.status === 'settling' || c.status === 'settled',
			)
			if (hasSettlingOrSettled) {
				throw new Error('佣金已进入结算流程，不可退款。请联系财务人工处理。')
			}
		},

		async onOrderRefundApplied(order, refundAmount) {
			await commissionService.adjustCommissionForRefund({
				orderId: order.id,
				refundAmount,
			})
		},
	}
}
