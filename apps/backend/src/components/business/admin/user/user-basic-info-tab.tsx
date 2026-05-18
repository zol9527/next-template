'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Mail,
  Phone,
  Calendar,
  Shield,
  MapPin,
  Clock,
  Monitor,
  Lock,
  Edit3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AdminUserListItem } from '@/contracts/dtos/admin/users.dto'
import type { SafeAdminUserDetail } from '@/contracts/dtos/admin/user-detail.dto'

/**
 * 用户详情 — 基本信息 Tab
 *
 * Tab1: 基本信息
 * - 个人资料卡: 大头像 + 名字 + UID + 注册时间 + 状态
 * - 信息行列表
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

  return (
    <div className="flex flex-col gap-6">
      {/* 个人资料卡 */}
      <div className="flex flex-col items-center gap-3 py-4">
        {/* 大头像 */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--ds-accent,#F54E00)]/20 to-[var(--ds-accent,#F54E00)]/10 flex items-center justify-center text-lg font-semibold text-[var(--ds-accent,#F54E00)]">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (
            displayName.slice(0, 2).toUpperCase()
          )}
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-base font-semibold text-[var(--fg,#26251E)]">{displayName}</span>
          <span className="text-xs text-[var(--fg-faint,#9C9A91)]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {user.id.slice(0, 8)}...
          </span>
          <span className="text-xs text-[var(--fg-faint,#9C9A91)]">
            注册于 {new Date(user.createdAt).toLocaleDateString('zh-CN')}
          </span>
        </div>

        {/* 状态指示 */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
          <span className="text-xs font-medium" style={{ color: status.color }}>{status.label}</span>
        </div>
      </div>

      {/* 信息行列表 */}
      <div className="flex flex-col gap-3">
        <InfoRow icon={Mail} label="邮箱" value={user.email} />
        <InfoRow icon={Phone} label="手机号" value={user.phone} />
        <InfoRow icon={Shield} label="两步验证" value={userDetail?.mfaEnabled ? '已开启' : '未开启'} />
        <InfoRow icon={Clock} label="最后登录" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('zh-CN') : '—'} />
        <InfoRow icon={Monitor} label="登录设备" value={user.lastDevice || '—'} mono />
        <InfoRow icon={Calendar} label="注册时间" value={new Date(user.createdAt).toLocaleString('zh-CN')} />
        {isLocked && (
          <InfoRow icon={Lock} label="锁定至" value={new Date(user.lockedUntil!).toLocaleString('zh-CN')} highlight />
        )}
      </div>

      {/* 底部操作按钮 */}
      <div className="flex items-center gap-3 pt-4 border-t border-[var(--border)]">
        <Button
          onClick={onEdit}
          className="flex-1 h-10 rounded-lg bg-[var(--ds-accent,#F54E00)] hover:bg-[var(--ds-accent-hover,#D94400)] text-white font-medium text-sm"
        >
          <Edit3 className="h-4 w-4 mr-1.5" />
          编辑信息
        </Button>
        {isActive ? (
          <Button
            variant="outline"
            onClick={onRevoke}
            className="flex-1 h-10 rounded-lg border-[var(--rose,#CF2D56)] text-[var(--rose,#CF2D56)] hover:bg-[var(--rose,#CF2D56)]/5 font-medium text-sm"
          >
            禁用账户
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={onUnlock}
            disabled={isUnlocking}
            className="flex-1 h-10 rounded-lg border-[var(--teal,#1F8A65)] text-[var(--teal,#1F8A65)] hover:bg-[var(--teal,#1F8A65)]/5 font-medium text-sm"
          >
            启用账户
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * 信息行组件
 */
function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: string | null
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="h-4 w-4 text-[var(--fg-faint,#9C9A91)] shrink-0" />
      <span className="text-xs text-[var(--fg-muted,#6B6960)] w-20 shrink-0">{label}</span>
      <span
        className={cn(
          'text-sm text-[var(--fg,#26251E)] flex-1 truncate',
          highlight && 'text-[var(--gold,#C08532)]',
          mono && 'font-mono text-xs'
        )}
      >
        {value || '—'}
      </span>
    </div>
  )
}
