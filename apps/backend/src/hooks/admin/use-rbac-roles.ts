/**
 * File: use-rbac-roles.ts
 * Description: RBAC 角色列表查询 Hook，使用 TanStack Query 进行状态管理
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { RoleDto } from '@/contracts/dtos/rbac/role.dto'
import type { GrantDto } from '@/contracts/dtos/rbac/access.dto'
import type { ApiResponse } from '@/contracts/api-response.schema'
import { AdminRbacRolesResponseSchema } from '@/contracts/dtos/admin/rbac/roles.dto'

type QueryClientLike = Pick<import('@tanstack/react-query').QueryClient, 'invalidateQueries'>

/**
 * Function: useRbacRoles
 *
 * Description: 获取角色列表的 Hook
 *
 * Returns:
 * 	result(object): TanStack Query 返回值
 * 		data(RoleDto[], optional): 角色列表数据
 * 		isLoading(boolean): 是否正在加载
 * 		isError(boolean): 是否发生错误
 * 		error(Error, optional): 错误对象
 */
export function useRbacRoles() {
  return useQuery<RoleDto[]>({
    queryKey: ['admin', 'rbac', 'roles'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/rbac/roles', {
        credentials: 'include',
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: { message: '请求失败' } }))
        throw new Error(error.error?.message || '获取角色列表失败')
      }

      const json = (await res.json()) as ApiResponse<{ roles: RoleDto[] }>

      if (!json.success) {
        throw new Error(json.error?.message || '获取角色列表失败')
      }

      const parsed = AdminRbacRolesResponseSchema.safeParse(json.data)
      if (!parsed.success) {
        throw new Error('角色列表响应格式不正确')
      }

      return parsed.data.roles
    },
    staleTime: 5 * 60 * 1000, // 5 分钟内数据视为新鲜
  })
}

/**
 * Function: useDeleteRbacRole
 *
 * Description: 删除角色的 Mutation Hook
 *
 * Returns:
 * 	mutation(object): TanStack Mutation 返回值
 * 		mutate(function): 触发变异的函数
 * 		isPending(boolean): 是否正在执行
 * 		isError(boolean): 是否发生错误
 * 		error(Error, optional): 错误对象
 */
export function useDeleteRbacRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (roleId: string) => {
      const res = await fetch(`/api/v1/admin/rbac/roles/${roleId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: { message: '请求失败' } }))
        throw new Error(error.error?.message || '删除角色失败')
      }

      const json = (await res.json()) as ApiResponse<unknown>

      if (!json.success) {
        throw new Error(json.error?.message || '删除角色失败')
      }

      return true
    },
    onSuccess: () => {
      // 使角色列表缓存失效
      queryClient.invalidateQueries({
        queryKey: ['admin', 'rbac', 'roles'],
      })
    },
  })
}

/**
 * Function: useCreateRbacRole
 *
 * Description: 创建角色的 Mutation Hook
 *
 * Returns:
 * 	mutation(object): TanStack Mutation 返回值
 * 		mutate(function): 触发变异的函数，接受 { name, description } 对象
 * 		isPending(boolean): 是否正在执行
 * 		isError(boolean): 是否发生错误
 * 		error(Error, optional): 错误对象
 */
export function useCreateRbacRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const res = await fetch('/api/v1/admin/rbac/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, description }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: { message: '请求失败' } }))
        throw new Error(error.error?.message || '创建角色失败')
      }

      const json = (await res.json()) as ApiResponse<RoleDto>

      if (!json.success) {
        throw new Error(json.error?.message || '创建角色失败')
      }

      return json.data
    },
    onSuccess: () => {
      // 使角色列表缓存失效
      queryClient.invalidateQueries({
        queryKey: ['admin', 'rbac', 'roles'],
      })
    },
  })
}

/**
 * Function: invalidateRbacRoleGrantsQueries
 *
 * Description: 使角色 grants 缓存失效
 */
export async function invalidateRbacRoleGrantsQueries(queryClient: QueryClientLike, roleId: string) {
  await queryClient.invalidateQueries({
    queryKey: ['admin', 'rbac', 'roles', roleId, 'grants'],
  })
  await queryClient.invalidateQueries({
    queryKey: ['auth', 'me'],
  })
}

/**
 * Function: useRbacRoleGrants
 *
 * Description: 获取指定角色 Grant 列表的 Hook
 *
 * Parameters:
 * 	roleId(string | null): 角色 ID
 *
 * Returns:
 * 	result(object): TanStack Query 返回值
 * 		data(GrantDto[], optional): Grant 列表
 */
export function useRbacRoleGrants(roleId: string | null) {
  return useQuery<GrantDto[]>({
    queryKey: ['admin', 'rbac', 'roles', roleId, 'grants'],
    queryFn: async () => {
      if (!roleId) return []

      const res = await fetch(`/api/v1/admin/rbac/roles/${roleId}/permissions`, {
        credentials: 'include',
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: { message: '请求失败' } }))
        throw new Error(error.error?.message || '获取角色权限失败')
      }

      const json = (await res.json()) as ApiResponse<{ roleId: string; grants?: GrantDto[] }>

      if (!json.success) {
        throw new Error(json.error?.message || '获取角色权限失败')
      }

      return json.data.grants ?? []
    },
    enabled: !!roleId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Function: useUpdateRbacRoleGrants
 *
 * Description: 更新角色 Grant 的 Mutation Hook（覆盖模式）
 *
 * Returns:
 * 	mutation(object): TanStack Mutation 返回值
 */
export function useUpdateRbacRoleGrants() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roleId, grants }: { roleId: string; grants: GrantDto[] }) => {
      const res = await fetch(`/api/v1/admin/rbac/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ grants }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: { message: '请求失败' } }))
        throw new Error(error.error?.message || '更新角色权限失败')
      }

      const json = (await res.json()) as ApiResponse<{ roleId: string; grants?: GrantDto[] }>

      if (!json.success) {
        throw new Error(json.error?.message || '更新角色权限失败')
      }

      return json.data
    },
    onSuccess: async (_, variables) => {
      await invalidateRbacRoleGrantsQueries(queryClient, variables.roleId)
    },
  })
}

/**
 * Function: invalidateRbacRolesCache
 *
 * Description: 使角色缓存失效
 *
 * Parameters:
 * 	queryClient(QueryClient): TanStack Query 客户端实例
 *
 * Returns:
 * 	void
 */
export function invalidateRbacRolesCache(queryClient: import('@tanstack/react-query').QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['admin', 'rbac', 'roles'] })
}
