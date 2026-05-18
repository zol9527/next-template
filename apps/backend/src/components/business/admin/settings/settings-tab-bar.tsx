'use client'

/**
 * Component: SettingsTabBar
 *
 * Description: 系统配置页面的顶部 Tab 导航栏
 * 包含 6 个 Tab: 站点配置 | 协议管理 | 功能开关 | AI设置 | 数据管理 | 日志管理
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import type { SettingsTab } from './settings-page'

interface SettingsTabBarProps {
  activeTab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
}

const TABS: { value: SettingsTab; label: string }[] = [
  { value: 'site-config', label: '站点配置' },
  { value: 'agreement', label: '协议管理' },
  { value: 'feature-flags', label: '功能开关' },
  { value: 'ai-settings', label: 'AI设置' },
  { value: 'data-management', label: '数据管理' },
  { value: 'logs', label: '日志管理' },
]

export function SettingsTabBar({ activeTab, onTabChange }: SettingsTabBarProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-[var(--border)]/10 pb-4">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-all duration-200 whitespace-nowrap',
            activeTab === tab.value
              ? 'bg-[var(--ds-accent)] text-white shadow-sm'
              : 'text-[var(--fg-secondary)] hover:text-[var(--fg)] hover:bg-[var(--surface-alt)]',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
