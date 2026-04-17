import { notFound } from 'next/navigation'
import { isPluginEnabled } from '@/plugins/registry'
import { AdminProductsClient } from './admin-products-client'

export default function AdminProductsPage() {
  if (!isPluginEnabled('ecommerce')) {
    notFound()
  }

  return <AdminProductsClient />
}
