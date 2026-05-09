import type { ReactNode } from 'react'
import { connection } from 'next/server'
import { getEnabledPlugins, refreshPluginCache } from '@/plugins/registry'
import { AdminShell } from '@/components/layout/admin-shell'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // opt-in 动态渲染：插件缓存内部使用 Date.now()，需跳过静态预渲染
  void (await connection())
  await refreshPluginCache()
  const enabledPlugins = getEnabledPlugins()
  return (
    <AdminShell enabledPlugins={enabledPlugins}>
      {children}
    </AdminShell>
  )
}
