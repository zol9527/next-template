'use client'

import * as React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import {
  MoreHorizontal,
  Lock,
  Unlock,
  Ban,
  CheckCircle,
  LogOut,
  Copy,
  Eye,
  Loader2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { AdminUserListItem } from '@/contracts/dtos/admin/users.dto'

/**
 * 列定义的回调 Props
 */
export interface UserColumnsProps {
  onToggleStatus?: (userId: string, currentStatus: string) => void
  onToggleUploadPermission?: (userId: string, currentPermission: boolean) => void
  onUnlock?: (userId: string) => void
  onViewDetails?: (user: AdminUserListItem) => void
  onEditRoles?: (user: AdminUserListItem) => void
  onRevokeSessions?: (userId: string) => void
  onCopyId?: (userId: string) => void
  isTogglePending?: boolean
  isTogglePermissionPending?: boolean
  isUnlockPending?: boolean
  pendingUserId?: string
  pendingPermissionUserId?: string
  pendingUnlockUserId?: string
}

/**
 * 状态显示配置
 */
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  active: { label: '活跃', color: 'var(--teal, #1F8A65)', bgColor: 'rgba(31,138,101,0.1)' },
  disabled: { label: '禁用', color: 'var(--rose, #CF2D56)', bgColor: 'rgba(207,45,86,0.1)' },
  unverified: { label: '未验证', color: 'var(--gold, #C08532)', bgColor: 'rgba(192,133,50,0.1)' },
}

/**
 * 获取状态配置
 */
function getStatusConfig(status: string | null) {
  return STATUS_CONFIG[status ?? ''] ?? { label: status ?? '未知', color: 'var(--fg-faint)', bgColor: 'rgba(156,154,145,0.1)' }
}

/**
 * 格式化相对时间
 */
function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  if (days < 7) return `${days} 天前`
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

/**
 * 获取用户显示名称
 */
function getDisplayName(user: AdminUserListItem): string {
  return user.nickname || user.username || '未设置'
}

/**
 * 用户头像组件
 */
function UserAvatar({ user }: { user: AdminUserListItem }) {
  const name = getDisplayName(user)
  const initial = name.slice(0, 2).toUpperCase()

  if (user.avatarUrl) {
    return (
      <div className="w-[30px] h-[30px] rounded-full overflow-hidden shrink-0">
        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
      </div>
    )
  }

  return (
    <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-[var(--ds-accent,#F54E00)]/20 to-[var(--ds-accent,#F54E00)]/10 flex items-center justify-center text-[10px] font-semibold text-[var(--ds-accent,#F54E00)] shrink-0">
      {initial}
    </div>
  )
}

/**
 * 获取用户表格列定义
 */
export function getUserColumns(props: UserColumnsProps = {}): ColumnDef<AdminUserListItem>[] {
  const {
    onToggleStatus,
    onUnlock,
    onViewDetails,
    onRevokeSessions,
    onCopyId,
    isTogglePending,
    isUnlockPending,
    pendingUserId,
    pendingUnlockUserId,
  } = props

  return [
    // Checkbox 列
    {
      id: 'select',
      size: 28,
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },

    // 用户列（头像 + 名字 + 邮箱）
    {
      id: 'user',
      size: 240,
      accessorKey: 'username',
      header: () => <span className="text-xs font-medium text-[var(--fg-muted,#6B6960)]">用户</span>,
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex items-center gap-3">
            <UserAvatar user={user} />
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-medium text-[var(--fg,#26251E)] truncate">
                {getDisplayName(user)}
              </span>
              <span className="text-[11.5px] text-[var(--fg-faint,#9C9A91)] truncate">
                {user.email || user.phone || '—'}
              </span>
            </div>
          </div>
        )
      },
    },

    // 角色列
    {
      id: 'roles',
      size: 180,
      header: () => <span className="text-xs font-medium text-[var(--fg-muted,#6B6960)]">角色</span>,
      cell: () => {
        // 角色数据需要从关联查询获取，这里先显示占位
        return (
          <span className="text-xs text-[var(--fg-faint,#9C9A91)]">—</span>
        )
      },
    },

    // 状态列
    {
      id: 'status',
      size: 100,
      accessorKey: 'status',
      header: () => <span className="text-xs font-medium text-[var(--fg-muted,#6B6960)]">状态</span>,
      cell: ({ row }) => {
        const status = row.original.status
        const config = getStatusConfig(status)
        return (
          <div className="flex items-center gap-2">
            <div
              className="w-[5px] h-[5px] rounded-full shrink-0"
              style={{ backgroundColor: config.color }}
            />
            <span className="text-xs" style={{ color: config.color }}>
              {config.label}
            </span>
          </div>
        )
      },
    },

    // 最后登录列
    {
      id: 'lastLogin',
      size: 140,
      accessorKey: 'lastLoginAt',
      header: () => <span className="text-xs font-medium text-[var(--fg-muted,#6B6960)]">最后登录</span>,
      cell: ({ row }) => (
        <span className="text-xs text-[var(--fg-muted,#6B6960)]">
          {formatRelativeTime(row.original.lastLoginAt)}
        </span>
      ),
    },

    // 登录设备列
    {
      id: 'lastDevice',
      size: 200,
      accessorKey: 'lastDevice',
      header: () => <span className="text-xs font-medium text-[var(--fg-muted,#6B6960)]">登录设备</span>,
      cell: ({ row }) => {
        const device = row.original.lastDevice
        if (!device) {
          return <span className="text-xs text-[var(--fg-faint,#9C9A91)]">—</span>
        }
        return (
          <span className="text-xs text-[var(--fg-muted,#6B6960)]" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
            {device}
          </span>
        )
      },
    },

    // 操作列
    {
      id: 'actions',
      size: 40,
      header: () => null,
      cell: ({ row }) => {
        const user = row.original
        const isActive = user.status === 'active'
        const isLocked = !!user.lockedUntil && new Date(user.lockedUntil) > new Date()
        const isToggling = isTogglePending && pendingUserId === user.id
        const isUnlocking = isUnlockPending && pendingUnlockUserId === user.id

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--surface)] transition-colors">
                <MoreHorizontal className="h-4 w-4 text-[var(--fg-faint,#9C9A91)]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onViewDetails?.(user)}>
                <Eye className="mr-2 h-4 w-4" />
                查看详情
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onToggleStatus?.(user.id, user.status ?? 'active')}
                disabled={isToggling}
              >
                {isToggling ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isActive ? (
                  <Ban className="mr-2 h-4 w-4" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                {isActive ? '禁用账户' : '启用账户'}
              </DropdownMenuItem>

              {isLocked && (
                <DropdownMenuItem
                  onClick={() => onUnlock?.(user.id)}
                  disabled={isUnlocking}
                >
                  {isUnlocking ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Unlock className="mr-2 h-4 w-4" />
                  )}
                  解锁账户
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => onRevokeSessions?.(user.id)}>
                <LogOut className="mr-2 h-4 w-4" />
                撤销会话
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => onCopyId?.(user.id)}>
                <Copy className="mr-2 h-4 w-4" />
                复制 ID
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
