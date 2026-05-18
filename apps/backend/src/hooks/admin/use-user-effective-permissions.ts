/**
 * File: use-user-effective-permissions.ts
 * Description: 用户有效权限聚合 Hook — 基于用户角色和角色权限在前端计算
 */

import { useQuery } from '@tanstack/react-query'
import type { GrantDto } from '@/contracts/dtos/rbac/access.dto'

/**
 * 计算用户的有效权限（聚合所有角色的权限）
 *
 * 需要先获取用户角色列表，再获取每个角色的权限，
 * 最终合并去重得到用户的有效权限集合。
 */
export function useUserEffectivePermissions(userId: string | null) {
  return useQuery<GrantDto[]>({
    queryKey: ['admin', 'users', userId, 'effective-permissions'],
    queryFn: async () => {
      if (!userId) return []

      // 1. 获取用户的角色列表
      const rolesRes = await fetch(`/api/v1/admin/users/${userId}/roles`, {
        credentials: 'include',
      })

      if (!rolesRes.ok) {
        throw new Error('获取用户角色失败')
      }

      const rolesJson = await rolesRes.json()
      const roles: { id: string; name: string }[] = rolesJson.data?.roles ?? []

      if (roles.length === 0) return []

      // 2. 获取每个角色的权限
      const grantsPromises = roles.map(async (role) => {
        const grantsRes = await fetch(`/api/v1/admin/rbac/roles/${role.id}/permissions`, {
          credentials: 'include',
        })

        if (!grantsRes.ok) return []

        const grantsJson = await grantsRes.json()
        return (grantsJson.data?.grants ?? []) as GrantDto[]
      })

      const allGrants = await Promise.all(grantsPromises)

      // 3. 合并去重
      const grantMap = new Map<string, GrantDto>()
      for (const grants of allGrants) {
        for (const grant of grants) {
          const key = `${grant.action}:${grant.scope}`
          grantMap.set(key, grant)
        }
      }

      return Array.from(grantMap.values())
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}
