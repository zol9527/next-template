import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { isPluginEnabled } from '@/plugins/registry'
import { AdminCouponsClient } from './admin-coupons-client'

// 优惠券管理页面 — 需要动态渲染，因为子组件在渲染时使用 new Date()（日期格式化）
export default async function AdminCouponsPage() {
  // opt-in 动态渲染：避免 Next.js 16 预渲染时 Date.now() 报错
  void (await connection())

  if (!isPluginEnabled('ecommerce')) {
    notFound()
  }

  return <AdminCouponsClient />
}
