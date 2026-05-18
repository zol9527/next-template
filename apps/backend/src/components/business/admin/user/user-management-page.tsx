'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
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
 * Description: 用户管理模块的统一容器组件，参照 ShopMainCard 结构
 *
 * 结构:
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  TabBar: [用户列表 | 角色管理]                          [右侧区域]
 *   │─────────────────────────────────────────────────────────│
 *   │  Content Area (由各 Tab 内容渲染)                         │
 *   │                                                          │
 *   └─────────────────────────────────────────────────────────┘
 *
 * 设计规范（与商城管理一致）:
 *   - 外壳: 白色卡片，border-radius: 16px (rounded-2xl)
 *   - 阴影: shadow-md
 *   - TabBar: 高度 60px，底部 1px border 分割线
 *   - Tab 选中: color #F54E00 (text-primary), font-weight 600, 底部 2px 橙色下划线
 *   - Tab 非选中: color #6B6960 (text-fg-secondary), font-weight 500
 *   - Tab 间距: padding 8px 16px
 *   - Tab 分隔: 1px × 20px 竖线
 *   - Content: padding 24px 28px, flex: 1
 *
 * Returns:
 *   element(React.ReactElement): 用户管理主页面容器
 */
export function UserManagementPage() {
  const [activeTab, setActiveTab] = React.useState<UserTab>('users')

  return (
    <div
      className={cn(
        // 外壳：白色卡片 + 圆角 + 阴影（与 ShopMainCard 一致）
        'bg-surface rounded-2xl shadow-md',
        // flex 布局，让 content 区域撑满
        'flex flex-col',
        // 最小高度保证视觉一致性
        'min-h-0'
      )}
    >
      {/* TabBar 区域 */}
      <div
        className={cn(
          // 高度 60px
          'h-[60px]',
          // 水平布局：左侧 Tabs + 右侧自定义区域
          'flex items-center justify-between',
          // 水平内边距
          'px-7',
          // 底部分割线
          'border-b border-border-default'
        )}
      >
        {/* 左侧 Tab 导航 */}
        <nav className="flex items-center h-full" role="tablist" aria-label="用户管理导航">
          {USER_TABS.map((tab, index) => {
            const isActive = activeTab === tab.value

            return (
              <React.Fragment key={tab.value}>
                {/* Tab 按钮 */}
                <button
                  id={`user-tab-${tab.value}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`user-panel-${tab.value}`}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    // 文字样式：text-nav (DM Sans, 13.5px, 500)
                    'text-nav',
                    // 间距
                    'px-4 py-2',
                    // 相对定位（用于底部下划线指示器）
                    'relative',
                    // 过渡动画
                    'motion-safe:transition-colors motion-safe:duration-150',
                    // 聚焦样式
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    // 悬停效果
                    'hover:text-fg',
                    // 选中/非选中状态
                    isActive
                      ? 'text-primary font-semibold'
                      : 'text-fg-secondary font-medium'
                  )}
                >
                  {tab.label}

                  {/* 选中态底部下划线指示器 */}
                  {isActive && (
                    <span
                      className={cn(
                        // 定位在底部
                        'absolute bottom-0 left-4 right-4',
                        // 2px 高度橙色下划线
                        'h-[2px] bg-primary',
                        // 圆角
                        'rounded-full'
                      )}
                    />
                  )}
                </button>

                {/* Tab 之间的竖线分隔符（最后一个 Tab 后不加） */}
                {index < USER_TABS.length - 1 && (
                  <span
                    className="w-px h-5 bg-border-default mx-1"
                    aria-hidden="true"
                  />
                )}
              </React.Fragment>
            )
          })}
        </nav>

        {/* 右侧区域 — 由各 Tab 内容自行提供时可通过 props 扩展 */}
      </div>

      {/* Content 区域 */}
      <div
        id={`user-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`user-tab-${activeTab}`}
        className={cn(
          // 内容区内边距
          'py-6 px-7',
          // 占满剩余空间
          'flex-1',
          // 允许内容滚动
          'overflow-auto'
        )}
      >
        {activeTab === 'users' && <UserListTab />}
        {activeTab === 'roles' && <RoleListTab />}
      </div>
    </div>
  )
}
