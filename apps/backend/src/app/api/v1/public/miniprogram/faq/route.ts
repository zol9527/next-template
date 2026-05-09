import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMiniprogramFaqRepository } from '@/repositories/factory'
import type { RepoContext } from '@/types/repo/repo-context'
import type { FaqRecord } from '@/plugins/wechat/repositories/interfaces/miniprogram-faq.interface'

/**
 * 格式化公开 FAQ 响应，只返回必要字段
 * 隐藏 sort、enabled、createdAt、updatedAt 等内部字段
 */
function formatPublicFaq(raw: FaqRecord) {
	return { id: raw.id, question: raw.question, answer: raw.answer }
}

/**
 * GET /api/v1/public/miniprogram/faq
 *
 * Description: 获取启用的小程序 FAQ 列表（公开接口，无需认证）
 *
 * 返回按 sort 升序排列的启用 FAQ，仅包含 id、question、answer
 */
export const GET = withV1Route({
	pluginGuard: 'wechat',
	action: 'public:miniprogram:faq:list',
	requireAuth: false,
	schemas: {},
	handler: async ({ req, serviceContext }) => {
		const repo = await createMiniprogramFaqRepository()

		// 创建 repository 上下文
		const repoCtx: RepoContext = {
			traceId: serviceContext.traceId,
			logger: serviceContext.logger.child({ layer: 'repository' }),
		}

		// 获取所有启用的 FAQ（已按 sort 升序排列）
		const faqs = await repo.listEnabled(repoCtx)

		serviceContext.logger.info({
			action: 'public_miniprogram_faq.list',
			count: faqs.length,
		})

		const data = faqs.map(formatPublicFaq)
		return createJsonApiResponse(req, ok(data))
	},
})

export function OPTIONS(req: NextRequest) {
	return createOptionsResponse(req)
}
