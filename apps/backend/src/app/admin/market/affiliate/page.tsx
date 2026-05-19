import { notFound } from 'next/navigation'
import { isPluginEnabled } from '@/plugins/registry'
import { AdminAffiliateClient } from './admin-affiliate-client'

export default function AdminAffiliatePage() {
  if (!isPluginEnabled('promotion')) {
    notFound()
  }

  return <AdminAffiliateClient />
}
