import { prisma } from '@/lib/prisma'
import type {
	MiniprogramCarouselRepository,
	MiniprogramCarouselDto,
} from '@/plugins/wechat/repositories/interfaces/miniprogram-carousel.interface'
import type { RepoContext } from '@/types/repo/repo-context'

// =============================================================================
// Mapper Functions
// =============================================================================

/**
 * Function: mapMiniprogramCarousel
 *
 * Description: 将 Prisma 返回的轮播图模型映射为 DTO
 *
 * Parameters:
 *     carousel(object): Prisma 轮播图模型
 *
 * Returns:
 *     MiniprogramCarouselDto: 轮播图数据传输对象
 */
function mapMiniprogramCarousel(carousel: {
	id: string
	title: string
	imageUrl: string
	sortOrder: number
	isActive: boolean
	createdAt: Date
	updatedAt: Date
}): MiniprogramCarouselDto {
	return {
		id: carousel.id,
		title: carousel.title,
		imageUrl: carousel.imageUrl,
		sortOrder: carousel.sortOrder,
		isActive: carousel.isActive,
		createdAt: carousel.createdAt.toISOString(),
		updatedAt: carousel.updatedAt.toISOString(),
	}
}

// =============================================================================
// MiniprogramCarousel Repository Implementation
// =============================================================================

/**
 * Function: createPrismaMiniprogramCarouselRepository
 *
 * Description: 创建 Prisma 小程序轮播图仓储实例
 *
 * Returns:
 *     MiniprogramCarouselRepository: 轮播图仓储接口实例
 */
export function createPrismaMiniprogramCarouselRepository(): MiniprogramCarouselRepository {
	return {
		/**
		 * 分页查询轮播图列表
		 */
		async list(ctx: RepoContext, params) {
			const { logger } = ctx
			const page = params.page ?? 1
			const pageSize = Math.min(params.pageSize ?? 20, 100)
			const skip = (page - 1) * pageSize

			logger.info({
				action: 'miniprogram_carousel.list',
				page,
				pageSize,
				isActive: params.isActive,
			})

			const where: Record<string, unknown> = {}
			if (params.isActive !== undefined) {
				where.isActive = params.isActive
			}

			const [carousels, total] = await Promise.all([
				prisma.miniprogramCarousel.findMany({
					where,
					orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
					skip,
					take: pageSize,
				}),
				prisma.miniprogramCarousel.count({ where }),
			])

			return {
				items: carousels.map(mapMiniprogramCarousel),
				total,
			}
		},

		/**
		 * 根据 ID 获取轮播图
		 */
		async getById(ctx: RepoContext, id: string) {
			const { logger } = ctx
			logger.info({ action: 'miniprogram_carousel.get_by_id', id })

			const carousel = await prisma.miniprogramCarousel.findUnique({
				where: { id },
			})

			return carousel ? mapMiniprogramCarousel(carousel) : null
		},

		/**
		 * 创建轮播图
		 */
		async create(ctx: RepoContext, params) {
			const { logger } = ctx
			logger.info({
				action: 'miniprogram_carousel.create',
				title: params.title,
				sortOrder: params.sortOrder,
			})

			// 检查启用轮播图数量限制（最多3个）
			if (params.isActive) {
				const activeCount = await prisma.miniprogramCarousel.count({
					where: { isActive: true },
				})
				if (activeCount >= 3) {
					const error = new Error('最多只能启用3个轮播图') as Error & { code?: string }
					error.code = 'MAX_ACTIVE_CAROUSELS'
					throw error
				}
			}

			const carousel = await prisma.miniprogramCarousel.create({
				data: {
					title: params.title,
					imageUrl: params.imageUrl,
					sortOrder: params.sortOrder,
					isActive: params.isActive,
				},
			})

			return mapMiniprogramCarousel(carousel)
		},

		/**
		 * 更新轮播图
		 */
		async update(ctx: RepoContext, id, params) {
			const { logger } = ctx
			logger.info({ action: 'miniprogram_carousel.update', id })

			// 如果要启用，检查数量限制
			if (params.isActive === true) {
				const current = await prisma.miniprogramCarousel.findUnique({
					where: { id },
				})
				if (current && !current.isActive) {
					const activeCount = await prisma.miniprogramCarousel.count({
						where: { isActive: true },
					})
					if (activeCount >= 3) {
						const error = new Error('最多只能启用3个轮播图') as Error & { code?: string }
						error.code = 'MAX_ACTIVE_CAROUSELS'
						throw error
					}
				}
			}

			const updates: Record<string, unknown> = {}
			if (params.title !== undefined) updates.title = params.title
			if (params.imageUrl !== undefined) updates.imageUrl = params.imageUrl
			if (params.sortOrder !== undefined) updates.sortOrder = params.sortOrder
			if (params.isActive !== undefined) updates.isActive = params.isActive

			const carousel = await prisma.miniprogramCarousel.update({
				where: { id },
				data: updates,
			})

			return mapMiniprogramCarousel(carousel)
		},

		/**
		 * 删除轮播图
		 */
		async delete(ctx: RepoContext, id: string) {
			const { logger } = ctx
			logger.info({ action: 'miniprogram_carousel.delete', id })

			await prisma.miniprogramCarousel.delete({
				where: { id },
			})
		},

		/**
		 * 切换轮播图启用状态
		 */
		async toggleActive(ctx: RepoContext, id: string) {
			const { logger } = ctx
			logger.info({ action: 'miniprogram_carousel.toggle_active', id })

			const current = await prisma.miniprogramCarousel.findUnique({
				where: { id },
			})

			if (!current) {
				throw new Error('轮播图不存在') as Error & { code?: string; status?: number }
			}

			// 如果要启用，检查数量限制
			if (!current.isActive) {
				const activeCount = await prisma.miniprogramCarousel.count({
					where: { isActive: true },
				})
				if (activeCount >= 3) {
					const error = new Error('最多只能启用3个轮播图') as Error & { code?: string }
					error.code = 'MAX_ACTIVE_CAROUSELS'
					throw error
				}
			}

			const carousel = await prisma.miniprogramCarousel.update({
				where: { id },
				data: { isActive: !current.isActive },
			})

			return mapMiniprogramCarousel(carousel)
		},

		/**
		 * 批量调整排序
		 */
		async reorder(ctx: RepoContext, items) {
			const { logger } = ctx
			logger.info({
				action: 'miniprogram_carousel.reorder',
				count: items.length,
			})

			// 使用事务批量更新
			await prisma.$transaction(
				items.map((item) =>
					prisma.miniprogramCarousel.update({
						where: { id: item.id },
						data: { sortOrder: item.sortOrder },
					})
				)
			)
		},

		/**
		 * 统计启用的轮播图数量
		 */
		async countActive(ctx: RepoContext) {
			const { logger } = ctx
			logger.info({ action: 'miniprogram_carousel.count_active' })

			return prisma.miniprogramCarousel.count({
				where: { isActive: true },
			})
		},
	}
}
