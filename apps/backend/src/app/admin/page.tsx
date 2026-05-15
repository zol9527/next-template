import { connection } from 'next/server'
import { AdminDashboardShell } from '@/components/business/admin/admin-dashboard-shell'
import { getEnabledPlugins } from '@/plugins/registry'

/**
 * Page: AdminHomePage
 *
 * Description: 管理后台首页，展示仪表盘数据（含系统监控和电商数据）
 */
export default async function AdminHomePage() {
  // 插件启用状态读取会经过 TTL 内存缓存，缓存过期判断依赖 Date.now()。
  // Next.js 16 要求 Server Component 先绑定真实请求，再读取当前时间。
  void (await connection())

  const enabledPlugins = getEnabledPlugins()
  const enabledPluginNames = Object.entries(enabledPlugins)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name)
  return <AdminDashboardShell enabledPlugins={enabledPluginNames} />
}
