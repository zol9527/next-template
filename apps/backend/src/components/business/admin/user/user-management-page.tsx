'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Search, SlidersHorizontal, UserPlus, ShieldPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { AdminPageHeader } from '@/components/ui/admin-page-header'
import { UserListTab } from './user-list-tab'
import { RoleListTab } from '@/components/business/admin/rbac/role-list-tab'
import { EditRoleDrawer, NEW_ROLE_ID } from '@/components/business/admin/rbac/edit-role-drawer'

/**
 * 用户管理 Tab 定义
 *
 * Tab 数量少且内容较轻量，使用 useState 管理 Tab 切换
 * Tab 导航通过 filterBar 渲染在 CardHeader 第二行
 */
const USER_TABS = [
  { value: 'users', label: '用户列表' },
  { value: 'roles', label: '角色管理' },
] as const

type UserTab = (typeof USER_TABS)[number]['value']

/**
 * Function: UserManagementPage
 *
 * Description: 用户管理模块的统一容器组件
 *
 * 结构:
 *   AdminShell CardHeader (由 AdminPageHeader 注入):
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  用户管理 / 管理所有用户账户、角色分配与权限控制   [操作区] │
 *   ├─────────────────────────────────────────────────────────┤
 *   │  [用户列表 | 角色管理]  ← filterBar                      │
 *   │─────────────────────────────────────────────────────────│
 *
 *   CardContent (由 AdminShell 提供):
 *   │  Content Area (由各 Tab 内容渲染)                         │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Header 第一行: title + description + actions（搜索/筛选/添加用户/添加角色）
 * Header 第二行: Tab 导航（通过 filterBar 注入）
 *
 * Returns:
 *   element(React.ReactElement): 用户管理主页面
 */
export function UserManagementPage() {
  const [activeTab, setActiveTab] = React.useState<UserTab>('users')
  const { toast } = useToast()

  // === 创建角色 Drawer 状态 ===
  const [createRoleOpen, setCreateRoleOpen] = React.useState(false)

  /** 添加用户（暂为占位） */
  const handleAddUser = React.useCallback(() => {
    toast({ title: '功能开发中', description: '添加用户功能正在开发中' })
  }, [toast])

  /** 添加角色 → 打开创建角色 Drawer */
  const handleAddRole = React.useCallback(() => {
    setCreateRoleOpen(true)
  }, [])

  return (
    <>
      {/* 通过 context 注入 CardHeader: 第一行 title+description+actions, 第二行 filterBar(tabs) */}
      <AdminPageHeader
        title="用户管理"
        description="管理所有用户账户、角色分配与权限控制"
        actions={
          <div className="flex items-center gap-3">
            {/* 搜索框（视觉占位，后续接入搜索功能） */}
            <div className="flex items-center h-9 min-w-[200px] rounded-full px-3.5 gap-2 bg-bg border border-border-default">
              <Search className="size-4 shrink-0 text-fg-muted" strokeWidth={2} />
              <span className="font-body text-[13px] text-fg-muted">搜索用户...</span>
              <kbd className="ml-auto rounded-sm py-px px-1.25 bg-surface border border-border-default font-mono text-[11px] text-fg-muted">
                ⌘K
              </kbd>
            </div>
            {/* 筛选按钮 */}
            <button
              className="flex items-center justify-center size-[34px] rounded-lg hover:bg-bg transition-colors duration-150"
              aria-label="筛选用户"
            >
              <SlidersHorizontal className="size-4 text-fg-secondary" strokeWidth={2} />
            </button>
            {/* 添加用户按钮 */}
            <Button size="sm" className="gap-2" onClick={handleAddUser}>
              <UserPlus className="size-4" strokeWidth={2} />
              添加用户
            </Button>
            {/* 添加角色按钮 → 打开创建角色 Drawer */}
            <Button size="sm" variant="outline" className="gap-2" onClick={handleAddRole}>
              <ShieldPlus className="size-4" strokeWidth={2} />
              添加角色
            </Button>
          </div>
        }
        filterBar={
          /* Tab 导航: 渲染在 CardHeader 第二行 (filterBar 位置) */
          <nav className="flex items-center h-full px-7" role="tablist" aria-label="用户管理导航">
            {USER_TABS.map((tab, index) => {
              const isActive = activeTab === tab.value
              return (
                <React.Fragment key={tab.value}>
                  <button
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.value)}
                    className={cn(
                      'text-nav px-4 py-2 relative',
                      'motion-safe:transition-colors motion-safe:duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                      'hover:text-fg',
                      isActive ? 'text-primary font-semibold' : 'text-fg-secondary font-medium'
                    )}
                  >
                    {tab.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-primary rounded-full" />
                    )}
                  </button>
                  {index < USER_TABS.length - 1 && (
                    <span className="w-px h-5 bg-border-default mx-1" aria-hidden="true" />
                  )}
                </React.Fragment>
              )
            })}
          </nav>
        }
      />

      {/* Tab 内容面板 */}
      <div className="flex flex-col flex-1 min-h-0">
        {activeTab === 'users' && <UserListTab />}
        {activeTab === 'roles' && <RoleListTab />}
      </div>

      {/* 创建角色 Drawer */}
      <EditRoleDrawer
        roleId={createRoleOpen ? NEW_ROLE_ID : null}
        open={createRoleOpen}
        onOpenChange={setCreateRoleOpen}
      />
    </>
  )
}
