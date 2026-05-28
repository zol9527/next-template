/**
 * File: use-admin-users.ts
 * Description: 管理员用户列表查询 Hook
 */

import { useQuery } from '@tanstack/react-query'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { AdminUserListResponse } from '@/contracts/dtos/admin/users.dto'
import { AdminUserListResponseSchema } from '@/contracts/dtos/admin/users.dto'

export interface AdminUsersParams {
  keyword?: string
  status?: string
  role?: string
  cursor?: string | null
  limit?: number
}

/**
 * 管理员用户列表查询
 */
export function useAdminUsers(params: AdminUsersParams = {}) {
  const { keyword, status, role, cursor, limit = 10 } = params

  return useQuery<AdminUserListResponse>({
    queryKey: ['admin', 'users', { keyword, status, role, cursor, limit }],
    queryFn: async () => {
      const searchParams = new URLSearchParams({ limit: limit.toString() })
      if (cursor) searchParams.append('cursor', cursor)
      if (keyword) searchParams.append('keyword', keyword)
      if (status && status !== 'all') searchParams.append('status', status)
      if (role) searchParams.append('role', role)

      const res = await fetch(`/api/v1/admin/users?${searchParams.toString()}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: { message: '请求失败' } }))
        throw new Error(error.error?.message || `获取用户列表失败 (${res.status})`)
      }

      const json = (await res.json()) as ApiResponse<AdminUserListResponse>
      if (!json.success) {
        throw new Error(json.error?.message || '获取用户列表失败')
      }

      const parsed = AdminUserListResponseSchema.safeParse(json.data)
      if (!parsed.success) {
        throw new Error('用户列表响应格式不正确')
      }

      return parsed.data
    },
    staleTime: 2 * 60 * 1000, // 2 分钟
  })
}
