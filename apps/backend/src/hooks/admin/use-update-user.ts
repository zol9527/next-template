/**
 * File: use-update-user.ts
 * Description: 管理员更新用户信息 Mutation Hook
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { UpdateUserRequest, UpdateUserResponse } from '@/contracts/dtos/admin/users.dto'

/**
 * 管理员更新用户基本信息
 */
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, ...updates }: UpdateUserRequest & { userId: string }) => {
      const res = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: { message: '请求失败' } }))
        throw new Error(error.error?.message || '更新用户失败')
      }

      const json = (await res.json()) as ApiResponse<UpdateUserResponse>
      if (!json.success) {
        throw new Error(json.error?.message || '更新用户失败')
      }

      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}
