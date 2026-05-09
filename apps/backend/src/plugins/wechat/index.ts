import type { DashboardWidget } from '@/services/core/dashboard-widget.interface';

/**
 * Function: WechatPlugin
 *
 * Description: 微信插件注册入口。
 *   当 PLUGIN_WECHAT=true 时，通过 init() 注册微信相关的 services/repositories/dashboard widgets。
 */
export const wechatPlugin = {
	name: 'wechat',
	version: '1.0.0',
	init(context: {
		registerServices: (s: Record<string, unknown>) => void;
		registerDashboardWidgets: (w: DashboardWidget[]) => void;
	}) {
		// 注册微信相关资源
		// 当前阶段先做基础注册，后续 Phase 扩展
	},
};
