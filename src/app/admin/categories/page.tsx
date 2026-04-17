import { notFound } from 'next/navigation'
import { isPluginEnabled } from '@/plugins/registry'
import { AdminCategoriesClient } from './admin-categories-client'

export default function AdminCategoriesPage() {
  if (!isPluginEnabled('ecommerce')) {
    notFound()
  }

  return <AdminCategoriesClient />
}
