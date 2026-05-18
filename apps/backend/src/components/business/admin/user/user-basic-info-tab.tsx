'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Edit3,
  Ban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AdminUserListItem } from '@/contracts/dtos/admin/users.dto'
import type { SafeAdminUserDetail } from '@/contracts/dtos/admin/user-detail.dto'
import type { RoleDto } from '@/contracts/dtos/rbac/role.dto'

/**
 * 用户详情 — 基本信息 Tab
 *
 * Tab1: 基本信息
 * - 个人资料卡: 头像 + 名字 + UID/注册日期 + 状态（surface-alt 背景卡片）
 * - 信息行列表（左侧 label，右侧 value，无图标）
 * - 底部按钮: 编辑信息 + 禁用/启用
 */

interface UserBasicInfoTabProps {
  user: AdminUserListItem
  onRevoke: () => void
  onUnlock: () => void
  onEdit: () => void
  isUnlocking: boolean
}

// 状态配置
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: '活跃', color: 'var(--teal, #1F8A65)' },
  disabled: { label: '禁用', color: 'var(--rose, #CF2D56)' },
}

export function UserBasicInfoTab({
  user,
  onRevoke,
  onUnlock,
  onEdit,
  isUnlocking,
}: UserBasicInfoTabProps) {
  // 获取用户详情（含 MFA 等完整信息）
  const { data: userDetail } = useQuery<SafeAdminUserDetail>({
    queryKey: ['admin', 'users', user.id, 'detail'],
    queryFn: async () => {
      const res = await fetch(`/api/v1/admin/users/${user.id}`, { credentials: 'include' })
      if (!res.ok) throw new Error('获取用户详情失败')
      const json = await res.json()
      return json.data?.user
    },
    enabled: !!user.id,
    staleTime: 5 * 60 * 1000,
  })

  const displayName = user.nickname || user.username || '未设置'
  const status = STATUS_MAP[user.status ?? ''] ?? { label: user.status ?? '未知', color: 'var(--fg-faint)' }
  const isLocked = !!user.lockedUntil && new Date(user.lockedUntil) > new Date()
  const isActive = user.status === 'active'

  // 获取用户角色（用于显示角色名称）
  const { data: userRoles } = useQuery<{ roles: RoleDto[] }>({
    queryKey: ['admin', 'users', user.id, 'roles'],
    queryFn: async () => {
      const res = await fetch(`/api/v1/admin/users/${user.id}/roles`, { credentials: 'include' })
      if (!res.ok) throw new Error('获取用户角色失败')
      const json = await res.json()
      return json.data
    },
    enabled: !!user.id,
    staleTime: 5 * 60 * 1000,
  })

  // 格式化角色显示
  const rolesDisplay = userRoles?.roles && userRoles.roles.length > 0
    ? userRoles.roles.map(r => r.description || r.name).join('、')
    : null

  return (
    <div className="flex flex-col gap-6">
      {/* 个人资料卡 — surface-alt 背景包裹 */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--surface-alt,#F7F7F4)]">
        {/* 大头像 56px */}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--ds-accent,#F54E00)] to-[var(--gold,#C08532)] flex items-center justify-center text-xl font-semibold text-white shrink-0">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (
            displayName.slice(0, 2).toUpperCase()
          )}
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {/* 名字 — Outfit 字体 */}
          <span
            className="text-[16px] font-semibold text-[var(--fg,#26251E)] truncate"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            {displayName}
          </span>

          {/* 合并 UID + 注册日期 */}
          <span className="text-[12px] text-[var(--fg-muted,#9C9A91)]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            UID: {user.id.slice(0, 8)} · 注册于 {new Date(user.createdAt).toLocaleDateString('zh-CN')}
          </span>

          {/* 状态指示 — 绿点 + 文字 */}
          <div className="flex items-center gap-1.5">
            {isActive ? (
              <>
                <div className="w-[5px] h-[5px] rounded-full bg-[var(--teal,#1F8A65)]" />
                <span className="text-[11.5px] font-medium text-[var(--teal,#1F8A65)]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  活跃
                </span>
              </>
            ) : (
              <>
                <div className="w-[5px] h-[5px] rounded-full bg-[var(--rose,#CF2D56)]" />
                <span className="text-[11.5px] font-medium text-[var(--rose,#CF2D56)]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {status.label}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 信息行列表 — 左 label 右 value，无图标 */}
      <div className="flex flex-col">
        <InfoRow label="邮箱" value={user.email} />
        <InfoRow label="手机号" value={user.phone} />
        <InfoRow label="部门" value="未分配" />
        <InfoRow label="角色" value={rolesDisplay} />
        <InfoRow label="最后登录" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('zh-CN') : '—'} />
        <InfoRow label="登录 IP" value={user.lastDevice || '—'} mono />
        <InfoRow label="两步验证" value={userDetail?.mfaEnabled ? '已开启' : '未开启'} />
        {isLocked && (
          <InfoRow label="锁定至" value={new Date(user.lockedUntil!).toLocaleString('zh-CN')} highlight />
        )}
      </div>

      {/* 底部操作按钮 */}
      <div className="flex items-center gap-2 pt-4 border-t border-[var(--border)]">
        <Button
          onClick={onEdit}
          className="flex-1 h-[34px] rounded-lg bg-[var(--ds-accent,#F54E00)] hover:bg-[var(--ds-accent-hover,#D94400)] text-white font-medium text-sm"
        >
          <Edit3 className="h-[14px] w-[14px] mr-1.5 text-white" />
          编辑信息
        </Button>
        {isActive ? (
          <Button
            variant="outline"
            onClick={onRevoke}
            className="flex-1 h-[34px] rounded-lg border-[var(--rose,#CF2D56)] text-[var(--rose,#CF2D56)] hover:bg-[var(--rose,#CF2D56)]/5 font-medium text-sm"
          >
            <Ban className="h-[14px] w-[14px] mr-1.5 text-[var(--rose,#CF2D56)]" />
            禁用账户
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={onUnlock}
            disabled={isUnlocking}
            className="flex-1 h-[34px] rounded-lg border-[var(--teal,#1F8A65)] text-[var(--teal,#1F8A65)] hover:bg-[var(--teal,#1F8A65)]/5 font-medium text-sm"
          >
            启用账户
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * 信息行组件 — 左侧 label，右侧 value，底部边框
 */
function InfoRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string
  value?: string | null
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-b-solid border-b-[rgba(38,37,30,0.05)]">
      <span className="text-[12px] text-[var(--fg-muted,#9C9A91)]">{label}</span>
      <span
        className={cn(
          'text-[13px] text-[var(--fg,#26251E)] truncate max-w-[60%] text-right',
          highlight && 'text-[var(--gold,#C08532)]',
          mono && 'text-[12px] font-medium text-[var(--fg-secondary,#6B6960)]',
        )}
        style={mono ? { fontFamily: 'JetBrains Mono, monospace' } : undefined}
      >
        {value || '—'}
      </span>
    </div>
  )
}
