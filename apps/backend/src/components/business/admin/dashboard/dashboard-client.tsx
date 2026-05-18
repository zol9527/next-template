'use client'

import { AdminPageHeader } from '@/components/ui/admin-page-header'
import type { DashboardData } from './types'
import { SystemStatusCard } from './system-status-card'
import { TransactionCard } from './transaction-card'
import { KpiStrip } from './kpi-strip'
import { ActivityFeed } from './activity-feed'
import { StudentTrendChart } from './student-trend-chart'
import { CourseDistributionChart } from './course-distribution-chart'

interface DashboardClientProps {
  data: DashboardData
}

/**
 * Component: DashboardClient
 *
 * Description: Dashboard 数据面板客户端组件（Paper Design Dashboard 1O0-0 CardContent）
 * 布局结构（自上而下）:
 *   1. TopGrid: 系统状态 + 交易数据 (grid-cols-2 gap-4)
 *   2. KpiActivityRow: KPI 指标条 + 活动 Feed (grid-cols-[1.2fr_1fr] gap-4)
 *   3. ChartsGrid: 折线图 + 环形图 (grid-cols-[1.4fr_1fr] gap-4)
 */
export function DashboardClient({ data }: DashboardClientProps) {
  return (
    <>
      <AdminPageHeader title="仪表盘" description="数据概览和系统状态" />
      <div className="flex flex-col gap-6">
      {/* 1. TopGrid — 系统状态 + 交易数据 */}
      <div className="grid grid-cols-2 gap-4">
        <SystemStatusCard data={data.systemStatus} />
        <TransactionCard data={data.transactionData} />
      </div>

      {/* 2. KpiActivityRow — KPI 指标条 + 活动 Feed */}
      <div className="grid grid-cols-[1.2fr_1fr] gap-4">
        <KpiStrip items={data.kpiItems} />
        <ActivityFeed activities={data.activities} />
      </div>

      {/* 3. ChartsGrid — 折线图 + 环形图 */}
      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <StudentTrendChart data={data.studentTrend} />
        <CourseDistributionChart data={data.courseDistribution} />
      </div>
    </div>
    </>
  )
}
