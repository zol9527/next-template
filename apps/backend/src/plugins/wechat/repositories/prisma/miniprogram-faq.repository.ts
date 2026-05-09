import { prisma } from '@/lib/prisma'
import type {
	MiniProgramFaqRepository,
	FaqRecord,
} from '@/plugins/wechat/repositories/interfaces/miniprogram-faq.interface'
import type { RepoContext } from '@/types/repo/repo-context'

// =============================================================================
// Mapper Functions
// =============================================================================

/**
 * Function: toFaqRecord
 *
 * Description: 将 Prisma 返回的 FAQ 模型映射为 FaqRecord
 *
 * Parameters:
 *     faq(object): Prisma FAQ 模型
 *
 * Returns:
 *     FaqRecord: FAQ 记录对象
 */
function toFaqRecord(faq: {
	id: string
	question: string
	answer: string
	sort: number
	enabled: boolean
	createdAt: Date
	updatedAt: Date
}): FaqRecord {
	return {
		id: faq.id,
		question: faq.question,
		answer: faq.answer,
		sort: faq.sort,
		enabled: faq.enabled,
		createdAt: faq.createdAt,
		updatedAt: faq.updatedAt,
	}
}

// =============================================================================
// MiniProgramFaq Repository Implementation
// =============================================================================

/**
 * Function: createPrismaMiniProgramFaqRepository
 *
 * Description: 创建 Prisma 小程序 FAQ 仓储实例
 *
 * Returns:
 *     MiniProgramFaqRepository: FAQ 仓储接口实例
 */
export function createPrismaMiniProgramFaqRepository(): MiniProgramFaqRepository {
	return {
		/**
		 * 查询所有 FAQ，按 sort 升序排列
		 */
		async listAll(ctx: RepoContext) {
			const { logger } = ctx
			logger.info({ action: 'miniprogram_faq.list_all' })

			const faqs = await prisma.miniProgramFaq.findMany({
				orderBy: { sort: 'asc' },
			})

			return faqs.map(toFaqRecord)
		},

		/**
		 * 查询已启用的 FAQ，按 sort 升序排列
		 */
		async listEnabled(ctx: RepoContext) {
			const { logger } = ctx
			logger.info({ action: 'miniprogram_faq.list_enabled' })

			const faqs = await prisma.miniProgramFaq.findMany({
				where: { enabled: true },
				orderBy: { sort: 'asc' },
			})

			return faqs.map(toFaqRecord)
		},

		/**
		 * 根据 ID 获取 FAQ
		 */
		async getById(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'miniprogram_faq.get_by_id', id: params.id })

			const faq = await prisma.miniProgramFaq.findUnique({
				where: { id: params.id },
			})

			return faq ? toFaqRecord(faq) : null
		},

		/**
		 * 创建 FAQ
		 */
		async create(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({
				action: 'miniprogram_faq.create',
				question: params.question,
				sort: params.sort,
			})

			const faq = await prisma.miniProgramFaq.create({
				data: {
					question: params.question,
					answer: params.answer,
					sort: params.sort ?? 0,
					enabled: params.enabled ?? true,
				},
			})

			return toFaqRecord(faq)
		},

		/**
		 * 更新 FAQ
		 */
		async update(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'miniprogram_faq.update', id: params.id })

			const { id, ...data } = params
			const updates: Record<string, unknown> = {}
			if (data.question !== undefined) updates.question = data.question
			if (data.answer !== undefined) updates.answer = data.answer
			if (data.sort !== undefined) updates.sort = data.sort
			if (data.enabled !== undefined) updates.enabled = data.enabled

			const faq = await prisma.miniProgramFaq.update({
				where: { id },
				data: updates,
			})

			return toFaqRecord(faq)
		},

		/**
		 * 删除 FAQ
		 */
		async delete(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({ action: 'miniprogram_faq.delete', id: params.id })

			await prisma.miniProgramFaq.delete({
				where: { id: params.id },
			})
		},
	}
}
