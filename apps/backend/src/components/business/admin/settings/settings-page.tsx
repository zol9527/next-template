'use client'

/**
 * Component: SettingsPage
 *
 * Description: 系统配置管理主容器组件
 * 统一的 Tab 导航页面，包含 6 个 Tab 面板
 * - Tab 状态: useState<SettingsTab>
 * - 纯前端状态，无路由变化
 * - Tab 切换时组件卸载，React Query 缓存保留
 * - 各 Tab 面板自行管理保存逻辑（内含保存按钮）
 */

import * as React from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminPageHeader } from '@/components/ui/admin-page-header'
import { AdminPageLayout } from '@/components/ui/admin-page-layout'
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

export function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState<SettingsTab>('site-config')

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="系统配置"
        description="管理系统设置和配置"
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
      />
      <SettingsTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 min-h-0">
        {activeTab === 'site-config' && <SiteConfigTab />}
        {activeTab === 'agreement' && <AgreementTab />}
        {activeTab === 'feature-flags' && <FeatureFlagsTab />}
        {activeTab === 'ai-settings' && <AiSettingsTab />}
        {activeTab === 'data-management' && <DataManagementTab />}
        {activeTab === 'logs' && <LogsTab />}
      </div>
    </AdminPageLayout>
  )
}
