/**
 * File: dashboard/types.ts
 * Description: Dashboard 数据面板所有组件的 TypeScript 类型定义
 * 规格来源: Paper Design "Dashboard — 数据面板" (1O0-0)
 */

/** 系统状态指标 */
export interface SystemStatus {
  cpu: number
  memory: { used: number; total: number; unit: 'GB' }
  disk: { used: number; total: number; unit: 'GB' }
  apiResponseMs: number
  uptime: string
}

/** 交易数据指标 */
export interface TransactionData {
  todayAmount: number
  pendingOrders: number
  refunding: number
  conversionRate: number
  avgOrderValue: number
}

/** KPI 指标项 */
export interface KpiItem {
  id: string
  icon: string
  value: string
  label: string
  trend: { direction: 'up' | 'down' | 'stable'; value: string }
  colorTheme: 'orange' | 'gold' | 'teal' | 'rose' | 'brown' | 'peach'
  details: { label: string; value: string }[]
  progress?: number
}

/** 活动动态项 */
export interface ActivityItem {
  id: string
  type: 'user' | 'system' | 'refund' | 'security'
  content: string
  time: string
}

/** 折线图数据点 */
export interface TrendDataPoint {
  date: string
  value: number
}

/** 环形图分布项 */
export interface DistributionItem {
  name: string
  value: number
  percentage: number
  color: string
}

/** Dashboard 完整数据（Server Component 传递给 Client） */
export interface DashboardData {
  systemStatus: SystemStatus
  transactionData: TransactionData
  kpiItems: KpiItem[]
  activities: ActivityItem[]
  studentTrend: TrendDataPoint[]
  courseDistribution: DistributionItem[]
}

/** KPI 颜色主题到 CSS 变量的映射 */
export const KPI_COLOR_MAP = {
  orange: { bg: 'bg-ds-accent-subtle', text: 'text-ds-accent', bar: 'bg-ds-accent' },
  gold: { bg: 'bg-gold-subtle', text: 'text-gold', bar: 'bg-gold' },
  teal: { bg: 'bg-teal-subtle', text: 'text-teal', bar: 'bg-teal' },
  rose: { bg: 'bg-rose-subtle', text: 'text-rose', bar: 'bg-rose' },
  brown: { bg: 'bg-brown-subtle', text: 'text-brown', bar: 'bg-brown' },
  peach: { bg: 'bg-peach-subtle', text: 'text-peach', bar: 'bg-peach' },
} as const

/** 活动类型到色点颜色的映射 */
export const ACTIVITY_COLOR_MAP = {
  user: 'bg-peach',
  system: 'bg-teal',
  refund: 'bg-rose',
  security: 'bg-gold',
} as const

/** 趋势方向到颜色的映射 */
export const TREND_COLOR_MAP = {
  up: 'text-teal',
  down: 'text-rose',
  stable: 'text-fg-muted',
} as const
