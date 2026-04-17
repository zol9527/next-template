'use client'

import { useQuery } from '@tanstack/react-query'
import type { VersionReleaseResponse, VersionReleaseListQuery } from '@/contracts/dtos/version-release.dto'
import type { ApiResponse } from '@/contracts/api-response.schema'

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

			if (!res.ok) {
				throw new Error(`Failed to fetch: ${res.statusText}`)
			}

			const json = (await res.json()) as ApiResponse<VersionReleasesListResponse['data']>
			if (!json.success) {
				throw new Error(json.error?.message || '获取版本列表失败')
			}

			// 适配响应格式
			return {
				success: true,
				data: json.data,
			} as VersionReleasesListResponse
		},
		staleTime: 10 * 60 * 1000, // 10 分钟缓存
		retry: 1,
	})
}
