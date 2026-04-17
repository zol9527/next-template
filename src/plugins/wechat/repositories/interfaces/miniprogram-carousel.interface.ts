import type { RepoContext } from '@/types/repo/repo-context'

/**
 * 小程序轮播图数据传输对象
 */
export type MiniprogramCarouselDto = {
	id: string
	title: string
	imageUrl: string
	sortOrder: number
	isActive: boolean
	createdAt: string
	updatedAt: string
}

/**
 * 小程序轮播图仓储接口
 * 定义轮播图数据访问层的契约
 */
export interface MiniprogramCarouselRepository {
	/**
	 * 分页查询轮播图列表
	 * @param ctx - 仓储上下文
	 * @param params - 查询参数
	 * @returns 轮播图列表和总数
	 */
	list(
		ctx: RepoContext,
		params: {
			page?: number
			pageSize?: number
			isActive?: boolean
		}
	): Promise<{ items: MiniprogramCarouselDto[]; total: number }>

	/**
	 * 根据 ID 获取轮播图
	 * @param ctx - 仓储上下文
	 * @param id - 轮播图 ID
	 * @returns 轮播图详情或 null
	 */
	getById(ctx: RepoContext, id: string): Promise<MiniprogramCarouselDto | null>

	/**
	 * 创建轮播图
	 * @param ctx - 仓储上下文
	 * @param params - 创建参数
	 * @returns 创建的轮播图
	 */
	create(
		ctx: RepoContext,
		params: {
			title: string
			imageUrl: string
			sortOrder: number
			isActive: boolean
		}
	): Promise<MiniprogramCarouselDto>

	/**
	 * 更新轮播图
	 * @param ctx - 仓储上下文
	 * @param id - 轮播图 ID
	 * @param params - 更新参数
	 * @returns 更新后的轮播图
	 */
	update(
		ctx: RepoContext,
		id: string,
		params: {
			title?: string
			imageUrl?: string
			sortOrder?: number
			isActive?: boolean
		}
	): Promise<MiniprogramCarouselDto>

	/**
	 * 删除轮播图
	 * @param ctx - 仓储上下文
	 * @param id - 轮播图 ID
	 */
	delete(ctx: RepoContext, id: string): Promise<void>

	/**
	 * 切换轮播图启用状态
	 * @param ctx - 仓储上下文
	 * @param id - 轮播图 ID
	 * @returns 更新后的轮播图
	 */
	toggleActive(ctx: RepoContext, id: string): Promise<MiniprogramCarouselDto>

	/**
	 * 批量调整排序
	 * @param ctx - 仓储上下文
	 * @param items - 轮播图 ID 和排序值数组
	 */
	reorder(
		ctx: RepoContext,
		items: Array<{ id: string; sortOrder: number }>
	): Promise<void>

	/**
	 * 统计启用的轮播图数量
	 * @param ctx - 仓储上下文
	 * @returns 启用的轮播图数量
	 */
	countActive(ctx: RepoContext): Promise<number>
}
