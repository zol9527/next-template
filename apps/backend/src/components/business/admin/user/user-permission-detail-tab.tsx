'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Shield, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ScopeEntry } from '@/contracts/dtos/admin/rbac/permissions.dto'

/**
 * 用户详情 — 权限详情 Tab
 *
 * Tab3: 权限详情
 * - 继承横幅: 盾牌图标 + "通过「角色名」角色继承全部权限" + "共 X 项权限 · Y 个模块"
 * - 手风琴模块列表: 图标 + 模块名 + "X/Y" 计数 + 展开箭头
 * - 展开内容: 绿色圆点(已授权) + 中文名 + 英文 code (JetBrains Mono)
 */

interface UserPermissionDetailTabProps {
  userId: string
}

export function UserPermissionDetailTab({ userId }: UserPermissionDetailTabProps) {
  // 获取用户有效权限
  const { data: grants = [], isLoading: isLoadingGrants } = useQuery({
    queryKey: ['admin', 'users', userId, 'effective-permissions'],
    queryFn: async () => {
      if (!userId) return []

      // 获取用户角色
      const rolesRes = await fetch(`/api/v1/admin/users/${userId}/roles`, {
        credentials: 'include',
      })
      if (!rolesRes.ok) return []
      const rolesJson = await rolesRes.json()
      const roles: { id: string; name: string }[] = rolesJson.data?.roles ?? []

      if (roles.length === 0) return []

      // 获取每个角色的权限
      const grantsPromises = roles.map(async (role) => {
        const res = await fetch(`/api/v1/admin/rbac/roles/${role.id}/permissions`, {
          credentials: 'include',
        })
        if (!res.ok) return []
        const json = await res.json()
        return (json.data?.grants ?? []) as { action: string; scope: string }[]
      })
      const allGrants = await Promise.all(grantsPromises)

      // 合并去重
      const map = new Map<string, { action: string; scope: string }>()
      for (const grants of allGrants) {
        for (const g of grants) {
          map.set(`${g.action}:${g.scope}`, g)
        }
      }
      return Array.from(map.values())
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })

  // 获取用户角色名称（用于显示继承来源）
  const { data: userRoles } = useQuery<{
    roles: { id: string; name: string; description?: string | null }[]
  }>({
    queryKey: ['admin', 'users', userId, 'roles'],
    queryFn: async () => {
      const res = await fetch(`/api/v1/admin/users/${userId}/roles`, { credentials: 'include' })
      if (!res.ok) throw new Error('获取用户角色失败')
      const json = await res.json()
      return json.data
    },
    enabled: !!userId,
  })

  // 获取权限 scopes 定义（用于分组和中文描述）
  const { data: scopes = [] } = useQuery<ScopeEntry[]>({
    queryKey: ['admin', 'rbac', 'scopes'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/rbac/permissions', { credentials: 'include' })
      if (!res.ok) throw new Error('获取权限列表失败')
      const json = await res.json()
      return json.data?.scopes ?? []
    },
    staleTime: 10 * 60 * 1000,
  })

  // 按 scope 分组
  const groupedPermissions = React.useMemo(() => {
    const groups = new Map<string, { scope: string; description: string; actions: string[] }>()

    // 初始化所有 scope 组
    for (const scope of scopes) {
      groups.set(scope.scope, {
        scope: scope.scope,
        description: scope.description,
        actions: [],
      })
    }

    // 填充已授权的 actions
    for (const grant of grants) {
      const existing = groups.get(grant.scope)
      if (existing) {
        existing.actions.push(grant.action)
      } else {
        groups.set(grant.scope, {
          scope: grant.scope,
          description: grant.scope,
          actions: [grant.action],
        })
      }
    }

    return Array.from(groups.values()).filter((g) => g.actions.length > 0)
  }, [grants, scopes])

  const roleNames =
    userRoles?.roles?.map((r) => r.description || r.name).join('、') ?? ''
  const totalGrants = grants.length
  const totalModules = groupedPermissions.length

  if (isLoadingGrants) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--fg-faint,#9C9A91)]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 继承横幅 */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-[var(--teal,#1F8A65)]/5 border border-[var(--teal,#1F8A65)]/20">
        <Shield className="h-4 w-4 text-[var(--teal,#1F8A65)] shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--teal,#1F8A65)]">
            {roleNames
              ? `通过「${roleNames}」角色继承全部权限`
              : '暂无角色分配'}
          </span>
          <span className="text-[11px] text-[var(--fg-faint,#9C9A91)]">
            共 {totalGrants} 项权限 · {totalModules} 个模块
          </span>
        </div>
      </div>

      {/* 手风琴模块列表 */}
      <div className="flex flex-col gap-2">
        {groupedPermissions.map((group) => (
          <ScopeAccordion
            key={group.scope}
            scope={group.scope}
            description={group.description}
            actions={group.actions}
            totalActions={scopes.find((s) => s.scope === group.scope)?.actions.length ?? 3}
          />
        ))}
      </div>

      {groupedPermissions.length === 0 && (
        <div className="flex flex-col items-center py-12 gap-2">
          <Shield className="h-8 w-8 text-[var(--fg-faint,#9C9A91)]/30" />
          <span className="text-sm text-[var(--fg-faint,#9C9A91)]">暂无权限</span>
        </div>
      )}
    </div>
  )
}

/**
 * Scope 手风琴组件
 * - 展开标题: 箭头 + 模块名 + "X/Y" 计数
 * - 展开内容: 绿色圆点 + 中文名 + 英文 code (JetBrains Mono)
 */
function ScopeAccordion({
  scope,
  description,
  actions,
  totalActions,
}: {
  scope: string
  description: string
  actions: string[]
  totalActions: number
}) {
  const [expanded, setExpanded] = React.useState(false)

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      {/* 标题行 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface)] transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-[var(--fg-faint,#9C9A91)] shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[var(--fg-faint,#9C9A91)] shrink-0" />
        )}
        <span className="text-sm font-medium text-[var(--fg,#26251E)] flex-1 text-left">
          {description}
        </span>
        <span className="text-xs text-[var(--fg-faint,#9C9A91)]">
          {actions.length}/{totalActions}
        </span>
      </button>

      {/* 展开内容 */}
      {expanded && (
        <div className="px-4 pb-3 flex flex-col gap-1.5">
          {actions.map((action) => (
            <div key={action} className="flex items-center gap-2 py-1">
              <div className="w-[5px] h-[5px] rounded-full bg-[var(--teal,#1F8A65)] shrink-0" />
              <span className="text-xs text-[var(--fg,#26251E)] flex-1">
                {action === 'read' ? '读取' : action === 'write' ? '写入' : '执行'}
              </span>
              <span
                className="text-[11px] text-[var(--fg-faint,#9C9A91)]"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {action}:{scope}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
