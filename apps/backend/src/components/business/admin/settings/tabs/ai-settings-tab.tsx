'use client'

import * as React from 'react'
import { AiSettingsClient } from '@/components/business/admin/ai-settings/ai-settings-client'

/**
 * Component: AiSettingsTab
 *
 * Description: AI 设置 Tab 面板
 * 复用现有的 AiSettingsClient 组件，该组件内部包含:
 * - Provider 配置 (含保存按钮)
 * - Prompt 模板管理
 * - 使用统计
 */
export function AiSettingsTab() {
  return (
    <div className="animate-in fade-in duration-300">
      <AiSettingsClient />
    </div>
  )
}
