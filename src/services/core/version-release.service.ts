/**
 * Version Release Service
 * 版本发布服务，提供版本记录同步、查询等业务逻辑
 */

import type { VersionReleaseRepository } from '@/repositories/interfaces/core/version-release.repository.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import { NotFoundError } from '@/lib/errors/app-error'

/**
Function: createVersionReleaseService

Description: 创建版本发布服务，负责版本记录同步、查询等业务逻辑

Parameters:
	deps({ versionReleaseRepo: VersionReleaseRepository }): 依赖注入的版本发布仓储
	ctx(ServiceContext): Service 上下文

Returns:
	service(object): 提供版本发布相关方法
*/
export function createVersionReleaseService(
	deps: { versionReleaseRepo: VersionReleaseRepository },
	ctx: ServiceContext,
) {
	const { logger } = ctx

	const repoCtx: RepoContext = {
		traceId: ctx.traceId,
		logger: logger.child({ layer: 'repository' }),
	}

	return {
		/**
		Function: syncVersion

		Description: 同步版本发布记录（幂等操作）

		Parameters:
			data({ version: string, title: string, description: string, releasedAt: Date }): 版本信息

		Returns:
			versionRelease(VersionRelease): 版本发布记录
		*/
		async syncVersion(data: {
			version: string
			title: string
			description: string
			releasedAt: Date
		}) {
			logger.info({ action: 'version_release.sync', version: data.version }, '同步版本发布记录')

			// 检查版本是否已存在
			const exists = await deps.versionReleaseRepo.exists(repoCtx, data.version)

			if (exists) {
				logger.info({ version: data.version }, '版本已存在，跳过创建')
				return await deps.versionReleaseRepo.findByVersion(repoCtx, data.version)
			}

			return await deps.versionReleaseRepo.create(repoCtx, data)
		},

		/**
		Function: getVersionList

		Description: 分页获取版本发布记录列表

		Parameters:
			params({ page: number, pageSize: number }): 分页参数

		Returns:
			result({ items: VersionRelease[], total: number, page: number, pageSize: number, totalPages: number }): 分页结果
		*/
		async getVersionList(params: { page: number; pageSize: number }) {
			logger.info({ action: 'version_release.list', params }, '获取版本列表')

			const skip = (params.page - 1) * params.pageSize
			const [items, total] = await Promise.all([
				deps.versionReleaseRepo.findMany(repoCtx, {
					skip,
					take: params.pageSize,
					orderBy: { releasedAt: 'desc' },
				}),
				deps.versionReleaseRepo.count(repoCtx),
			])

			return {
				items,
				total,
				page: params.page,
				pageSize: params.pageSize,
				totalPages: Math.ceil(total / params.pageSize),
			}
		},

		/**
		Function: getVersion

		Description: 根据版本号获取版本详情

		Parameters:
			version(string): 版本号

		Returns:
			versionRelease(VersionRelease): 版本发布记录

		Raises:
			NotFoundError: 当版本不存在时抛出 404 NOT_FOUND 错误
		*/
		async getVersion(version: string) {
			logger.info({ action: 'version_release.get', version }, '获取版本详情')

			const record = await deps.versionReleaseRepo.findByVersion(repoCtx, version)
			if (!record) {
				throw new NotFoundError(`版本 ${version} 不存在`)
			}

			return record
		},
	}
}

export type VersionReleaseService = ReturnType<typeof createVersionReleaseService>
