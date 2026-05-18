'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { AdminPageHeader } from '@/components/ui/admin-page-header'
import { UserListTab } from './user-list-tab'
import { RoleListTab } from '@/components/business/admin/rbac/role-list-tab'

/**
 * 用户管理 Tab 定义
 *
 * 与商城管理保持一致的 Tab 结构，使用 useState 管理 Tab 切换
 * （用户管理 Tab 数量少且内容较轻量，暂不拆分为独立路由）
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
 *   │  [用户列表 | 角色管理]                                   [搜索/操作区]
 *   │─────────────────────────────────────────────────────────│
 *
 *   CardContent (由 AdminShell 提供):
 *   │  Content Area (由各 Tab 内容渲染)                         │
 *   │                                                          │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Tab 导航通过 AdminPageHeader 的 tabs prop 注入到 CardHeader 中，
 * 消除了页面内部的 60px TabBar，避免双重头部。
 *
 * Returns:
 *   element(React.ReactElement): 用户管理主页面
 */
export function UserManagementPage() {
  const [activeTab, setActiveTab] = React.useState<UserTab>('users')

  return (
    <>
      {/* 通过 context 将 Tab 导航注入到 AdminShell 的 CardHeader */}
      <AdminPageHeader
        title="用户管理"
        description="管理用户账户和角色权限"
        tabs={
          <nav className="flex items-center h-full" role="tablist">
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
    </>
  )
}
