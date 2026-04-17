import type { OrderHooks } from '@/services/core/order-hooks.interface'
import type { createWechatPayService } from '@/plugins/wechat/services/wechat-pay.service'

/**
 * Function: createWechatPayOrderHooks
 *
 * Description: 从微信支付服务实例创建 OrderHooks 实现。
 *   将微信支付退款逻辑封装为钩子，供 admin-order.service 通过注册表调用。
 *   此函数应由路由层或模块初始化阶段调用，将返回值注册到 OrderHookRegistry。
 *
 * Parameters:
 *   wechatPayService(ReturnType<typeof createWechatPayService>): 微信支付服务实例
 *
 * Returns:
 *   hooks(OrderHooks): 可注册到 OrderHookRegistry 的钩子实现
 */
export function createWechatPayOrderHooks(
	wechatPayService: ReturnType<typeof createWechatPayService>,
): OrderHooks {
	return {
		async processOrderRefund(params) {
			return wechatPayService.refund(params)
		},
	}
}
