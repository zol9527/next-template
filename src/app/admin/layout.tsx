import type { ReactNode } from 'react'
import { getEnabledPlugins, refreshPluginCache } from '@/plugins/registry'
import { AdminShell } from '@/components/layout/admin-shell'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await refreshPluginCache()
  const enabledPlugins = getEnabledPlugins()
  return (
    <AdminShell enabledPlugins={enabledPlugins}>
      {children}
    </AdminShell>
  )
}
