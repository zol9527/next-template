'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, UserX, Search, Plus } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { useToast } from '@/components/ui/toast'
import { DataTable } from '@/components/ui/data-table/index'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PaginationConfig } from '@/components/ui/data-table/pagination'

import type {
  AdminUserListItem as User,
  AdminUserListResponse as UsersResponse,
} from '@/contracts/dtos/admin/users.dto'
import { AdminUserListResponseSchema } from '@/contracts/dtos/admin/users.dto'

import { UserStatusPills, type StatusPill } from './user-status-pills'
import { getUserColumns } from './user-table-columns'
import { UserDetailDrawer } from './user-detail-drawer'
import { EditUserDrawer } from './edit-user-drawer'

/**
 * 用户列表 Tab
 *
 * 包含: 搜索框 + 状态药丸 + 筛选 + 表格 + 详情 Drawer + 编辑 Drawer
 *
 * 注意: 标题区域已移至 TabBar（与商城管理 ShopMainCard 结构一致），
 * 此组件只负责内容区域的搜索、筛选和表格
 */

// 角色类型（用于模态框）
type Role = { id: string; name: string; description: string | null }

export function UserListTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // === 筛选状态 ===
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [roleFilter, setRoleFilter] = React.useState<string | undefined>(undefined)

  // === 分页状态 ===
  const [prevCursors, setPrevCursors] = React.useState<string[]>([])
  const [currentCursor, setCurrentCursor] = React.useState<string | null>(null)
  const [pageSize, setPageSize] = React.useState(10)

  // === 选中状态 ===
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)

  const debouncedSearch = useDebounce(search, 500)

  // === 用户列表查询 ===
  const { data, isLoading, error: listError, refetch } = useQuery<UsersResponse>({
    queryKey: ['admin', 'users', { search: debouncedSearch, statusFilter, roleFilter, cursor: currentCursor, pageSize }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: pageSize.toString() })
      if (currentCursor) params.append('cursor', currentCursor)
      if (debouncedSearch) params.append('keyword', debouncedSearch)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (roleFilter) params.append('role', roleFilter)

      const res = await fetch(`/api/v1/admin/users?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData?.error?.message || `请求失败 (${res.status})`)
      }
      const json = await res.json()
      const response = json as { success: boolean; data: unknown; error?: { message: string } }
      if (!response.success) throw new Error(response.error?.message || '请求失败')
      const parsed = AdminUserListResponseSchema.safeParse(response.data)
      if (!parsed.success) throw new Error('响应数据格式不符合预期')
      return parsed.data
    },
  })

  // === Mutations ===
  const toggleStatus = useMutation({
    mutationFn: async ({ userId, currentStatus }: { userId: string; currentStatus: string }) => {
      const action = currentStatus === 'active' ? 'disable' : 'enable'
      const res = await fetch(`/api/v1/admin/users/${userId}/${action}`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData?.error?.message || `操作失败 (${res.status})`)
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast({ title: variables.currentStatus === 'active' ? '账户已禁用' : '账户已启用' })
    },
    onError: (error: unknown) => {
      toast({ title: '操作失败', description: error instanceof Error ? error.message : '未知错误', variant: 'destructive' })
    },
  })

  const revokeSessions = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/v1/admin/users/${userId}/revoke-sessions`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData?.error?.message || '操作失败')
      }
      return res.json()
    },
    onSuccess: () => {
      toast({ title: '会话已撤销', description: '用户已强制下线。' })
    },
    onError: (error: unknown) => {
      toast({ title: '操作失败', description: error instanceof Error ? error.message : '未知错误', variant: 'destructive' })
    },
  })

  const unlockAccount = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/v1/admin/users/${userId}/unlock`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData?.error?.message || '操作失败')
      }
      return res.json()
    },
    onSuccess: () => {
      toast({ title: '账户已解锁' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (error: unknown) => {
      toast({ title: '操作失败', description: error instanceof Error ? error.message : '未知错误', variant: 'destructive' })
    },
  })

  // === 分页逻辑 ===
  const nextCursor = data?.nextCursor ?? null

  const resetPagination = React.useCallback(() => {
    setPrevCursors([])
    setCurrentCursor(null)
  }, [])

  const handleSearchChange = React.useCallback((value: string) => {
    setSearch(value)
    resetPagination()
  }, [resetPagination])

  const handleStatusFilterChange = React.useCallback((value: string) => {
    setStatusFilter(value)
    resetPagination()
  }, [resetPagination])

  const handlePageSizeChange = React.useCallback((value: number) => {
    setPageSize(value)
    resetPagination()
  }, [resetPagination])

  const handleNextPage = React.useCallback(() => {
    if (nextCursor && !isLoading) {
      setPrevCursors((prev) => [...prev, currentCursor ?? ''])
      setCurrentCursor(nextCursor)
    }
  }, [nextCursor, isLoading, currentCursor])

  const handlePrevPage = React.useCallback(() => {
    if (prevCursors.length > 0 && !isLoading) {
      const newPrevCursors = [...prevCursors]
      const prevCursor = newPrevCursors.pop() ?? null
      setPrevCursors(newPrevCursors)
      setCurrentCursor(prevCursor || null)
    }
  }, [prevCursors, isLoading])

  // === 列定义 ===
  const columns = React.useMemo(
    () => getUserColumns({
      onToggleStatus: (userId, currentStatus) => toggleStatus.mutate({ userId, currentStatus }),
      onUnlock: (userId) => unlockAccount.mutate(userId),
      onViewDetails: (user) => {
        setSelectedUser(user)
        setDetailOpen(true)
      },
      onRevokeSessions: (userId) => revokeSessions.mutate(userId),
      onCopyId: (userId) => {
        navigator.clipboard.writeText(userId)
        toast({ title: '已复制到剪贴板' })
      },
      isTogglePending: toggleStatus.isPending,
      isUnlockPending: unlockAccount.isPending,
      pendingUserId: toggleStatus.variables?.userId,
      pendingUnlockUserId: unlockAccount.variables,
    }),
    [toggleStatus, unlockAccount, revokeSessions, toast]
  )

  const pagination = React.useMemo<PaginationConfig>(
    () => ({
      nextCursor,
      prevCursors,
      isLoading,
      onNextPage: handleNextPage,
      onPrevPage: handlePrevPage,
      onPageSizeChange: handlePageSizeChange,
      pageSize,
      totalCount: data?.users?.length ?? 0,
      totalRecords: data?.total ?? 0,
    }),
    [nextCursor, prevCursors, isLoading, handleNextPage, handlePrevPage, handlePageSizeChange, pageSize, data]
  )

  // === 状态药丸数据 ===
  const statusPills: StatusPill[] = React.useMemo(() => [
    { value: 'all', label: '全部', count: data?.total ?? 0 },
    { value: 'active', label: '活跃', count: data?.users?.filter(u => u.status === 'active').length ?? 0, color: '--teal' },
    { value: 'unverified', label: '未验证', count: 0, color: '--gold' },
    { value: 'disabled', label: '禁用', count: data?.users?.filter(u => u.status === 'disabled').length ?? 0, color: '--rose' },
  ], [data])

  return (
    <div className="flex flex-col gap-4">
      {/* 搜索框 + 操作按钮行（参考商城管理内容区布局） */}
      <div className="flex items-center justify-between">
        {/* 左侧：总数统计 */}
        <p className="text-body-sm text-fg-secondary">
          共 <span className="text-tabular font-medium text-fg">{data?.total ?? 0}</span> 位用户
        </p>

        {/* 右侧：搜索框 + 添加按钮 */}
        <div className="flex items-center gap-3">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
            <input
              type="text"
              placeholder="搜索用户..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={cn(
                'w-full h-8 pl-9 pr-3',
                'bg-bg border border-border-default rounded-lg',
                'text-body-sm text-fg placeholder:text-fg-muted',
                'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10',
                'transition-colors duration-150'
              )}
            />
          </div>
          <Button
            className="gap-1.5 shadow-lg shadow-primary/20"
            onClick={() => toast({ title: '功能开发中', description: '添加用户功能正在开发中' })}
          >
            <Plus className="h-4 w-4" />
            添加用户
          </Button>
        </div>
      </div>

      {/* 状态药丸行 */}
      <div className="flex items-center justify-between">
        <UserStatusPills
          pills={statusPills}
          activeValue={statusFilter}
          onChange={handleStatusFilterChange}
        />
        {/* 右侧下拉按钮占位 */}
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default text-body-sm text-fg-muted hover:bg-white/50 transition-colors">
            全部角色 ▾
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default text-body-sm text-fg-muted hover:bg-white/50 transition-colors">
            最近登录 ▾
          </button>
        </div>
      </div>

      {/* 表格区域 */}
      {listError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--rose,#CF2D56)]/10 flex items-center justify-center">
            <UserX className="h-6 w-6 text-[var(--rose,#CF2D56)]" />
          </div>
          <span className="text-sm text-[var(--rose,#CF2D56)] font-medium">加载失败</span>
          <span className="text-xs text-[var(--fg-faint,#9C9A91)]">
            {listError instanceof Error ? listError.message : '请稍后重试'}
          </span>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
            重试
          </Button>
        </div>
      ) : isLoading && !data ? (
        <div className="flex items-center justify-center h-48 text-[var(--fg-muted,#6B6960)]">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          加载中...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data?.users ?? []}
          pagination={pagination}
        />
      )}

      {/* 用户详情 Drawer */}
      <UserDetailDrawer
        user={selectedUser}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setSelectedUser(null)
        }}
        onRevoke={() => selectedUser && revokeSessions.mutate(selectedUser.id)}
        onUnlock={() => selectedUser && unlockAccount.mutate(selectedUser.id)}
        onEdit={() => {
          setDetailOpen(false)
          // 短暂延迟后打开编辑 drawer
          setTimeout(() => setEditOpen(true), 200)
        }}
        isUnlocking={unlockAccount.isPending}
      />

      {/* 编辑用户 Drawer */}
      <EditUserDrawer
        user={selectedUser}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setSelectedUser(null)
        }}
      />
    </div>
  )
}
