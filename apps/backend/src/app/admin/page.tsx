import { AdminDashboardShell } from '@/components/business/admin/admin-dashboard-shell'
import { getEnabledPlugins } from '@/plugins/registry'

/**
 * Page: AdminHomePage
 *
 * Description: 管理后台首页，展示仪表盘数据（含系统监控和电商数据）
 */
export default function AdminHomePage() {
  const enabledPlugins = getEnabledPlugins()
  const enabledPluginNames = Object.entries(enabledPlugins)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name)
  return <AdminDashboardShell enabledPlugins={enabledPluginNames} />
}

