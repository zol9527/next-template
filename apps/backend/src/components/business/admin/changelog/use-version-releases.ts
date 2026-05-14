'use client'

import { useQuery } from '@tanstack/react-query'
import type { VersionReleaseResponse, VersionReleaseListQuery } from '@/contracts/dtos/version-release.dto'
import type { ApiResponse } from '@/contracts/api-response.schema'
import { ClientApiError } from '@/lib/errors/client-api-error'

/**
 * 版本列表响应类型
 */
export interface VersionReleasesListResponse {
	success: boolean
	data: {
		items: VersionReleaseResponse[]
		total: number
		page: number
		pageSize: number
		totalPages: number
	}
}

/**
 * Function: useVersionReleases
 *
 * Description: 获取版本发布列表的自定义 Hook
 *
 * Parameters:
 * 	query({ page: number, pageSize: number }): 分页查询参数
 *
 * Returns:
 * 	object(QueryObserverResult): TanStack Query 结果对象
 */
export function useVersionReleases(query: VersionReleaseListQuery) {
	return useQuery({
		queryKey: ['admin', 'version-releases', query],
		queryFn: async () => {
			const params = new URLSearchParams({
				page: String(query.page),
				pageSize: String(query.pageSize),
			})

			const res = await fetch(`/api/v1/admin/version-releases?${params}`, {
				credentials: 'include',
			})

			const json = await res.json()

			// 使用 ClientApiError 统一错误格式，确保 error.code 被正确保留
			// 这样 AuthRefreshHandler 才能区分 MFA_REQUIRED 等特殊错误码
			if (!res.ok) {
				throw ClientApiError.fromResponse(res, json)
			}

			const typedJson = json as ApiResponse<VersionReleasesListResponse['data']>
			if (!typedJson.success) {
				throw new ClientApiError(
					typedJson.error?.code || 'INTERNAL_ERROR',
					typedJson.error?.message || '获取版本列表失败',
					res.status,
				)
			}

			// 适配响应格式
			return {
				success: true,
				data: typedJson.data,
			} as VersionReleasesListResponse
		},
		staleTime: 10 * 60 * 1000, // 10 分钟缓存
		retry: 1,
	})
}
