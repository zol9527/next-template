'use client'

import * as React from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminPageHeader } from '@/components/ui/admin-page-header'
import { SettingsTabBar } from './settings-tab-bar'
import { SiteConfigTab } from './tabs/site-config-tab'
import { AgreementTab } from './tabs/agreement-tab'
import { FeatureFlagsTab } from './tabs/feature-flags-tab'
import { AiSettingsTab } from './tabs/ai-settings-tab'
import { DataManagementTab } from './tabs/data-management-tab'
import { LogsTab } from './tabs/logs-tab'

/** Tab 类型定义 */
export type SettingsTab =
  | 'site-config'
  | 'agreement'
  | 'feature-flags'
  | 'ai-settings'
  | 'data-management'
  | 'logs'

/**
 * 系统配置页面
 *
 * 布局结构与用户管理页面一致:
 *   第一行: 标题 + 说明 + 操作按钮（保存配置）
 *   第二行: Tab 导航（站点配置 / 协议管理 / 功能开关 / AI设置 / 数据管理 / 日志管理）
 *
 * Header 由 AdminPageHeader 注入:
 *   - title + description 渲染标题行
 *   - actions 渲染右侧操作按钮
 *   - filterBar 渲染第二行的 Tab 导航
 *
 * 路由: /admin/settings
 */
export function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState<SettingsTab>('site-config')

  return (
    <>
      <AdminPageHeader
        title="系统配置"
        description="管理系统设置、协议、功能开关与数据"
        actions={
          <div className="flex items-center gap-3">
            <span className="text-caption text-fg-muted">
              最后更新: {new Date().toLocaleDateString('zh-CN')}
            </span>
            <Button size="sm" className="gap-2">
              <Save className="size-4" strokeWidth={2} />
              保存配置
            </Button>
          </div>
        }
        filterBar={<SettingsTabBar activeTab={activeTab} onTabChange={setActiveTab} />}
      />

      {/* Tab 内容面板 */}
      <div className="flex flex-col flex-1 min-h-0">
        {activeTab === 'site-config' && <SiteConfigTab />}
        {activeTab === 'agreement' && <AgreementTab />}
        {activeTab === 'feature-flags' && <FeatureFlagsTab />}
        {activeTab === 'ai-settings' && <AiSettingsTab />}
        {activeTab === 'data-management' && <DataManagementTab />}
        {activeTab === 'logs' && <LogsTab />}
      </div>
    </>
  )
}
