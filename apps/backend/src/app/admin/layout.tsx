import type { ReactNode } from 'react'
import { connection } from 'next/server'
import { refreshPluginCache } from '@/plugins/registry'
import { AdminShell } from '@/components/layout/admin-shell'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // opt-in 动态渲染
  void (await connection())
  await refreshPluginCache()
  return <AdminShell>{children}</AdminShell>
}
