'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Info, Shield, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import type { RoleDto } from '@/contracts/dtos/rbac/role.dto'

/**
 * 用户详情 — 角色分配 Tab
 *
 * Tab2: 角色分配
 * - 提示横幅: "角色变更后，用户权限将立即生效"（Info 图标）
 * - 角色卡片列表（Checkbox + 角色名 + 描述 + 权限计数）
 * - 保存/取消按钮
 */

interface UserRoleAssignmentTabProps {
  userId: string
}

export function UserRoleAssignmentTab({ userId }: UserRoleAssignmentTabProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedRoleIds, setSelectedRoleIds] = React.useState<string[]>([])
  const [initialRoleIds, setInitialRoleIds] = React.useState<string[]>([])

  // 获取所有角色
  const { data: allRoles = [], isLoading: isLoadingRoles } = useQuery<RoleDto[]>({
    queryKey: ['admin', 'rbac', 'roles'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/rbac/roles', { credentials: 'include' })
      if (!res.ok) throw new Error('获取角色失败')
      const json = await res.json()
      return json.data?.roles ?? []
    },
  })

  // 获取用户当前角色
  const { data: userRoles, isLoading: isLoadingUserRoles } = useQuery<{ roles: RoleDto[] }>({
    queryKey: ['admin', 'users', userId, 'roles'],
    queryFn: async () => {
      const res = await fetch(`/api/v1/admin/users/${userId}/roles`, { credentials: 'include' })
      if (!res.ok) throw new Error('获取用户角色失败')
      const json = await res.json()
      return json.data
    },
    enabled: !!userId,
  })

  // 初始化选中角色
  React.useEffect(() => {
    if (userRoles?.roles) {
      const ids = userRoles.roles.map((r) => r.id)
      setSelectedRoleIds(ids)
      setInitialRoleIds(ids)
    }
  }, [userRoles])

  // 更新用户角色 mutation
  const updateRoles = useMutation({
    mutationFn: async (roleIds: string[]) => {
      const res = await fetch(`/api/v1/admin/users/${userId}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roleIds }),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: { message: '请求失败' } }))
        throw new Error(error.error?.message || '更新角色失败')
      }
      return res.json()
    },
    onSuccess: () => {
      toast({ title: '角色已更新' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', userId, 'roles'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      // 更新初始值
      setInitialRoleIds([...selectedRoleIds])
    },
    onError: (error: unknown) => {
      toast({
        title: '更新失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      })
    },
  })

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    )
  }

  const hasChanges =
    JSON.stringify([...selectedRoleIds].sort()) !== JSON.stringify([...initialRoleIds].sort())

  if (isLoadingRoles || isLoadingUserRoles) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--fg-faint,#9C9A91)]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 提示横幅 — Info 图标，更精致的样式 */}
      <div className="flex items-center gap-2 py-2.5 px-3 rounded-lg bg-[var(--gold-subtle,rgba(192,133,50,0.1))] border border-[rgba(192,133,50,0.2)]">
        <Info className="h-[14px] w-[14px] text-[var(--gold,#C08532)] shrink-0" />
        <span className="text-[11.5px] font-medium text-[var(--gold,#C08532)]">
          角色变更后，用户权限将立即生效
        </span>
      </div>

      {/* 角色列表 */}
      <div className="flex flex-col gap-2">
        {allRoles.map((role) => {
          const isSelected = selectedRoleIds.includes(role.id)
          const isAdmin = role.name === 'admin'

          // 权限计数（暂用 role 上的 permissions 字段，若无则显示占位）
          const permCount = (role as Record<string, unknown>).permissionsCount as number | undefined
          const permTotal = (role as Record<string, unknown>).permissionsTotal as number | undefined

          return (
            <button
              key={role.id}
              onClick={() => toggleRole(role.id)}
              className={cn(
                'flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-200',
                isSelected
                  ? 'border-2 border-[var(--ds-accent,#F54E00)] bg-[rgba(245,78,0,0.03)]'
                  : 'border-[rgba(38,37,30,0.08)] hover:border-[rgba(38,37,30,0.15)]',
              )}
            >
              {/* Checkbox */}
              <div
                className={cn(
                  'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                  isSelected
                    ? 'bg-[var(--ds-accent,#F54E00)] border-[var(--ds-accent,#F54E00)]'
                    : 'border-[rgba(38,37,30,0.25)]',
                )}
              >
                {isSelected && (
                  <svg
                    className="w-3 h-3 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>

              {/* 角色信息 */}
              <div className="flex flex-col flex-1 min-w-0 gap-1">
                <div className="flex items-center gap-2">
                  <Shield
                    className={cn(
                      'h-4 w-4',
                      isSelected
                        ? 'text-[var(--ds-accent,#F54E00)]'
                        : 'text-[var(--fg-faint,#9C9A91)]',
                    )}
                  />
                  <span
                    className={cn(
                      'text-sm font-semibold flex-1',
                      isSelected ? 'text-[var(--fg,#26251E)]' : 'text-[var(--fg-muted,#6B6960)]',
                    )}
                  >
                    {role.description || role.name}
                  </span>
                  {isAdmin && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--rose,#CF2D56)]/10 text-[var(--rose,#CF2D56)]">
                      高危
                    </span>
                  )}
                  {/* 权限计数 */}
                  {(permCount != null && permTotal != null) && (
                    <span
                      className="text-[11px] text-[var(--fg-muted,#9C9A91)]"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {permCount}/{permTotal}
                    </span>
                  )}
                </div>
                {role.description && role.name !== role.description && (
                  <span className="text-xs text-[var(--fg-faint,#9C9A91)]">{role.name}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* 底部操作 */}
      {hasChanges && (
        <div className="flex items-center gap-3 pt-4 border-t border-[var(--border)]">
          <Button
            variant="outline"
            onClick={() => setSelectedRoleIds([...initialRoleIds])}
            className="flex-1 h-9 rounded-lg text-sm"
          >
            取消
          </Button>
          <Button
            onClick={() => updateRoles.mutate(selectedRoleIds)}
            disabled={updateRoles.isPending}
            className="flex-1 h-9 rounded-lg bg-[var(--ds-accent,#F54E00)] hover:bg-[var(--ds-accent-hover,#D94400)] text-white font-medium text-sm"
          >
            {updateRoles.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            保存角色
          </Button>
        </div>
      )}
    </div>
  )
}
