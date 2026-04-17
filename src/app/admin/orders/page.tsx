import { notFound } from 'next/navigation'
import { isPluginEnabled } from '@/plugins/registry'
import { AdminOrdersClient } from './admin-orders-client'

export default function AdminOrdersPage() {
  if (!isPluginEnabled('ecommerce')) {
    notFound()
  }

  return <AdminOrdersClient />
}
