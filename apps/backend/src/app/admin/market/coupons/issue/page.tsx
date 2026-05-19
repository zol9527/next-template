import { notFound } from 'next/navigation'
import { isPluginEnabled } from '@/plugins/registry'
import { AdminCouponIssueClient } from './admin-coupon-issue-client'

export default function AdminCouponIssuePage() {
  if (!isPluginEnabled('ecommerce')) {
    notFound()
  }

  return <AdminCouponIssueClient />
}
