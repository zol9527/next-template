import { notFound } from 'next/navigation'
import { isPluginEnabled } from '@/plugins/registry'
import { AdminRedemptionsClient } from './admin-redemptions-client'

export default function AdminRedemptionsPage() {
  if (!isPluginEnabled('ecommerce')) {
    notFound()
  }

  return <AdminRedemptionsClient />
}
