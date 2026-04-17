/**
 * File: use-rbac-permissions.ts
 * Description: RBAC Scope 列表查询 Hook，使用 TanStack Query 进行状态管理
 */

import { useQuery } from '@tanstack/react-query'
import type { ApiResponse } from '@/contracts/api-response.schema'
import { AdminRbacScopesResponseSchema, type ScopeEntry } from '@/contracts/dtos/admin/rbac/permissions.dto'

export function useRbacScopes() {
  return useQuery<ScopeEntry[]>({
    queryKey: ['admin', 'rbac', 'scopes'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/rbac/permissions', {
        credentials: 'include',
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: { message: '请求失败' } }))
        throw new Error(error.error?.message || '获取权限范围列表失败')
      }

      const json = (await res.json()) as ApiResponse<{ scopes: ScopeEntry[] }>

      if (!json.success) {
        throw new Error(json.error?.message || '获取权限范围列表失败')
      }

      const parsed = AdminRbacScopesResponseSchema.safeParse(json.data)
      if (!parsed.success) {
        throw new Error('权限范围列表响应格式不正确')
      }

      return parsed.data.scopes
    },
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Function: invalidateRbacPermissionsCache
 *
 * Description: 使权限缓存失效
 *
 * Parameters:
 * 	queryClient(QueryClient): TanStack Query 客户端实例
 *
 * Returns:
 * 	void
 */
export function invalidateRbacPermissionsCache(queryClient: import('@tanstack/react-query').QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['admin', 'rbac', 'scopes'] })
}
