import type { NextRequest } from 'next/server'

import { z } from 'zod'
import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMiniprogramCarouselRepository } from '@/repositories/factory'
import { createAdminMiniprogramCarouselService } from '@/plugins/wechat/services/admin-miniprogram-carousel.service'

// 路径参数 Schema
const ParamsSchema = z.object({
	id: z.string().uuid('ID 格式不正确'),
})

/**
 * PATCH /api/v1/admin/miniprogram/carousels/[id]/toggle
 *
 * Description: 切换小程序轮播图启用状态
 *
 * Permissions: admin:miniprogram:carousel:update
 */
export const PATCH = withV1Route({
	pluginGuard: 'wechat',
	action: 'admin:miniprogram:carousel:toggle',
	requireAccess: { action: 'write' as Action, scope: 'miniprogram.carousels' as Scope },
	schemas: { params: ParamsSchema },
	handler: async ({ req, serviceContext, params }) => {
		const carousels = await createMiniprogramCarouselRepository()
		const service = createAdminMiniprogramCarouselService({ carousels }, serviceContext)
		const data = await service.toggleCarouselActive(params.id)

		return createJsonApiResponse(req, ok(data))
	},
})

export function OPTIONS(req: NextRequest) {
	return createOptionsResponse(req)
}
