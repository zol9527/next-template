'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { UserListTab } from './user-list-tab'
import { RoleListTab } from '@/components/business/admin/rbac/role-list-tab'

/**
 * 用户管理主页面容器
 *
 * 包含两个 Tab：
 * - 用户列表: 用户表格 + 状态筛选 + 详情/编辑 Drawer
 * - 角色管理: 角色卡片网格 + 编辑角色 Drawer
 */

type TabValue = 'users' | 'roles'

export function UserManagementPage() {
  const [activeTab, setActiveTab] = React.useState<TabValue>('users')

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Tab 切换栏 */}
      <div className="inline-flex h-11 items-center gap-1 rounded-xl bg-[var(--surface)] p-1 border border-[var(--border)]">
        <TabButton
          active={activeTab === 'users'}
          onClick={() => setActiveTab('users')}
        >
          用户列表
        </TabButton>
        <TabButton
          active={activeTab === 'roles'}
          onClick={() => setActiveTab('roles')}
        >
          角色管理
        </TabButton>
      </div>

      {/* Tab 内容 */}
      <div className="mt-2">
        {activeTab === 'users' && <UserListTab />}
        {activeTab === 'roles' && <RoleListTab />}
      </div>
    </div>
  )
}

/**
 * Tab 按钮
 */
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200',
        active
          ? 'bg-[var(--ds-accent,#F54E00)] text-white shadow-sm'
          : 'text-[var(--fg-muted,#6B6960)] hover:text-[var(--fg,#26251E)] hover:bg-white/50'
      )}
    >
      {children}
    </button>
  )
}
