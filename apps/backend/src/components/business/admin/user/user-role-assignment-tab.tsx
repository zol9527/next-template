'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Shield, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import type { RoleDto } from '@/contracts/dtos/rbac/role.dto'

/**
 * 用户详情 — 角色分配 Tab
 *
 * Tab2: 角色分配
 * - 警告横幅: 黄色背景 "角色变更后，用户权限将立即生效"
 * - 角色卡片列表（Checkbox + 角色名 + 描述 + 权限数）
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
      {/* 警告横幅 */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[var(--gold,#C08532)]/10 border border-[var(--gold,#C08532)]/20">
        <AlertTriangle className="h-4 w-4 text-[var(--gold,#C08532)] shrink-0" />
        <span className="text-xs font-medium text-[var(--gold,#C08532)]">
          角色变更后，用户权限将立即生效
        </span>
      </div>

      {/* 角色列表 */}
      <div className="flex flex-col gap-2">
        {allRoles.map((role) => {
          const isSelected = selectedRoleIds.includes(role.id)
          const isAdmin = role.name === 'admin'

          return (
            <button
              key={role.id}
              onClick={() => toggleRole(role.id)}
              className={cn(
                'flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200',
                isSelected
                  ? 'border-[var(--ds-accent,#F54E00)]/40 bg-[var(--ds-accent,#F54E00)]/5'
                  : 'border-[var(--border)] hover:border-[var(--fg-faint,#9C9A91)]/30',
              )}
            >
              {/* Checkbox */}
              <div
                className={cn(
                  'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                  isSelected
                    ? 'bg-[var(--ds-accent,#F54E00)] border-[var(--ds-accent,#F54E00)]'
                    : 'border-[var(--border)]',
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
                      'text-sm font-semibold',
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
            className="flex-1 h-10 rounded-lg text-sm"
          >
            取消
          </Button>
          <Button
            onClick={() => updateRoles.mutate(selectedRoleIds)}
            disabled={updateRoles.isPending}
            className="flex-1 h-10 rounded-lg bg-[var(--ds-accent,#F54E00)] hover:bg-[var(--ds-accent-hover,#D94400)] text-white font-medium text-sm"
          >
            {updateRoles.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            保存角色
          </Button>
        </div>
      )}
    </div>
  )
}
