import type { ReactNode } from 'react'
import { getEnabledPlugins } from '@/plugins/registry'
import { AdminShell } from '@/components/layout/admin-shell'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const enabledPlugins = getEnabledPlugins()
  return (
    <AdminShell enabledPlugins={enabledPlugins}>
      {children}
    </AdminShell>
  )
}
