import { Metadata } from 'next'
import { SettingsPage } from '@/components/business/admin/settings/settings-page'

export const metadata: Metadata = {
  title: '系统配置',
  description: '统一管理系统配置、协议管理、功能开关、AI设置、数据管理与日志',
}

/**
 * Page: AdminSettingsPage
 *
 * Description: 系统配置管理统一页面
 * 合并了原有的 6 个独立路由页面:
 * - /admin/site-config → 站点配置 Tab
 * - /admin/agreements → 协议管理 Tab
 * - /admin/feature-flags → 功能开关 Tab
 * - /admin/ai-settings → AI设置 Tab
 * - /admin/data-management → 数据管理 Tab
 * - /admin/logs → 日志管理 Tab
 */
export default function AdminSettingsPage() {
  return <SettingsPage />
}
