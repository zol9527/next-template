import type { NextRequest } from 'next/server'

import { z } from 'zod'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import {
	UpdateMiniprogramCarouselRequestSchema,
} from '@/plugins/wechat/contracts/miniprogram-carousel.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMiniprogramCarouselRepository } from '@/repositories/factory'
import { createAdminMiniprogramCarouselService } from '@/plugins/wechat/services/admin-miniprogram-carousel.service'

// 路径参数 Schema
const ParamsSchema = z.object({
	id: z.string().uuid('ID 格式不正确'),
})

/**
 * GET /api/v1/admin/miniprogram/carousels/[id]
 *
 * Description: 获取单个小程序轮播图详情
 *
 * Permissions: admin:miniprogram:carousel:view
 */
export const GET = withV1Route({
	pluginGuard: 'wechat',
	action: 'admin:miniprogram:carousel:view',
	requireAccess: { action: 'read' as Action, scope: 'miniprogram.carousels' as Scope },
	schemas: { params: ParamsSchema },
	handler: async ({ req, serviceContext, params }) => {
		const carousels = await createMiniprogramCarouselRepository()
		const service = createAdminMiniprogramCarouselService({ carousels }, serviceContext)
		const data = await service.getCarouselById(params.id)

		if (!data) {
			return createJsonApiResponse(
				req,
				{ success: false, error: { code: 'NOT_FOUND', message: '轮播图不存在' } },
				{ status: 404 }
			)
		}

		return createJsonApiResponse(req, ok(data))
	},
})

/**
 * PUT /api/v1/admin/miniprogram/carousels/[id]
 *
 * Description: 更新小程序轮播图
 *
 * Permissions: admin:miniprogram:carousel:update
 */
export const PUT = withV1Route({
	pluginGuard: 'wechat',
	action: 'admin:miniprogram:carousel:update',
	requireAccess: { action: 'write' as Action, scope: 'miniprogram.carousels' as Scope },
	schemas: {
		params: ParamsSchema,
		body: UpdateMiniprogramCarouselRequestSchema,
	},
	handler: async ({ req, serviceContext, body, params }) => {
		const carousels = await createMiniprogramCarouselRepository()
		const service = createAdminMiniprogramCarouselService({ carousels }, serviceContext)
		const data = await service.updateCarousel({ carouselId: params.id, ...body! })

		if (!data) {
			return createJsonApiResponse(
				req,
				{ success: false, error: { code: 'NOT_FOUND', message: '轮播图不存在' } },
				{ status: 404 }
			)
		}

		return createJsonApiResponse(req, ok(data))
	},
})

/**
 * DELETE /api/v1/admin/miniprogram/carousels/[id]
 *
 * Description: 删除小程序轮播图
 *
 * Permissions: admin:miniprogram:carousel:delete
 */
export const DELETE = withV1Route({
	pluginGuard: 'wechat',
	action: 'admin:miniprogram:carousel:delete',
	requireAccess: { action: 'write' as Action, scope: 'miniprogram.carousels' as Scope },
	schemas: { params: ParamsSchema },
	handler: async ({ req, serviceContext, params }) => {
		const carousels = await createMiniprogramCarouselRepository()
		const service = createAdminMiniprogramCarouselService({ carousels }, serviceContext)
		await service.deleteCarousel(params.id)

		return createJsonApiResponse(req, ok({ deleted: true }))
	},
})

export function OPTIONS(req: NextRequest) {
	return createOptionsResponse(req)
}
