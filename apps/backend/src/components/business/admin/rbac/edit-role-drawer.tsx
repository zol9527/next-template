'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X,
  Edit3,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  Loader2,
  Check,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { ScopeEntry } from '@/contracts/dtos/admin/rbac/permissions.dto'

/**
 * 编辑角色 Drawer
 *
 * 520px 宽，包含：
 * - 角色信息编辑（名称、描述）
 * - 权限配置（手风琴模块列表 + Checkbox）
 * - 保存/取消/删除操作
 */

interface EditRoleDrawerProps {
  roleId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Grant 类型
interface GrantItem {
  action: 'read' | 'write' | 'execute'
  scope: string
}

export function EditRoleDrawer({ roleId, open, onOpenChange }: EditRoleDrawerProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // 表单状态
  const [roleName, setRoleName] = React.useState('')
  const [roleDescription, setRoleDescription] = React.useState('')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [grants, setGrants] = React.useState<GrantItem[]>([])
  const [initialGrants, setInitialGrants] = React.useState<GrantItem[]>([])
  const [isSaving, setIsSaving] = React.useState(false)

  // 获取角色详情
  const { data: roleDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['admin', 'rbac', 'roles', roleId, 'detail'],
    queryFn: async () => {
      if (!roleId) return null
      const res = await fetch(`/api/v1/admin/rbac/roles/${roleId}`, { credentials: 'include' })
      if (!res.ok) throw new Error('获取角色详情失败')
      const json = await res.json()
      return json.data?.role
    },
    enabled: !!roleId && open,
    staleTime: 5 * 60 * 1000,
  })

  // 获取权限 scopes
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

  // 初始化表单
  React.useEffect(() => {
    if (roleDetail && open) {
      setRoleName(roleDetail.name || '')
      setRoleDescription(roleDetail.description || '')
      const g = (roleDetail.grants ?? []).map((grant: GrantItem) => ({
        action: grant.action,
        scope: grant.scope,
      }))
      setGrants(g)
      setInitialGrants(g)
    }
  }, [roleDetail, open])

  // 权限操作
  const toggleGrant = (action: string, scope: string) => {
    const key = `${action}:${scope}`
    setGrants((prev) => {
      const exists = prev.some((g) => `${g.action}:${g.scope}` === key)
      if (exists) {
        return prev.filter((g) => `${g.action}:${g.scope}` !== key)
      }
      return [...prev, { action: action as 'read' | 'write' | 'execute', scope }]
    })
  }

  const isGrantEnabled = (action: string, scope: string) => {
    return grants.some((g) => g.action === action && g.scope === scope)
  }

