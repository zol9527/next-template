'use client'

import * as React from 'react'
import { AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Trash2, Plus, X, Search, Shield, Loader2, AlertCircle, CheckCircle, Layers, Users, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

// Hooks
import {
  useRbacRoles,
  useDeleteRbacRole,
  useCreateRbacRole,
  useRbacRoleGrants,
  useUpdateRbacRoleGrants,
} from '@/hooks/admin/use-rbac-roles'

// Access config
import { SCOPE_TREE } from '@/config/access/scope-tree'
import { flattenScopeTree } from '@/lib/auth/access-utils'
import { BUILT_IN_ROLES } from '@/config/access/built-in-roles'
import type { Action, Scope, Grant } from '@/config/access'

// Skeleton
import { AdminRbacSkeleton } from './admin-rbac-skeleton'

// Badge
import { RoleBadge, getRoleBadgeVariant } from '@/components/ui/role-badge'

// KPI Card
import { KpiCard } from '@/components/business/admin/kpi-card'

type ScopeNode = {
  readonly description: string
  readonly children?: Record<string, ScopeNode>
}

const ACTIONS: Action[] = ['read', 'write', 'execute']

const ACTION_LABELS: Record<Action, string> = {
  read: '读取',
  write: '写入',
  execute: '执行',
}

function buildScopeGroups() {
  const groups: Array<{
    key: string
    label: string
    scopes: Array<{ scope: string; description: string }>
  }> = []

  for (const [topKey, node] of Object.entries(SCOPE_TREE)) {
    const typedNode = node as ScopeNode
    const groupScopes: Array<{ scope: string; description: string }> = []

    groupScopes.push({ scope: topKey, description: typedNode.description })

    if (typedNode.children) {
      for (const [childKey, childNode] of Object.entries(typedNode.children)) {
        const typedChild = childNode as ScopeNode
        groupScopes.push({ scope: `${topKey}.${childKey}`, description: typedChild.description })
      }
    }

    groups.push({
      key: topKey,
      label: typedNode.description,
      scopes: groupScopes,
    })
  }

  return groups
}

/**
 * Function: AdminRbacManager
 *
 * Description: 后台权限管理组件：采用左右分割布局，左侧管理角色，右侧以 scope × action Grant 矩阵编辑权限。
 *
 * Returns:
 * 	element(React.ReactElement): 权限管理组件
 */
export function AdminRbacManager() {
  const { toast } = useToast()

  // 状态管理
  const [activeRoleId, setActiveRoleId] = React.useState<string | null>(null)
  const [roleSearch, setRoleSearch] = React.useState('')
  const [newRoleName, setNewRoleName] = React.useState('')
  const [newRoleDescription, setNewRoleDescription] = React.useState('')
  const [isAddingRole, setIsAddingRole] = React.useState(false)
  const [checkedGrants, setCheckedGrants] = React.useState<Set<string>>(new Set())
  const [hasChanges, setHasChanges] = React.useState(false)
  const [scopeSearch, setScopeSearch] = React.useState('')

  // 数据查询
  const { data: roles = [], isLoading: isLoadingRoles } = useRbacRoles()
  const { data: currentGrants = [], isLoading: isLoadingRoleGrants } = useRbacRoleGrants(activeRoleId)

  // 同步当前角色 grants 到本地状态
  React.useEffect(() => {
    if (currentGrants.length > 0 || (activeRoleId && !isLoadingRoleGrants)) {
      setCheckedGrants(new Set(currentGrants.map((g) => `${g.action}:${g.scope}`)))
      setHasChanges(false)
    }
  }, [currentGrants, activeRoleId, isLoadingRoleGrants])

  // 自动选择第一个角色
  React.useEffect(() => {
    if (roles.length > 0 && !activeRoleId) {
      setActiveRoleId(roles[0].id)
    }
  }, [roles, activeRoleId])

  // Mutations
  const updateGrantsMutation = useUpdateRbacRoleGrants()
  const deleteRoleMutation = useDeleteRbacRole()
  const createRoleMutation = useCreateRbacRole()

  // 加载状态
  const isLoading = isLoadingRoles

  // 搜索过滤
  const filteredRoles = React.useMemo(
    () => roles.filter((r) => r.name.toLowerCase().includes(roleSearch.toLowerCase())),
    [roles, roleSearch]
  )

  // Admin 角色检查
  const activeRole = roles.find((r) => r.id === activeRoleId)
  const isAdminRole = activeRole?.name === 'admin' && BUILT_IN_ROLES.admin.fixedGrants

  // scope 矩阵数据
  const scopeGroups = React.useMemo(() => ({
    groups: buildScopeGroups(),
    allScopes: flattenScopeTree(),
  }), [])

  // 搜索过滤后的 scope 分组
  const filteredScopeGroups = React.useMemo(() => {
    if (!scopeSearch.trim()) return scopeGroups.groups

    const keyword = scopeSearch.toLowerCase().trim()
    return scopeGroups.groups
      .map((group) => ({
        ...group,
        scopes: group.scopes.filter(
          ({ scope, description }) =>
            scope.toLowerCase().includes(keyword) ||
            description.toLowerCase().includes(keyword) ||
            group.label.toLowerCase().includes(keyword)
        ),
      }))
      .filter((group) => group.scopes.length > 0)
  }, [scopeGroups.groups, scopeSearch])

  // Toggle grant
  const toggleGrant = React.useCallback(
    (action: Action, scope: Scope, checked: boolean | 'indeterminate') => {
      if (isAdminRole) return
      const next = new Set(checkedGrants)
      if (checked) {
        next.add(`${action}:${scope}`)
      } else {
        next.delete(`${action}:${scope}`)
      }
      setCheckedGrants(next)
      setHasChanges(true)
    },
    [checkedGrants, isAdminRole]
  )

  // 保存权限设置
  const handleSavePermissions = React.useCallback(async () => {
    if (!activeRoleId) return

    try {
      const grants: Grant[] = Array.from(checkedGrants).map((key) => {
        const colonIdx = key.indexOf(':')
        const action = key.slice(0, colonIdx) as Action
        const scope = key.slice(colonIdx + 1) as Scope
        return { action, scope }
      })

      await updateGrantsMutation.mutateAsync({ roleId: activeRoleId, grants })
      toast({ title: '保存成功', description: '权限已更新', variant: 'default' })
      setHasChanges(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败'
      toast({ title: '保存失败', description: message, variant: 'destructive' })
    }
  }, [activeRoleId, checkedGrants, updateGrantsMutation, toast])

  // 添加新角色
  const handleAddRole = React.useCallback(async () => {
    const name = newRoleName.trim()
    const description = newRoleDescription.trim()

    if (!name) {
      toast({ title: '参数错误', description: '英文名称不能为空', variant: 'destructive' })
      return
    }

    if (!description) {
      toast({ title: '参数错误', description: '中文描述不能为空', variant: 'destructive' })
      return
    }

    try {
      await createRoleMutation.mutateAsync({ name, description })
      toast({ title: '创建成功', description: `角色 "${description}" 已创建`, variant: 'default' })
      setNewRoleName('')
      setNewRoleDescription('')
      setIsAddingRole(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建失败'
      toast({ title: '创建失败', description: message, variant: 'destructive' })
    }
  }, [newRoleName, newRoleDescription, createRoleMutation, toast])

  // 删除角色
  const handleDeleteRole = React.useCallback(
    async (roleId: string, roleName: string) => {
      if (roleName === 'admin') {
        toast({ title: '操作禁止', description: '无法删除管理员角色', variant: 'destructive' })
        return
      }

      if (!confirm(`确定要删除角色 "${roleName}" 吗？此操作不可撤销。`)) return

      try {
        await deleteRoleMutation.mutateAsync(roleId)
        toast({ title: '删除成功', description: '角色已移除', variant: 'default' })
        if (activeRoleId === roleId) {
          setActiveRoleId(roles.find((r) => r.id !== roleId)?.id ?? null)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '删除失败'
        toast({ title: '删除失败', description: message, variant: 'destructive' })
      }
    },
    [deleteRoleMutation, activeRoleId, roles, toast]
  )

  // 放弃更改
  const handleDiscardChanges = React.useCallback(() => {
    setCheckedGrants(new Set(currentGrants.map((g) => `${g.action}:${g.scope}`)))
    setHasChanges(false)
    toast({ title: '已放弃', description: '未保存的更改已丢弃', variant: 'default' })
  }, [currentGrants, toast])

  // 统计
  const totalScopes = scopeGroups.allScopes.size
  const enabledGrants = checkedGrants.size

  // 骨架屏加载
  if (isLoading) {
    return <AdminRbacSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* KPI 指标卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="总角色数"
          value={roles.length}
          icon={Users}
          variant="primary"
        />
        <KpiCard
          title="权限范围"
          value={totalScopes}
          icon={Layers}
          variant="default"
        />
        <KpiCard
          title="已启用授权"
          value={enabledGrants}
          icon={CheckCircle}
          variant="success"
          description={`共 ${totalScopes * ACTIONS.length} 项`}
        />
        <KpiCard
          title="待保存更改"
          value={hasChanges ? "是" : "否"}
          icon={AlertCircle}
          variant={hasChanges ? "warning" : "default"}
        />
      </div>

      {/* 主内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 左侧角色列表 */}
        <Card className="lg:col-span-4 border border-border/20 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              角色列表
            </CardTitle>
            <Button
              size="sm"
              variant={isAddingRole ? 'destructive' : 'outline'}
              onClick={() => setIsAddingRole(!isAddingRole)}
              className="transition-all duration-300"
            >
              {isAddingRole ? (
                <>
                  <X className="h-4 w-4 mr-1" />
                  取消
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  新增
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 新增角色输入框 */}
            <AnimatePresence>
              {isAddingRole && (
                <div className="overflow-hidden animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-3 p-4 bg-muted/30 border border-border/20 rounded-xl mb-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground/70">
                        英文名称 <span className="text-destructive">*</span>
                      </label>
                      <Input
                        placeholder="例如: moderator"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        className="bg-background border-border/40 focus-visible:ring-primary/50 focus-visible:border-primary"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground/70">
                        中文描述 <span className="text-destructive">*</span>
                      </label>
                      <Input
                        placeholder="例如: 版主"
                        value={newRoleDescription}
                        onChange={(e) => setNewRoleDescription(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
                        className="bg-background border-border/40 focus-visible:ring-primary/50 focus-visible:border-primary"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={handleAddRole}
                        disabled={createRoleMutation.isPending || !newRoleName.trim() || !newRoleDescription.trim()}
                        className="flex-1 shadow-md"
                      >
                        {createRoleMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            创建中...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            创建角色
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </AnimatePresence>

            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
              <Input
                placeholder="搜索角色..."
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                className="pl-9 bg-muted/30 border-border/20 focus-visible:ring-primary/50 focus-visible:border-primary"
              />
            </div>

            {/* 角色列表 */}
            <div className="space-y-1 max-h-125 overflow-y-auto px-1 py-1 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {filteredRoles.map((role) => {
                  const isActive = activeRoleId === role.id
                  const badgeVariant = getRoleBadgeVariant(role.name)

                  return (
                    <div
                      key={role.id}
                      className="animate-in fade-in slide-in-from-left-2 duration-200"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        className={cn(
                          'w-full text-left px-3 py-3 rounded-lg transition-all duration-200 group flex items-center justify-between relative h-auto cursor-pointer',
                          isActive
                            ? 'bg-primary/5 text-foreground border border-primary/60 shadow-sm hover:bg-primary/10'
                            : 'hover:bg-muted/40 text-foreground/80 hover:text-foreground border border-transparent hover:border-border/20'
                        )}
                        onClick={() => setActiveRoleId(role.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setActiveRoleId(role.id)
                          }
                        }}
                        aria-pressed={isActive}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-sm bg-gradient-to-b from-primary via-primary to-primary/70" />
                        )}
                        <div className="flex items-center min-w-0 relative z-10 pl-2">
                          <span className="font-semibold mr-2 truncate">{role.description || role.name}</span>
                          <RoleBadge variant={badgeVariant} />
                        </div>

                        {role.name !== 'admin' && (
                          <span
                            className="opacity-0 group-hover:opacity-100 transition-all duration-200"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteRole(role.id, role.name)
                            }}
                          >
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-foreground/40 hover:text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/40"
                              disabled={deleteRoleMutation.isPending}
                            >
                              {deleteRoleMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </AnimatePresence>

              {filteredRoles.length === 0 && (
                <div className="text-center py-12 text-foreground/30">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无匹配角色</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 右侧权限配置 — Grant 矩阵 */}
        <Card className="lg:col-span-8 border border-border/20 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-xl font-bold">权限配置</CardTitle>
              <p className="text-xs text-foreground/60 mt-1 flex items-center gap-2">
                正在编辑：
                <span className="text-primary font-bold">
                  {activeRole?.description || activeRole?.name || '-'}
                </span>
                {isAdminRole && (
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-foreground/50">
                    固定权限
                  </span>
                )}
                {hasChanges && (
                  <span className="text-warning text-[10px] bg-warning/10 px-2 py-0.5 rounded-full">
                    未保存
                  </span>
                )}
              </p>
            </div>
            <Button
              onClick={handleSavePermissions}
              disabled={!hasChanges || !activeRoleId || updateGrantsMutation.isPending || isAdminRole}
              className="shadow-lg shadow-primary/30 transition-all duration-300"
            >
              {updateGrantsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  保存更改
                </>
              )}
            </Button>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto custom-scrollbar max-h-150">
            {isLoadingRoleGrants ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !activeRoleId ? (
              <div className="flex flex-col items-center justify-center h-48 text-foreground/30">
                <Shield className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm">请选择一个角色开始配置权限</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 批量操作栏 */}
                <AnimatePresence>
                  {hasChanges && (
                    <div className="sticky top-0 z-10 bg-warning/15 border border-warning/40 shadow-sm px-4 py-3 rounded-xl animate-in slide-in-from-top duration-200 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-warning" />
                          <span className="text-sm font-semibold text-warning">
                            权限变更待保存
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleDiscardChanges}
                            className="border-warning/40 bg-background/80 hover:bg-warning/20 hover:border-warning/60 font-medium"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            放弃更改
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSavePermissions}
                            disabled={updateGrantsMutation.isPending}
                            className="bg-warning hover:bg-warning/90 text-white font-medium shadow-sm"
                          >
                            {updateGrantsMutation.isPending ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                保存中...
                              </>
                            ) : (
                              <>
                                <Shield className="h-3 w-3 mr-1" />
                                保存更改
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Grant 矩阵搜索 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                  <Input
                    placeholder="搜索权限范围（scope 名称或描述）..."
                    value={scopeSearch}
                    onChange={(e) => setScopeSearch(e.target.value)}
                    className="pl-9 bg-muted/30 border-border/20 focus-visible:ring-primary/50 focus-visible:border-primary"
                  />
                  {scopeSearch && (
                    <button
                      onClick={() => setScopeSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Grant 矩阵表头 */}
                <div className="grid grid-cols-[1fr_repeat(3,60px)] gap-2 px-4 py-2 bg-muted/20 rounded-t-lg border border-border/10">
                  <div className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">
                    范围 (Scope)
                  </div>
                  {ACTIONS.map((action) => (
                    <div key={action} className="text-xs font-semibold text-foreground/50 text-center uppercase tracking-wider">
                      {ACTION_LABELS[action]}
                    </div>
                  ))}
                </div>

                {/* 按 SCOPE_TREE 分组渲染矩阵 */}
                <div className="border border-border/10 rounded-b-lg divide-y divide-border/10 overflow-hidden">
                  {filteredScopeGroups.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-foreground/30">
                      <Search className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">未找到匹配的权限范围</p>
                      <p className="text-xs mt-1">尝试其他关键词</p>
                    </div>
                  )}
                  {filteredScopeGroups.map((group) => (
                    <div key={group.key}>
                      {/* 分组标题 */}
                      <div className="px-4 py-2 bg-muted/30 border-b border-border/10">
                        <span className="text-xs font-bold text-foreground/60 uppercase tracking-wider">
                          {group.label}
                        </span>
                      </div>

                      {/* 该分组下的每个 scope */}
                      {group.scopes.map(({ scope, description }) => (
                        <div
                          key={scope}
                          className="grid grid-cols-[1fr_repeat(3,60px)] gap-2 px-4 py-2.5 hover:bg-muted/20 transition-colors items-center"
                        >
                          {/* Scope 名称和描述 */}
                          <div className="min-w-0">
                            <div className="text-xs font-mono font-semibold text-foreground/80 truncate">
                              {scope}
                            </div>
                            <div className="text-[10px] text-foreground/40 truncate">
                              {description}
                            </div>
                          </div>

                          {/* 三个 action checkbox */}
                          {ACTIONS.map((action) => {
                            const grantKey = `${action}:${scope}`
                            const isChecked = checkedGrants.has(grantKey)

                            return (
                              <div key={grantKey} className="flex justify-center">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) => toggleGrant(action, scope as Scope, checked)}
                                  disabled={isAdminRole}
                                  aria-label={`${action} ${scope}`}
                                />
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
