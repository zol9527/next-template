'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import type { SettingsTab } from './settings-page'

interface SettingsTabBarProps {
  activeTab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
}

/** 系统配置 Tab 定义 */
const TABS: { value: SettingsTab; label: string }[] = [
  { value: 'site-config', label: '站点配置' },
  { value: 'agreement', label: '协议管理' },
  { value: 'feature-flags', label: '功能开关' },
  { value: 'ai-settings', label: 'AI设置' },
  { value: 'data-management', label: '数据管理' },
  { value: 'logs', label: '日志管理' },
]

/**
 * 系统配置 Tab 导航栏
 *
 * 使用 underline 风格（底部指示条 + 竖线分隔），与用户管理页面的 filterBar 风格保持一致。
 * 该组件通过 AdminPageHeader 的 filterBar 属性注入到 CardHeader 第二行。
 */
export function SettingsTabBar({ activeTab, onTabChange }: SettingsTabBarProps) {
  return (
    <nav className="flex items-center h-full px-7" role="tablist" aria-label="系统配置导航">
      {TABS.map((tab, index) => {
        const isActive = activeTab === tab.value
        return (
          <React.Fragment key={tab.value}>
            <button
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.value)}
              className={cn(
                'text-nav px-4 py-2 relative',
                'motion-safe:transition-colors motion-safe:duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'hover:text-fg',
                isActive ? 'text-primary font-semibold' : 'text-fg-secondary font-medium'
              )}
            >
              {tab.label}
              {/* 激活态底部指示条 */}
              {isActive && (
                <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-primary rounded-full" />
              )}
            </button>
            {/* Tab 之间的竖线分隔符 */}
            {index < TABS.length - 1 && (
              <span className="w-px h-5 bg-border-default mx-1" aria-hidden="true" />
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
