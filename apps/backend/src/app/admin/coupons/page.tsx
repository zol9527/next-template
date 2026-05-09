import { notFound } from 'next/navigation'
import { isPluginEnabled } from '@/plugins/registry'
import { AdminCouponsClient } from './admin-coupons-client'

export default function AdminCouponsPage() {
  if (!isPluginEnabled('ecommerce')) {
    notFound()
  }

  return <AdminCouponsClient />
}
