import { Metadata } from 'next'
import { AiSettingsClient } from '@/components/business/admin/ai-settings/ai-settings-client'

export const metadata: Metadata = {
  title: 'AI 设置',
  description: '管理 AI 功能配置、Provider 设置和 Prompt 模板',
}

export default function AiSettingsPage() {
  return <AiSettingsClient />
}