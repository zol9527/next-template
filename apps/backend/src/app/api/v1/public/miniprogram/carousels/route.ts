import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMiniprogramCarouselRepository } from '@/repositories/factory'
import type { RepoContext } from '@/types/repo/repo-context'

/**
 * GET /api/v1/public/miniprogram/carousels
 *
 * Description: 获取启用的小程序轮播图列表（公开接口，无需认证）
 *
 * 返回按 sortOrder 排序的启用轮播图
 */
export const GET = withV1Route({
	pluginGuard: 'wechat',
	action: 'public:miniprogram:carousel:list',
	requireAuth: false,
	schemas: {},
	handler: async ({ req, serviceContext }) => {
		const carousels = await createMiniprogramCarouselRepository()

		// 创建 repository 上下文
		const repoCtx: RepoContext = {
			traceId: serviceContext.traceId,
			logger: serviceContext.logger.child({ layer: 'repository' }),
		}

		// 获取所有启用的轮播图
		const result = await carousels.list(repoCtx, {
			isActive: true,
			page: 1,
			pageSize: 3, // 最多返回 3 个
		})

		serviceContext.logger.info({
			action: 'public_miniprogram_carousel.list',
			count: result.items.length,
		})

		return createJsonApiResponse(req, ok(result.items))
	},
})

export function OPTIONS(req: NextRequest) {
	return createOptionsResponse(req)
}
