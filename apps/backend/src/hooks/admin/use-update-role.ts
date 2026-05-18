/**
 * File: use-update-role.ts
 * Description: 管理员更新角色信息 Mutation Hook
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { UpdateRoleRequest, UpdateRoleResponse } from '@/contracts/dtos/admin/rbac/roles.dto'

/**
 * 管理员更新角色名称和描述
 */
export function useUpdateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roleId, ...updates }: UpdateRoleRequest & { roleId: string }) => {
      const res = await fetch(`/api/v1/admin/rbac/roles/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: { message: '请求失败' } }))
        throw new Error(error.error?.message || '更新角色失败')
      }

      const json = (await res.json()) as ApiResponse<UpdateRoleResponse>
      if (!json.success) {
        throw new Error(json.error?.message || '更新角色失败')
      }

      return json.data
    },
    onSuccess: (_, variables) => {
      // 使角色列表缓存失效
      queryClient.invalidateQueries({ queryKey: ['admin', 'rbac', 'roles'] })
      // 使角色详情缓存失效
      queryClient.invalidateQueries({ queryKey: ['admin', 'rbac', 'roles', variables.roleId, 'detail'] })
    },
  })
}
