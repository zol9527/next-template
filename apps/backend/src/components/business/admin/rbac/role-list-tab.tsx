'use client'

import * as React from 'react'
import { Loader2, Plus, Shield } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { RoleCard } from './role-card'
import { EditRoleDrawer } from './edit-role-drawer'
import type { RoleDto } from '@/contracts/dtos/rbac/role.dto'

/**
 * 角色管理 Tab
 *
 * 2×3 卡片网格 + 编辑角色 Drawer
 */
export function RoleListTab() {
  const { toast } = useToast()
  const [selectedRoleId, setSelectedRoleId] = React.useState<string | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)

  // 获取角色列表
  const { data: roles = [], isLoading } = useQuery<RoleDto[]>({
    queryKey: ['admin', 'rbac', 'roles'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/rbac/roles', { credentials: 'include' })
      if (!res.ok) throw new Error('获取角色列表失败')
      const json = await res.json()
      return json.data?.roles ?? []
    },
    staleTime: 5 * 60 * 1000,
  })

  // 获取每个角色的权限数和用户数
  const [roleStats, setRoleStats] = React.useState<
    Record<string, { grantCount: number; userCount: number }>
  >({})

  React.useEffect(() => {
    if (roles.length === 0) return

    const fetchStats = async () => {
      const stats: Record<string, { grantCount: number; userCount: number }> = {}

      await Promise.all(
        roles.map(async (role) => {
          try {
            // 并行获取权限列表和角色详情（含用户数）
            const [grantsRes, detailRes] = await Promise.all([
              fetch(`/api/v1/admin/rbac/roles/${role.id}/permissions`, {
                credentials: 'include',
              }),
              fetch(`/api/v1/admin/rbac/roles/${role.id}`, {
                credentials: 'include',
              }),
            ])

            let grantCount = 0
            let userCount = 0

            if (grantsRes.ok) {
              const grantsJson = await grantsRes.json()
              grantCount = grantsJson.data?.grants?.length ?? 0
            }

            if (detailRes.ok) {
              const detailJson = await detailRes.json()
              userCount = detailJson.data?.role?.userCount ?? 0
            }

            stats[role.id] = { grantCount, userCount }
          } catch {
            stats[role.id] = { grantCount: 0, userCount: 0 }
          }
        }),
      )

      setRoleStats(stats)
    }

    fetchStats()
  }, [roles])

  const handleRoleClick = (roleId: string) => {
    setSelectedRoleId(roleId)
    setEditOpen(true)
  }

  const handleCreateRole = () => {
    toast({ title: '功能开发中', description: '创建角色功能正在开发中' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--fg-muted,#6B6960)]">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        加载中...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            角色管理
          </h2>
          <p className="text-sm text-[var(--fg-muted,#6B6960)]">
            {roles.length} 个角色
          </p>
        </div>
        <Button
          onClick={handleCreateRole}
          className="h-9 rounded-lg bg-[var(--ds-accent,#F54E00)] hover:bg-[var(--ds-accent-hover,#D94400)] text-white font-medium text-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          创建角色
        </Button>
      </div>

      {/* 卡片网格: 2 列(移动端) / 3 列(大屏) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <RoleCard
            key={role.id}
            id={role.id}
            name={role.name}
            description={role.description}
            grantCount={roleStats[role.id]?.grantCount ?? 0}
            userCount={roleStats[role.id]?.userCount ?? 0}
            isAdmin={role.name === 'admin'}
            onClick={() => handleRoleClick(role.id)}
          />
        ))}
      </div>

      {roles.length === 0 && (
        <div className="flex flex-col items-center py-12 gap-3">
          <Shield className="h-12 w-12 text-[var(--fg-faint,#9C9A91)]/30" />
          <span className="text-sm text-[var(--fg-faint,#9C9A91)]">暂无角色</span>
        </div>
      )}

      {/* 编辑角色 Drawer — 由下一个任务创建 */}
      <EditRoleDrawer
        roleId={selectedRoleId}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setSelectedRoleId(null)
        }}
      />
    </div>
  )
}
