'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Shield,
  UserX,
  UserCheck,
  LockOpen,
  MoreHorizontal,
  Info,
  Copy,
  LogOut,
  Loader2,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AdminUserListItem } from '@/contracts/dtos/admin/users.dto'

interface UserColumnsProps {
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

function isLockedUser(lockedUntil: string | null): boolean {
  if (!lockedUntil) {
    return false
  }

  return new Date(lockedUntil).getTime() > Date.now()
}

/**
Function: getUserStatusBadge

Description: 根据用户状态返回对应的状态指示器

Parameters:
    status(string): 用户状态

Returns:
    element(React.ReactElement): 状态指示器组件
*/
function getUserStatusBadge(status: string | null) {
  const statusLabels: Record<string, string> = {
    active: '正常',
    disabled: '已禁用',
  }
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          status === 'active' ? "bg-success shadow-success/50" : "bg-destructive shadow-destructive/50"
        )}
      />
      <span
        className={cn(
          "text-xs font-medium",
          status === 'active' ? "text-success" : "text-destructive"
        )}
      >
        {statusLabels[status || ''] || status || '未知'}
      </span>
    </div>
  )
}

/**
Function: getUserColumns

Description: 生成用户列表表格列定义

Parameters:
    onToggleStatus(function): 切换用户状态的回调
    onToggleUploadPermission(function): 切换用户上传权限的回调
    onViewDetails(function): 查看用户详情的回调
    onEditRoles(function): 编辑用户角色的回调
    onRevokeSessions(function): 撤销用户会话的回调
    onCopyId(function): 复制用户 ID 的回调
    isTogglePending(boolean): 是否正在处理状态切换
    isTogglePermissionPending(boolean): 是否正在处理权限切换
    pendingUserId(string): 正在处理状态切换的用户 ID
    pendingPermissionUserId(string): 正在处理权限切换的用户 ID

Returns:
    columns(ColumnDef<AdminUserListItem>[]): TanStack Table 列定义
*/
export function getUserColumns({
  onToggleStatus,
  onToggleUploadPermission,
  onUnlock,
  onViewDetails,
  onEditRoles,
  onRevokeSessions,
  onCopyId,
  isTogglePending,
  isTogglePermissionPending,
  isUnlockPending,
  pendingUserId,
  pendingPermissionUserId,
  pendingUnlockUserId,
}: UserColumnsProps = {}): ColumnDef<AdminUserListItem>[] {
  const columns: ColumnDef<AdminUserListItem>[] = []

  columns.push({
    accessorKey: 'username',
    header: () => '用户',
    cell: ({ row }) => (
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-foreground font-bold text-xs ring-1 ring-border/10 uppercase">
          {row.original.avatarUrl ? (
            <img src={row.original.avatarUrl} alt="" className="w-full h-full object-cover rounded-xl" />
          ) : (
            row.original.username?.slice(0, 2) || 'U'
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground transition-all">
            {row.original.username || '未设置用户名'}
          </span>
          <span className="text-xs text-muted-foreground/60">
            {row.original.email || row.original.phone || '暂无联系方式'}
          </span>
        </div>
      </div>
    ),
  })

  columns.push({
    accessorKey: 'userType',
    header: () => '类型',
    cell: ({ row }) => (
      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-muted/20 text-muted-foreground border border-border/10">
        {row.original.userType || '普通会员'}
      </span>
    ),
  })

  columns.push({
    accessorKey: 'canUpload',
    header: () => (
      <div className="flex items-center gap-2">
        <Upload className="h-4 w-4 text-muted-foreground/60" />
        <span>上传权限</span>
      </div>
    ),
    cell: ({ row }) => (
      <Switch
        checked={row.original.canUpload ?? false}
        disabled={isTogglePermissionPending && pendingPermissionUserId === row.original.id}
        onCheckedChange={() => onToggleUploadPermission?.(row.original.id, row.original.canUpload ?? false)}
        className={cn(
          "transition-all",
          row.original.canUpload ? "bg-primary" : "bg-muted"
        )}
      />
    ),
  })

  columns.push({
    accessorKey: 'status',
    header: () => '状态',
    cell: ({ row }) => getUserStatusBadge(row.original.status),
  })

  columns.push({
    accessorKey: 'createdAt',
    header: () => '加入时间',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground/60">
        {new Date(row.original.createdAt).toLocaleDateString()}
      </span>
    ),
  })

  columns.push({
    id: 'actions',
    header: () => <div className="text-right">操作</div>,
    cell: ({ row }) => {
      const isLocked = isLockedUser(row.original.lockedUntil)

      return (
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          title="权限"
          onClick={() => onEditRoles?.(row.original)}
          className="h-8 w-8 rounded-lg text-muted-foreground/60 hover:text-foreground"
        >
          <Shield className="h-4 w-4" />
        </Button>

        {isLocked && onUnlock ? (
          <Button
            variant="ghost"
            size="icon"
            title="解锁账户"
            disabled={isUnlockPending && pendingUnlockUserId === row.original.id}
            onClick={() => onUnlock(row.original.id)}
            className="h-8 w-8 rounded-lg text-warning hover:text-warning/80 hover:bg-warning/10"
          >
            {isUnlockPending && pendingUnlockUserId === row.original.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LockOpen className="h-4 w-4" />
            )}
          </Button>
        ) : null}

        <Button
          variant="ghost"
          size="icon"
          title={row.original.status === 'active' ? '禁用' : '启用'}
          disabled={isTogglePending && pendingUserId === row.original.id}
          onClick={() => onToggleStatus?.(row.original.id, row.original.status || 'active')}
          className={cn(
            "h-8 w-8 rounded-lg transition-all",
            row.original.status === 'active'
              ? "text-destructive/60 hover:text-destructive hover:bg-destructive/10"
              : "text-success/60 hover:text-success hover:bg-success/10"
          )}
        >
          {isTogglePending && pendingUserId === row.original.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : row.original.status === 'active' ? (
            <UserX className="h-4 w-4" />
          ) : (
            <UserCheck className="h-4 w-4" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground/60 hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="right"
            className="w-48 z-50"
          >
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                onViewDetails?.(row.original)
              }}
            >
              <Info className="h-3.5 w-3.5 mr-2" />
              查看详情
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                onCopyId?.(row.original.id)
              }}
            >
              <Copy className="h-3.5 w-3.5 mr-2" />
              复制 ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive hover:text-destructive/80 focus:text-destructive focus:bg-destructive/10"
              onSelect={(e) => {
                e.preventDefault()
                onRevokeSessions?.(row.original.id)
              }}
            >
              <LogOut className="h-3.5 w-3.5 mr-2" />
              强制注销
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
    },
  })

  return columns
}
