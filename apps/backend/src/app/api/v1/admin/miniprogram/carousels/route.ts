import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import {
	MiniprogramCarouselListQuerySchema,
	CreateMiniprogramCarouselRequestSchema,
} from '@/plugins/wechat/contracts/miniprogram-carousel.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMiniprogramCarouselRepository } from '@/repositories/factory'
import { createAdminMiniprogramCarouselService } from '@/plugins/wechat/services/admin-miniprogram-carousel.service'

/**
 * GET /api/v1/admin/miniprogram/carousels
 *
 * Description: 获取小程序轮播图列表（分页）
 *
 * Permissions: admin:miniprogram:carousel:view
 */
export const GET = withV1Route({
	pluginGuard: 'wechat',
	action: 'admin:miniprogram:carousel:view',
	requireAccess: { action: 'read' as Action, scope: 'miniprogram.carousels' as Scope },
	schemas: { query: MiniprogramCarouselListQuerySchema },
	handler: async ({ req, serviceContext, query }) => {
		const carousels = await createMiniprogramCarouselRepository()
		const service = createAdminMiniprogramCarouselService({ carousels }, serviceContext)
		const data = await service.listCarousels(query!)

		return createJsonApiResponse(req, ok(data))
	},
})

/**
 * POST /api/v1/admin/miniprogram/carousels
 *
 * Description: 创建小程序轮播图
 *
 * Permissions: admin:miniprogram:carousel:create
 */
export const POST = withV1Route({
	pluginGuard: 'wechat',
	action: 'admin:miniprogram:carousel:create',
	requireAccess: { action: 'write' as Action, scope: 'miniprogram.carousels' as Scope },
	schemas: { body: CreateMiniprogramCarouselRequestSchema },
	handler: async ({ req, serviceContext, body }) => {
		const carousels = await createMiniprogramCarouselRepository()
		const service = createAdminMiniprogramCarouselService({ carousels }, serviceContext)
		const data = await service.createCarousel(body!)

		return createJsonApiResponse(req, ok(data))
	},
})

export function OPTIONS(req: NextRequest) {
	return createOptionsResponse(req)
}
