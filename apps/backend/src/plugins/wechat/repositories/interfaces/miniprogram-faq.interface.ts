import type { RepoContext } from '@/types/repo/repo-context'

/**
 * FAQ 记录类型
 */
export type FaqRecord = {
	id: string
	question: string
	answer: string
	sort: number
	enabled: boolean
	createdAt: Date
	updatedAt: Date
}

/**
 * 创建 FAQ 参数
 */
export type CreateFaqParams = {
	question: string
	answer: string
	sort?: number
	enabled?: boolean
}

/**
 * 更新 FAQ 参数
 */
export type UpdateFaqParams = {
	question?: string
	answer?: string
	sort?: number
	enabled?: boolean
}

/**
 * 小程序 FAQ 仓储接口
 * 定义 FAQ 数据访问层的契约
 */
export interface MiniProgramFaqRepository {
	/**
	 * 查询所有 FAQ，按 sort 升序排列
	 * @param ctx - 仓储上下文
	 * @returns FAQ 列表
	 */
	listAll(ctx: RepoContext): Promise<FaqRecord[]>

	/**
	 * 查询已启用的 FAQ，按 sort 升序排列
	 * @param ctx - 仓储上下文
	 * @returns 已启用的 FAQ 列表
	 */
	listEnabled(ctx: RepoContext): Promise<FaqRecord[]>

	/**
	 * 根据 ID 获取 FAQ
	 * @param ctx - 仓储上下文
	 * @param params - 包含 id 的参数对象
	 * @returns FAQ 详情或 null
	 */
	getById(ctx: RepoContext, params: { id: string }): Promise<FaqRecord | null>

	/**
	 * 创建 FAQ
	 * @param ctx - 仓储上下文
	 * @param params - 创建参数
	 * @returns 创建的 FAQ
	 */
	create(ctx: RepoContext, params: CreateFaqParams): Promise<FaqRecord>

	/**
	 * 更新 FAQ
	 * @param ctx - 仓储上下文
	 * @param params - 包含 id 和更新字段的参数对象
	 * @returns 更新后的 FAQ
	 */
	update(ctx: RepoContext, params: UpdateFaqParams & { id: string }): Promise<FaqRecord>

	/**
	 * 删除 FAQ
	 * @param ctx - 仓储上下文
	 * @param params - 包含 id 的参数对象
	 */
	delete(ctx: RepoContext, params: { id: string }): Promise<void>
}
