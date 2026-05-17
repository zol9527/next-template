import { connection } from 'next/server'
import { cookies } from 'next/headers'
import { DashboardClient } from '@/components/business/admin/dashboard/dashboard-client'
import type { DashboardData, KpiItem, ActivityItem, TrendDataPoint, DistributionItem } from '@/components/business/admin/dashboard/types'

/**
 * 基础 URL — Server Component 内部调用 API
 * Next.js Server Components 通过 localhost 直接调用自身 API Route
 */
const API_BASE = 'http://localhost:3000/api/v1/admin/dashboard'

/**
 * 辅助函数: 安全地 fetch API 端点
 * 失败时返回 null，不阻塞页面渲染
 */
async function safeFetch<T>(url: string): Promise<T | null> {
  try {
    const cookieStore = await cookies()
    const res = await fetch(url, {
      headers: { cookie: cookieStore.toString() },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data ?? json
  } catch {
    return null
  }
}

/**
 * Function: getDashboardData
 *
 * Description: 获取 Dashboard 所有数据（Server Component 端）
 *
 * 数据来源策略:
 *   1. systemStatus → GET /api/v1/admin/dashboard/system-stats（已有）
 *   2. transactionData → GET /api/v1/admin/dashboard/stats（已有，依赖 ecommerce 插件）
 *   3. 其余数据（KPI、活动、趋势、分布）→ 临时 mock，后续新增 API 端点
 *
 * TODO(bd): 新增以下 API 端点
 *   - GET /api/v1/admin/dashboard/kpi
 *   - GET /api/v1/admin/dashboard/activities
 *   - GET /api/v1/admin/dashboard/student-trend
 *   - GET /api/v1/admin/dashboard/course-distribution
 */
async function getDashboardData(): Promise<DashboardData> {
  // 并行请求已有 API
  const [systemStats, dashboardStats] = await Promise.all([
    safeFetch<Record<string, any>>(`${API_BASE}/system-stats`),
    safeFetch<Record<string, any>>(`${API_BASE}/stats`),
  ])

  // 映射 systemStatus — 从 system-stats API 响应中提取
  const systemStatus = {
    cpu: systemStats?.cpu?.usage ?? 0,
    memory: {
      used: Math.round((systemStats?.memory?.used ?? 0) / 1024 / 1024 / 1024 * 10) / 10,
      total: Math.round((systemStats?.memory?.total ?? 0) / 1024 / 1024 / 1024 * 10) / 10,
      unit: 'GB' as const,
    },
    disk: {
      used: Math.round((systemStats?.disk?.used ?? 0) / 1024 / 1024 / 1024 * 10) / 10,
      total: Math.round((systemStats?.disk?.total ?? 0) / 1024 / 1024 / 1024 * 10) / 10,
      unit: 'GB' as const,
    },
    apiResponseMs: systemStats?.database?.responseTime ?? 0,
    uptime: systemStats?.uptime?.system
      ? `${Math.floor(systemStats.uptime.system / 86400)} 天 ${Math.floor((systemStats.uptime.system % 86400) / 3600)} 小时`
      : '加载中...',
  }

  // 映射 transactionData — 从 dashboard/stats API 响应中提取
  const transactionData = {
    todayAmount: dashboardStats?.dailyRevenue ?? 0,
    pendingOrders: dashboardStats?.totalOrders ?? 0,
    refunding: 0, // TODO: 需要新增退款统计字段
    conversionRate: dashboardStats?.successRate
      ? Math.round(dashboardStats.successRate * 10) / 10
      : 0,
    avgOrderValue: dashboardStats?.totalSales && dashboardStats?.totalOrders
      ? Math.round(dashboardStats.totalSales / dashboardStats.totalOrders)
      : 0,
  }

  // TODO: 以下数据需对接真实 API，当前使用 mock 数据
  const kpiItems: KpiItem[] = []
  const activities: ActivityItem[] = []
  const studentTrend: TrendDataPoint[] = []
  const courseDistribution: DistributionItem[] = []

  return {
    systemStatus,
    transactionData,
    kpiItems,
    activities,
    studentTrend,
    courseDistribution,
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
