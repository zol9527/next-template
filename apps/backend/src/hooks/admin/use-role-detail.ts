/**
 * File: use-role-detail.ts
 * Description: 角色详情查询 Hook
 */

import { useQuery } from '@tanstack/react-query'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { AdminRoleDetailResponse } from '@/contracts/dtos/admin/rbac/roles.dto'

/**
 * 获取单个角色详情（含权限列表和用户数）
 */
export function useRoleDetail(roleId: string | null) {
  return useQuery<AdminRoleDetailResponse>({
    queryKey: ['admin', 'rbac', 'roles', roleId, 'detail'],
    queryFn: async () => {
      if (!roleId) throw new Error('角色 ID 不能为空')

      const res = await fetch(`/api/v1/admin/rbac/roles/${roleId}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: { message: '请求失败' } }))
        throw new Error(error.error?.message || '获取角色详情失败')
      }

      const json = (await res.json()) as ApiResponse<AdminRoleDetailResponse>
      if (!json.success) {
        throw new Error(json.error?.message || '获取角色详情失败')
      }

      return json.data
    },
    enabled: !!roleId,
    staleTime: 5 * 60 * 1000,
  })
}
