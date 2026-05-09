import type { DashboardWidget } from '@/services/core/dashboard-widget.interface';

/**
 * Function: promotionPlugin
 *
 * Description: 分销推广插件注册入口。
 *   当 PLUGIN_PROMOTION=true 时，通过 init() 注册分销相关的 services/repositories/dashboard widgets。
 *   包含：推广员管理、佣金计算、结算申请、推广码、分销关系等。
 */
export const promotionPlugin = {
	name: 'promotion',
	version: '1.0.0',
	init(context: {
		registerServices: (s: Record<string, unknown>) => void;
		registerDashboardWidgets: (w: DashboardWidget[]) => void;
	}) {
		// 注册分销相关资源
		// 当前阶段先做基础注册，后续 Phase 扩展
	},
};
