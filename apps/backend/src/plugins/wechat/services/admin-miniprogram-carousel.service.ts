import type {
	MiniprogramCarouselDto,
	MiniprogramCarouselListResponse,
} from '@/plugins/wechat/contracts/miniprogram-carousel.dto'
import type { MiniprogramCarouselRepository } from '@/plugins/wechat/repositories/interfaces/miniprogram-carousel.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'

// =============================================================================
// Admin MiniprogramCarousel Service
// =============================================================================

/**
 * Function: createAdminMiniprogramCarouselService
 *
 * Description: 创建管理员小程序轮播图服务，负责轮播图的 CRUD 管理
 *
 * Parameters:
 *     deps({ carousels: MiniprogramCarouselRepository }): 依赖注入的 MiniprogramCarouselRepository
 *     ctx(ServiceContext): Service 上下文
 *
 * Returns:
 *     service(object): 提供 list/get/create/update/delete/toggle/reorder 方法的服务对象
 */
export function createAdminMiniprogramCarouselService(
	deps: { carousels: MiniprogramCarouselRepository },
	ctx: ServiceContext,
) {
	const { logger } = ctx

	const repoCtx: RepoContext = {
		traceId: ctx.traceId,
		logger: ctx.logger.child({ layer: 'repository' }),
	}

	return {
		/**
		 * 获取轮播图列表（分页）
		 */
		async listCarousels(params: {
			page?: number
			pageSize?: number
			isActive?: boolean
		}): Promise<MiniprogramCarouselListResponse> {
			const result = await deps.carousels.list(repoCtx, params)

			logger.info({
				action: 'admin_miniprogram_carousel.list',
				count: result.items.length,
				total: result.total,
			})

			return {
				items: result.items,
				total: result.total,
			}
		},

		/**
		 * 根据 ID 获取轮播图
		 */
		async getCarouselById(carouselId: string): Promise<MiniprogramCarouselDto | null> {
			const carousel = await deps.carousels.getById(repoCtx, carouselId)

			if (!carousel) return null

			logger.info({ action: 'admin_miniprogram_carousel.get', carouselId })

			return carousel
		},

		/**
		 * 创建轮播图
		 */
		async createCarousel(params: {
			title: string
			imageUrl: string
			sortOrder: number
			isActive: boolean
		}): Promise<MiniprogramCarouselDto> {
			const created = await deps.carousels.create(repoCtx, params)

			logger.info({
				action: 'admin_miniprogram_carousel.create',
				carouselId: created.id,
				title: params.title,
			})

			return created
		},

		/**
		 * 更新轮播图
		 */
		async updateCarousel(params: {
			carouselId: string
			title?: string
			imageUrl?: string
			sortOrder?: number
			isActive?: boolean
		}): Promise<MiniprogramCarouselDto | null> {
			const updated = await deps.carousels.update(repoCtx, params.carouselId, {
				title: params.title,
				imageUrl: params.imageUrl,
				sortOrder: params.sortOrder,
				isActive: params.isActive,
			})

			logger.info({
				action: 'admin_miniprogram_carousel.update',
				carouselId: params.carouselId,
			})

			return updated
		},

		/**
		 * 删除轮播图
		 */
		async deleteCarousel(carouselId: string): Promise<{ deleted: true }> {
			await deps.carousels.delete(repoCtx, carouselId)

			logger.info({
				action: 'admin_miniprogram_carousel.delete',
				carouselId,
			})

			return { deleted: true }
		},

		/**
		 * 切换轮播图启用状态
		 */
		async toggleCarouselActive(carouselId: string): Promise<MiniprogramCarouselDto> {
			const updated = await deps.carousels.toggleActive(repoCtx, carouselId)

			logger.info({
				action: 'admin_miniprogram_carousel.toggle_active',
				carouselId,
				isActive: updated.isActive,
			})

			return updated
		},

		/**
		 * 批量调整排序
		 */
		async reorderCarousels(params: {
			carouselOrders: Array<{ id: string; sortOrder: number }>
		}): Promise<{ reordered: true }> {
			await deps.carousels.reorder(repoCtx, params.carouselOrders)

			logger.info({
				action: 'admin_miniprogram_carousel.reorder',
				count: params.carouselOrders.length,
			})

			return { reordered: true }
		},
	}
}

export type AdminMiniprogramCarouselService = ReturnType<typeof createAdminMiniprogramCarouselService>
