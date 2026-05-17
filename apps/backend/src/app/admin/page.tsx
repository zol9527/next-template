import { connection } from 'next/server'
import { DashboardClient } from '@/components/business/admin/dashboard/dashboard-client'
import type { DashboardData } from '@/components/business/admin/dashboard/types'

/**
 * Function: getDashboardData
 *
 * Description: 获取 Dashboard 所有数据（Server Component 端）
 * TODO: 对接真实后端 API，当前使用 fallback 空数据
 */
async function getDashboardData(): Promise<DashboardData> {
  // TODO: 对接真实 API
  // const [systemStatus, transactions, kpi, activities, trend, distribution] = await Promise.all([...])

  // Fallback: 空数据结构，确保页面可渲染
  return {
    systemStatus: {
      cpu: 0,
      memory: { used: 0, total: 16, unit: 'GB' },
      disk: { used: 0, total: 500, unit: 'GB' },
      apiResponseMs: 0,
      uptime: '加载中...',
    },
    transactionData: {
      todayAmount: 0,
      pendingOrders: 0,
      refunding: 0,
      conversionRate: 0,
      avgOrderValue: 0,
    },
    kpiItems: [],
    activities: [],
    studentTrend: [],
    courseDistribution: [],
  }
}

/**
 * Page: AdminHomePage
 *
 * Description: 管理后台首页 — 数据面板
 * Server Component 获取数据，传递给 Client Component 渲染
 */
export default async function AdminHomePage() {
  void (await connection())
  const data = await getDashboardData()

  return <DashboardClient data={data} />
}
