import type { DashboardWidget } from '@/services/core/dashboard-widget.interface';

/**
 * Function: ecommercePlugin
 *
 * Description: 电商插件注册入口。
 *   当 PLUGIN_ECOMMERCE=true 时，通过 init() 注册电商相关的 services/repositories/dashboard widgets。
 *   包含：商品管理、分类管理、订单管理、优惠券、仪表盘统计等。
 */
export const ecommercePlugin = {
	name: 'ecommerce',
	version: '1.0.0',
	init(context: {
		registerServices: (s: Record<string, unknown>) => void;
		registerDashboardWidgets: (w: DashboardWidget[]) => void;
	}) {
		// 注册电商相关资源
		// 当前阶段先做基础注册，后续 Phase 扩展
	},
};
