'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Filter,
  Shield,
  UserX,
  Loader2,
  Users,
  FileText,
} from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { AdminFilterBar } from '@/components/ui/admin-filter-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DocumentReviewTab } from '@/components/business/admin/user/document-review-tab'
import { AdminTabs, AdminTabsList, AdminTabsTrigger, AdminTabsContent } from '@/components/ui/admin-tabs'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { UserDetailsSheet } from '@/components/business/admin/user/user-details-sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { DataTable } from '@/components/ui/data-table/index'
import { getUserColumns } from '@/components/business/admin/user/admin-user-columns'
import type { PaginationConfig } from '@/components/ui/data-table/pagination'

import type {
  AdminUserListItem as User,
  AdminUserListResponse as UsersResponse,
} from '@/contracts/dtos/admin/users.dto'
import {
  AdminUserListResponseSchema,
} from '@/contracts/dtos/admin/users.dto'

type Role = {
  id: string
  name: string
  description: string | null
}

/**
 * Component: AdminUsersPage
 *
 * Description: 管理员用户列表页面，提供搜索、过滤和用户详情查看功能。
 *
 * Returns:
 *     JSX.Element: 用户列表页面组件
 */
export default function AdminUsersPage() {
  const { toast } = useToast()
  const query_client = useQueryClient()
  const [search, set_search] = React.useState('')
  const [status_filter, set_status_filter] = React.useState('all')

  const [nextCursor, setNextCursor] = React.useState<string | null>(null)
  const [prevCursors, setPrevCursors] = React.useState<string[]>([])
  const [currentCursor, setCurrentCursor] = React.useState<string | null>(null)
  const [pageSize, setPageSize] = React.useState(10)

  const debounced_search = useDebounce(search, 500)

  const [selected_user, set_selected_user] = React.useState<User | null>(null)
  const [is_roles_modal_open, set_is_roles_modal_open] = React.useState(false)
  const [is_details_sheet_open, set_is_details_sheet_open] = React.useState(false)
  const [pending_permission_user_id, set_pending_permission_user_id] = React.useState<string | null>(null)

  const { data, isLoading, error: listError, refetch } = useQuery<UsersResponse>({
    queryKey: ['admin', 'users', { search: debounced_search, statusFilter: status_filter, cursor: currentCursor, pageSize }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
      })
      if (currentCursor) params.append('cursor', currentCursor)
      if (debounced_search) params.append('keyword', debounced_search)
      if (status_filter !== 'all') params.append('status', status_filter)

      const res = await fetch(`/api/v1/admin/users?${params.toString()}`)
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData?.error?.message || `请求失败 (${res.status})`)
      }
      const json = await res.json()
      const response = json as { success: boolean; data: unknown; error?: { message: string } }
      if (!response.success) {
        throw new Error(response.error?.message || '请求失败')
      }
      const parsed = AdminUserListResponseSchema.safeParse(response.data)
      if (!parsed.success) {
        throw new Error('响应数据格式不符合预期')
      }
      return parsed.data
    },
  })

  const toggleStatus = useMutation({
    mutationFn: async ({ userId, currentStatus }: { userId: string; currentStatus: string }) => {
      const action = currentStatus === 'active' ? 'disable' : 'enable'
      const res = await fetch(`/api/v1/admin/users/${userId}/${action}`, { method: 'POST' })

      // 检查响应状态
      if (!res.ok) {
        const errorData = await res.json()
        const errorMessage = errorData?.error?.message || `操作失败 (${res.status})`
        throw new Error(errorMessage)
      }

      return res.json()
    },
    onSuccess: (_, variables) => {
      query_client.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast({
        title: variables.currentStatus === 'active' ? '账户已禁用' : '账户已启用',
        variant: 'default'
      })
    },
    onError: (error: unknown) => {
      toast({
        title: '操作失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive'
      })
    }
  })

  const toggleUploadPermission = useMutation({
    mutationFn: async ({ userId, canUpload }: { userId: string; canUpload: boolean }) => {
      const res = await fetch(`/api/v1/admin/users/${userId}/upload-permission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canUpload }),
      })

      // 检查响应状态
      if (!res.ok) {
        const errorData = await res.json()
        const errorMessage = errorData?.error?.message || `操作失败 (${res.status})`
        throw new Error(errorMessage)
      }

      return res.json()
    },
    onMutate: ({ userId }) => {
      set_pending_permission_user_id(userId)
    },
    onSettled: () => {
      set_pending_permission_user_id(null)
    },
    onSuccess: (_, variables) => {
      query_client.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast({
        title: variables.canUpload ? '已授予上传权限' : '已撤销上传权限',
        variant: 'default'
      })
    },
    onError: (error: unknown) => {
      toast({
        title: '操作失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive'
      })
    }
  })

  const revokeSessions = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/v1/admin/users/${userId}/revoke-sessions`, { method: 'POST' })

      // 检查响应状态
      if (!res.ok) {
        const errorData = await res.json()
        const errorMessage = errorData?.error?.message || `操作失败 (${res.status})`
        throw new Error(errorMessage)
      }

      return res.json()
    },
    onSuccess: () => {
      toast({ title: '会话已撤销', description: '用户已强制下线。', variant: 'default' })
    },
    onError: (error: unknown) => {
      toast({ title: '操作失败', description: error instanceof Error ? error.message : '未知错误', variant: 'destructive' })
    }
  })

  const unlockAccount = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/v1/admin/users/${userId}/unlock`, { method: 'POST' })

      // 检查响应状态
      if (!res.ok) {
        const errorData = await res.json()
        const errorMessage = errorData?.error?.message || `操作失败 (${res.status})`
        throw new Error(errorMessage)
      }

      return res.json()
    },
    onSuccess: () => {
      toast({ title: '账户已解锁', variant: 'default' })
      query_client.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (error: unknown) => {
      toast({ title: '操作失败', description: error instanceof Error ? error.message : '未知错误', variant: 'destructive' })
    }
  })

  React.useEffect(() => {
    if (data?.nextCursor !== undefined) {
      setNextCursor(data.nextCursor)
    }
  }, [data])

  React.useEffect(() => {
    setPrevCursors([])
    setCurrentCursor(null)
  }, [debounced_search, status_filter, pageSize])

  const handleNextPage = React.useCallback(() => {
    if (nextCursor && !isLoading) {
      setPrevCursors((prev) => [...prev, nextCursor])
      setCurrentCursor(nextCursor)
    }
  }, [nextCursor, isLoading])

  const handlePrevPage = React.useCallback(() => {
    if (prevCursors.length > 0 && !isLoading) {
      const newPrevCursors = prevCursors.slice(0, -1)
      const prevCursor = newPrevCursors.length > 0 ? newPrevCursors[newPrevCursors.length - 1] : null
      setPrevCursors(newPrevCursors)
      setCurrentCursor(prevCursor)
    }
  }, [prevCursors, isLoading])

  const copyToClipboard = React.useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: '已复制到剪贴板', variant: 'default' })
  }, [toast])

  const columns = React.useMemo(
    () => getUserColumns({
      onToggleStatus: (userId, currentStatus) => toggleStatus.mutate({ userId, currentStatus }),
      onToggleUploadPermission: (userId, currentPermission) => toggleUploadPermission.mutate({ userId, canUpload: !currentPermission }),
      onUnlock: (userId) => unlockAccount.mutate(userId),
      onViewDetails: (user) => {
        set_selected_user(user)
        set_is_details_sheet_open(true)
      },
      onEditRoles: (user) => {
        set_selected_user(user)
        set_is_roles_modal_open(true)
      },
      onRevokeSessions: (userId) => revokeSessions.mutate(userId),
      onCopyId: (userId) => copyToClipboard(userId),
      isTogglePending: toggleStatus.isPending,
      isTogglePermissionPending: toggleUploadPermission.isPending,
      isUnlockPending: unlockAccount.isPending,
      pendingUserId: toggleStatus.variables?.userId,
      pendingPermissionUserId: pending_permission_user_id ?? undefined,
      pendingUnlockUserId: unlockAccount.variables,
    }),
    [toggleStatus, toggleUploadPermission, unlockAccount, revokeSessions, copyToClipboard, pending_permission_user_id]
  )

  const pagination = React.useMemo<PaginationConfig>(
    () => ({
      nextCursor,
      prevCursors,
      isLoading,
      onNextPage: handleNextPage,
      onPrevPage: handlePrevPage,
      onPageSizeChange: setPageSize,
      pageSize,
      totalCount: data?.users?.length ?? 0,
      totalRecords: data?.total ?? 0,
    }),
    [nextCursor, prevCursors, isLoading, handleNextPage, handlePrevPage, pageSize, data?.users?.length, data?.total]
  )

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <AdminTabs defaultValue="users" className="w-full">
        <AdminTabsList className="w-full max-w-md mb-6 !inline-flex !justify-between">
          <AdminTabsTrigger value="users" className="flex-1 gap-2">
            <Users className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">用户列表</span>
          </AdminTabsTrigger>
          <AdminTabsTrigger value="documents" className="flex-1 gap-2">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">证件审核</span>
          </AdminTabsTrigger>
        </AdminTabsList>
        <AdminTabsContent value="users" className="space-y-6">
          <AdminFilterBar>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
              <Input
                type="text"
                placeholder="搜索用户..."
                value={search}
                onChange={(e) => set_search(e.target.value)}
                className="pl-10 h-10 bg-muted/5 border-none shadow-none"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex bg-muted/5 p-1 border border-border/10">
                {[
                  { value: 'all', label: '全部' },
                  { value: 'active', label: '正常' },
                  { value: 'disabled', label: '已禁用' }
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => set_status_filter(s.value)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      status_filter === s.value ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground/60 hover:text-foreground"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <Button variant="ghost" size="icon" className="bg-muted/10 backdrop-blur-xl border border-border shadow-xl text-foreground">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </AdminFilterBar>

          {listError ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <UserX className="h-6 w-6 text-destructive" />
              </div>
              <span className="text-sm text-destructive font-medium">加载失败</span>
              <span className="text-xs text-muted-foreground/60">
                {listError instanceof Error ? listError.message : '请稍后重试'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="mt-2"
              >
                重试
              </Button>
            </div>
          ) : isLoading && !data ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
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
        </AdminTabsContent>
        <AdminTabsContent value="documents">
          <DocumentReviewTab />
        </AdminTabsContent>
      </AdminTabs>

      <RolesModal
        user={selected_user}
        open={is_roles_modal_open}
        onOpenChange={set_is_roles_modal_open}
      />

      <UserDetailsSheet
        user={selected_user}
        open={is_details_sheet_open}
        onOpenChange={(open) => {
          set_is_details_sheet_open(open)
          if (!open) set_selected_user(null)
        }}
        onRevoke={() => selected_user && revokeSessions.mutate(selected_user.id)}
        onUnlock={() => selected_user && unlockAccount.mutate(selected_user.id)}
        isUnlocking={unlockAccount.isPending}
      />
    </div>
  )
}

/**
 * Component: RolesModal
 *
 * Description: 编辑用户角色权限的模态框，采用精致优雅的设计风格。
 *
 * Parameters:
 *     user(User | null): 被编辑的用户对象
 *     open(boolean): 模态框是否打开
 *     onOpenChange((open: boolean) => void): 模态框打开状态变化回调
 *
 * Returns:
 *     JSX.Element: 角色编辑模态框组件
 */
function RolesModal({ user, open, onOpenChange }: { user: User | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast()
  const query_client = useQueryClient()
  const [selected_role_ids, set_selected_role_ids] = React.useState<string[]>([])

  const { data: all_roles } = useQuery<Role[]>({
    queryKey: ['admin', 'rbac', 'roles'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/rbac/roles')
      if (!res.ok) throw new Error('获取角色失败')
      const result = await res.json()
      return result.data.roles
    },
    enabled: open
  })

  const { data: user_roles_data, isLoading: isLoadingUserRoles } = useQuery<{ roles: Role[] }>({
    queryKey: ['admin', 'users', user?.id, 'roles'],
    queryFn: async () => {
      const res = await fetch(`/api/v1/admin/users/${user?.id}/roles`)
      if (!res.ok) throw new Error('获取用户角色失败')
      const result = await res.json()
      return result.data
    },
    enabled: !!user?.id && open

  })

  React.useEffect(() => {
    if (user_roles_data) {
      set_selected_role_ids(user_roles_data.roles.map((r: Role) => r.id))
    }
  }, [user_roles_data])

  const update_roles = useMutation({
    mutationFn: async (role_ids: string[]) => {
      const res = await fetch(`/api/v1/admin/users/${user?.id}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds: role_ids })
      })

      // 检查响应状态
      if (!res.ok) {
        const errorData = await res.json()
        const errorMessage = errorData?.error?.message || `操作失败 (${res.status})`
        throw new Error(errorMessage)
      }

      return res.json()
    },
    onSuccess: () => {
      toast({ title: '权限已更新', variant: 'default' })
      onOpenChange(false)
      query_client.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (error: unknown) => {
      toast({ title: '更新失败', description: error instanceof Error ? error.message : '未知错误', variant: 'destructive' })
    }
  })

  const toggle_role = (role_id: string) => {
    set_selected_role_ids(prev =>
      prev.includes(role_id) ? prev.filter(id => id !== role_id) : [...prev, role_id]
    )
  }

  const hasChanges = user_roles_data &&
    JSON.stringify(selected_role_ids.sort()) !== JSON.stringify(user_roles_data.roles.map((r: Role) => r.id).sort())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border shadow-2xl w-[min(92vw,42rem)] min-w-80 max-w-none max-h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* 头部区域 */}
        <div className="relative px-8 pt-8 pb-6 border-b border-border/10">
          {/* 背景装饰 */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          <div className="absolute top-4 right-8 w-24 h-24 bg-primary/10 blur-3xl rounded-full pointer-events-none" />

          <DialogHeader className="relative z-10">
            <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">
              编辑角色权限
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/70 text-base mt-2">
              为用户分配安全角色，控制其系统访问权限
            </DialogDescription>
          </DialogHeader>

          {/* 用户信息卡片 */}
          {user && (
            <div className="relative z-10 mt-6 flex items-center gap-4 p-4 bg-muted/30 rounded-2xl border border-border/20">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-foreground font-bold text-sm ring-1 ring-border/10 uppercase shadow-sm">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  user.username?.slice(0, 2) || 'U'
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {user.username || '未设置用户名'}
                </span>
                <span className="text-xs text-muted-foreground/60 mt-0.5">
                  {user.email || user.phone || '暂无联系方式'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 角色列表区域 */}
        <div className="px-8 py-6 flex-1 min-h-0 overflow-y-auto">
          {isLoadingUserRoles ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground/70">加载角色列表...</span>
            </div>
          ) : all_roles && all_roles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {all_roles.map((role, index) => (
                <div
                  key={role.id}
                  className={cn(
                    "relative group p-5 rounded-xl border transition-all duration-300 cursor-default",
                    "flex items-start gap-4 overflow-hidden",
                    selected_role_ids.includes(role.id)
                      ? "bg-primary/10 border-primary/30 shadow-lg shadow-primary/5 hover:shadow-primary/10"
                      : "bg-muted/30 border-border/20 hover:bg-muted/50 hover:border-border/40"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* 选中状态的背景装饰 */}
                  {selected_role_ids.includes(role.id) && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                  )}

                  {/* 复选框 */}
                  <div className="relative z-10 pt-0.5">
                    <label className="relative inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={selected_role_ids.includes(role.id)}
                        onChange={() => toggle_role(role.id)}
                        className="peer sr-only"
                      />
                      <span
                        className={cn(
                          "w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center cursor-pointer",
                          "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
                          "peer-focus-visible:ring-offset-background",
                          selected_role_ids.includes(role.id)
                            ? "bg-primary border-primary"
                            : "border-border/40 group-hover:border-border/60"
                        )}
                      >
                        {selected_role_ids.includes(role.id) && (
                          <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                    </label>
                  </div>

                  {/* 角色信息 */}
                  <div className="relative z-10 flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Shield className={cn(
                        "h-4 w-4 transition-colors duration-200",
                        selected_role_ids.includes(role.id) ? "text-primary" : "text-muted-foreground/50 group-hover:text-muted-foreground/70"
                      )} />
                      <span className={cn(
                        "font-semibold text-sm transition-colors duration-200",
                        selected_role_ids.includes(role.id) ? "text-foreground" : "text-muted-foreground/70 group-hover:text-foreground"
                      )}>
                        {role.description || role.name}
                      </span>
                    </div>
                    {role.description && role.name !== role.description && (
                      <p className="text-xs text-muted-foreground/50 mt-1.5 leading-relaxed line-clamp-2">
                        {role.name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <Shield className="h-12 w-12 text-muted-foreground/20" />
              <span className="text-sm text-muted-foreground/50">
                暂无可用的角色
              </span>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <DialogFooter className="px-8 pb-8 pt-4 border-t border-border/10 gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-11 rounded-xl border-border/20 bg-background hover:bg-muted/30 text-foreground/80 hover:text-foreground font-medium"
          >
            取消
          </Button>
          <Button
            onClick={() => update_roles.mutate(selected_role_ids)}
            disabled={update_roles.isPending || !hasChanges}
            className={cn(
              "flex-1 h-11 rounded-xl font-medium transition-all duration-200",
              hasChanges
                ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:shadow-primary/30"
                : "bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
            )}
          >
            {update_roles.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                保存更改
                {hasChanges && (
                  <span className="ml-2 w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

