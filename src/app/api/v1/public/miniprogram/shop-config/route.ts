import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSystemSettingsRepository } from '@/repositories/factory'
import type { MiniprogramShopBannerConfig } from '@/contracts/dtos/admin/miniprogram-shop-config.dto'

/** SystemSetting 中存储商城 Banner 配置的 key */
const SHOP_BANNER_CONFIG_KEY = 'miniprogram.shop.banner_config'

/** 默认配置（公开接口需要提供兜底值） */
const DEFAULT_CONFIG: MiniprogramShopBannerConfig = {
	enabled: true,
	title: '年度会员 · 全站畅学',
	subtitle: '128 门精品课程无限次学习',
	linkType: 'none',
	linkUrl: null,
	productId: null,
}

/**
 * GET /api/v1/public/miniprogram/shop-config
 *
 * Description: 获取商城 VIP Banner 配置（公开接口，无需认证）
 */
export const GET = withV1Route({
	pluginGuard: 'wechat',
	action: 'public:miniprogram:shop:config',
	requireAuth: false,
	schemas: {},
	handler: async ({ req, serviceContext }) => {
		const repo = await createSystemSettingsRepository()

		const repoCtx = {
			traceId: serviceContext.traceId,
			logger: serviceContext.logger.child({ layer: 'repository' }),
		}

		const raw = await repo.getSetting<string>(repoCtx, { key: SHOP_BANNER_CONFIG_KEY })

		const config: MiniprogramShopBannerConfig = raw ? JSON.parse(raw) : DEFAULT_CONFIG

		serviceContext.logger.info({
			action: 'public_miniprogram_shop_config.get',
		})

		return createJsonApiResponse(req, ok(config))
	},
})

export function OPTIONS(req: NextRequest) {
	return createOptionsResponse(req)
}
