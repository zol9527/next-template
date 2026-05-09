import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSystemSettingsRepository } from '@/repositories/factory'
import type { MiniprogramHomeBannerConfig } from '@/contracts/dtos/admin/miniprogram-home-config.dto'

/** SystemSetting 中存储首页 Banner 配置的 key */
const HOME_BANNER_CONFIG_KEY = 'miniprogram.home.banner_config'

/** 默认配置（公开接口需要提供兜底值） */
const DEFAULT_CONFIG: MiniprogramHomeBannerConfig = {
	enabled: true,
	tagText: '限时免费',
	title: '零基础入门\n数据分析实战课',
	subtitle: '前 100 名报名免费',
	linkType: 'none',
	linkUrl: null,
	productId: null,
}

/**
 * GET /api/v1/public/miniprogram/home-config
 *
 * Description: 获取首页 Banner 配置（公开接口，无需认证）
 */
export const GET = withV1Route({
	pluginGuard: 'wechat',
	action: 'public:miniprogram:home:config',
	requireAuth: false,
	schemas: {},
	handler: async ({ req, serviceContext }) => {
		const repo = await createSystemSettingsRepository()

		const repoCtx = {
			traceId: serviceContext.traceId,
			logger: serviceContext.logger.child({ layer: 'repository' }),
		}

		const raw = await repo.getSetting<string>(repoCtx, { key: HOME_BANNER_CONFIG_KEY })

		const config: MiniprogramHomeBannerConfig = raw ? JSON.parse(raw) : DEFAULT_CONFIG

		serviceContext.logger.info({
			action: 'public_miniprogram_home_config.get',
		})

		return createJsonApiResponse(req, ok(config))
	},
})

export function OPTIONS(req: NextRequest) {
	return createOptionsResponse(req)
}