  // 保存
  const handleSave = async () => {
    if (!roleId) return

    setIsSaving(true)
    try {
      // 1. 更新角色信息
      const infoRes = await fetch(`/api/v1/admin/rbac/roles/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: roleName,
          description: roleDescription,
        }),
      })

      if (!infoRes.ok) {
        const error = await infoRes.json().catch(() => ({ error: { message: '保存失败' } }))
        throw new Error(error.error?.message || '保存角色信息失败')
      }

      // 2. 更新权限
      const grantsRes = await fetch(`/api/v1/admin/rbac/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ grants }),
      })

      if (!grantsRes.ok) {
        const error = await grantsRes.json().catch(() => ({ error: { message: '保存失败' } }))
        throw new Error(error.error?.message || '保存权限失败')
      }

      toast({ title: '角色已更新' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'rbac', 'roles'] })
      setInitialGrants([...grants])
      onOpenChange(false)
    } catch (error) {
      toast({
        title: '保存失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // 删除
  const handleDelete = async () => {
    if (!roleId) return

    try {
      const res = await fetch(`/api/v1/admin/rbac/roles/${roleId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: { message: '删除失败' } }))
        throw new Error(error.error?.message || '删除角色失败')
      }

      toast({ title: '角色已删除' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'rbac', 'roles'] })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: '删除失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      })
    }
  }

  // 搜索过滤
  const filteredScopes = React.useMemo(() => {
    if (!searchQuery.trim()) return scopes
    const q = searchQuery.toLowerCase()
    return scopes.filter(
      (s) =>
        s.scope.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    )
  }, [scopes, searchQuery])

  // 权限计数
  const totalActions = scopes.reduce((sum, s) => sum + s.actions.length, 0)
  const enabledCount = grants.length

  const hasChanges =
    roleName !== (roleDetail?.name ?? '') ||
    roleDescription !== (roleDetail?.description ?? '') ||
    JSON.stringify(grants.sort()) !== JSON.stringify(initialGrants.sort())

  if (!roleId) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[520px] max-w-[90vw] p-0 flex flex-col" style={{ borderRadius: '16px 0 0 16px' }}>
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-[var(--ds-accent,#F54E00)]" />
            <SheetTitle className="text-base font-semibold text-[var(--fg,#26251E)]">
              编辑角色
            </SheetTitle>
          </div>
          <div className="flex items-center gap-2">
            {roleDetail?.name !== 'admin' && (
              <button
                onClick={handleDelete}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--rose,#CF2D56)]/10 transition-colors"
              >
                <Trash2 className="h-4 w-4 text-[var(--rose,#CF2D56)]" />
              </button>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface)] transition-colors"
            >
              <X className="h-4 w-4 text-[var(--fg-faint,#9C9A91)]" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <ScrollArea className="flex-1">
          <div className="p-6 flex flex-col gap-6">
            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--fg-faint,#9C9A91)]" />
              </div>
            ) : (
              <>
                {/* 角色信息 */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-[var(--fg,#26251E)]">角色信息</h3>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--fg-muted,#6B6960)]">角色名称</label>
                    <Input
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      className="h-9 rounded-lg text-sm"
                      disabled={roleDetail?.name === 'admin'}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--fg-muted,#6B6960)]">描述</label>
                    <Textarea
                      value={roleDescription}
                      onChange={(e) => setRoleDescription(e.target.value)}
                      className="rounded-lg text-sm min-h-[80px]"
                      placeholder="角色描述..."
                    />
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[var(--fg-muted,#6B6960)]">
                    <span>已分配用户: {roleDetail?.userCount ?? 0} 人</span>
                  </div>
                </div>

                {/* 权限配置 */}
                <div className="flex flex-col gap-4 pt-4 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[var(--fg,#26251E)]">权限配置</h3>
                    <span className="text-xs font-medium text-[var(--teal,#1F8A65)]">
                      {enabledCount}/{totalActions} 已启用
                    </span>
                  </div>

                  {/* 搜索框 */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-faint,#9C9A91)]" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜索权限..."
                      className="pl-9 h-9 rounded-lg text-sm"
                    />
                  </div>

                  {/* 手风琴模块列表 */}
                  <div className="flex flex-col gap-2">
                    {filteredScopes.map((scope) => (
                      <ScopePermissionAccordion
                        key={scope.scope}
                        scope={scope}
                        enabledActions={grants
                          .filter((g) => g.scope === scope.scope)
                          .map((g) => g.action)}
                        onToggle={(action) => toggleGrant(action, scope.scope)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* 底部操作 */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-[var(--border)]">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-10 rounded-lg text-sm"
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className={cn(
              'flex-1 h-10 rounded-lg font-medium text-sm',
              hasChanges
                ? 'bg-[var(--ds-accent,#F54E00)] hover:bg-[var(--ds-accent-hover,#D94400)] text-white'
                : 'bg-[var(--surface)] text-[var(--fg-faint,#9C9A91)] cursor-not-allowed'
            )}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            保存角色
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/**
 * Scope 权限手风琴组件
 */
function ScopePermissionAccordion({
  scope,
  enabledActions,
  onToggle,
}: {
  scope: ScopeEntry
  enabledActions: string[]
  onToggle: (action: string) => void
}) {
  const [expanded, setExpanded] = React.useState(false)
  const enabledCount = enabledActions.length
  const totalCount = scope.actions.length

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
          {scope.description}
        </span>
        <span className="text-xs text-[var(--fg-faint,#9C9A91)]">
          {enabledCount}/{totalCount}
        </span>
      </button>

      {/* 展开内容 */}
      {expanded && (
        <div className="px-4 pb-3 flex flex-col gap-2">
          {scope.actions.map((action) => {
            const isEnabled = enabledActions.includes(action)
            return (
              <label
                key={action}
                className="flex items-center gap-3 py-1.5 cursor-pointer"
              >
                {/* Checkbox */}
                <button
                  onClick={() => onToggle(action)}
                  className={cn(
                    'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                    isEnabled
                      ? 'bg-[var(--teal,#1F8A65)] border-[var(--teal,#1F8A65)]'
                      : 'border-[var(--border)] hover:border-[var(--fg-faint,#9C9A91)]'
                  )}
                >
                  {isEnabled && <Check className="w-3 h-3 text-white" />}
                </button>

                <span className="text-xs text-[var(--fg,#26251E)] flex-1">
                  {action === 'read' ? '读取' : action === 'write' ? '写入' : '执行'}
                </span>

                <span
                  className="text-[11px] text-[var(--fg-faint,#9C9A91)]"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {action}:{scope.scope}
                </span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
