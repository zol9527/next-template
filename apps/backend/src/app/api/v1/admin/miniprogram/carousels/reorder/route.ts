import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import {
	ReorderCarouselsRequestSchema,
} from '@/plugins/wechat/contracts/miniprogram-carousel.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMiniprogramCarouselRepository } from '@/repositories/factory'
import { createAdminMiniprogramCarouselService } from '@/plugins/wechat/services/admin-miniprogram-carousel.service'

/**
 * POST /api/v1/admin/miniprogram/carousels/reorder
 *
 * Description: 批量调整小程序轮播图排序
 *
 * Permissions: admin:miniprogram:carousel:update
 */
export const POST = withV1Route({
	pluginGuard: 'wechat',
	action: 'admin:miniprogram:carousel:reorder',
	requireAccess: { action: 'write' as Action, scope: 'miniprogram.carousels' as Scope },
	schemas: { body: ReorderCarouselsRequestSchema },
	handler: async ({ req, serviceContext, body }) => {
		const carousels = await createMiniprogramCarouselRepository()
		const service = createAdminMiniprogramCarouselService({ carousels }, serviceContext)
		await service.reorderCarousels(body!)

		return createJsonApiResponse(req, ok({ reordered: true }))
	},
})

export function OPTIONS(req: NextRequest) {
	return createOptionsResponse(req)
}
