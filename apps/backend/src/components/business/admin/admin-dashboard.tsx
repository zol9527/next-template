'use client'

import {
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import {
  TrendingUp,
  Users,
  ShoppingBag,
  DollarSign,
  ArrowUpRight,
  Loader2
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import type { DashboardStats } from '@/plugins/ecommerce/contracts/dashboard.dto'
import { DashboardStatsSchema } from '@/plugins/ecommerce/contracts/dashboard.dto'
import { StatCard } from '@/components/business/admin/stat-card'
import { DataTable } from '@/components/ui/data-table'
import type { ApiResponse } from '@/contracts/api-response.schema'

interface KPICardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: string
  trendUp?: boolean
}

/**
 * Function: KPICard
 *
 * Description: 紧凑型 KPI 指标卡片，用于数据密集型仪表盘
 *
 * Parameters:
 * 	title(string): 指标标题
 * 	value(string | number): 显示的数值
 * 	icon(React.ReactNode): 指标图标
 * 	trend(string): 趋势文字，可选
 * 	trendUp(boolean): 趋势方向，true 为上升，可选
 *
 * Returns:
 * 	JSX.Element: 渲染后的 KPI 卡片组件
 */
function KPICard({ title, value, icon, trend, trendUp }: KPICardProps) {
  return (
    <article className="bg-card rounded-lg border border-border/40 p-3 sm:p-4 hover:border-border transition-all motion-safe:duration-200 group cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors motion-safe:duration-200 shrink-0" aria-hidden="true">
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap",
            trendUp ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
          )}>
            {trend}
          </div>
        )}
      </div>
      <div className="space-y-0.5 min-w-0">
        <h3 className="text-[10px] sm:text-xs font-medium text-muted-foreground/70 uppercase tracking-wide truncate">{title}</h3>
        <p className="text-base sm:text-lg font-bold text-foreground leading-tight truncate">{value}</p>
      </div>
    </article>
  )
}

/** 最近注册用户行类型 */
type RecentCustomer = DashboardStats['recentCustomers'][number]

/** 最近用户表格列定义 */
const recentCustomerColumns: ColumnDef<RecentCustomer>[] = [
  {
    accessorKey: 'name',
    header: '用户',
    size: 120,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-muted/20 flex items-center justify-center text-foreground font-bold text-[10px]" aria-hidden="true">
          {row.original.avatar}
        </div>
        <span className="text-xs font-medium text-foreground">{row.original.name}</span>
      </div>
    ),
  },
  {
    accessorKey: 'activity',
    header: '活动',
    size: 150,
    cell: ({ row }) => (
      <span className="text-[10px] text-muted-foreground/70">{row.original.activity}</span>
    ),
  },
  {
    accessorKey: 'time',
    header: '时间',
    size: 80,
    cell: ({ row }) => (
      <time className="text-[10px] text-muted-foreground/50">{row.original.time}</time>
    ),
  },
]

/** 最近注册用户紧凑表格 */
function RecentCustomersTable({ customers }: { customers: RecentCustomer[] }) {
  return (
    <div className="overflow-hidden">
      <DataTable columns={recentCustomerColumns} data={customers} />
    </div>
  )
}

/**
 * Component: AdminDashboard
 *
 * Description: 管理后台仪表盘页面组件，展示统计数据、图表和最近用户信息
 */
export function AdminDashboard() {
  // 使用 useQuery 获取仪表盘统计数据
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/dashboard/stats', {
        credentials: 'include'
      })
      if (!res.ok) {
        throw new Error(`Failed to fetch dashboard stats: ${res.statusText}`)
      }
      const json = await res.json() as ApiResponse<unknown>
      if (!json.success) {
        throw new Error(json.error.message)
      }
      const parsed = DashboardStatsSchema.safeParse(json.data)
      if (!parsed.success) {
        throw new Error('响应数据格式不符合预期')
      }
      return parsed.data
    },
    staleTime: 30 * 1000, // 30 秒内数据视为新鲜
  })

  // 加载中状态
  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="p-8 text-muted-foreground">
        <h3 className="text-xl font-bold text-destructive mb-2">Failed to load dashboard data</h3>
        <p className="text-sm">{error instanceof Error ? error.message : '未知错误'}</p>
      </div>
    )
  }

  // 无数据状态
  if (!stats) {
    return <div className="text-muted-foreground/50 p-8">No data available.</div>
  }

  return (
    <div className="grid grid-cols-12 gap-3 pb-6">

      {/* KPI 卡片行 - 紧凑设计，响应式优化 */}
      <div className="col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard
          title="总销售额"
          value={stats.totalSales}
          icon={<DollarSign className="h-4 w-4" />}
          trend="+12.5%"
          trendUp={true}
        />
        <KPICard
          title="总订单"
          value={`${stats.totalOrders}`}
          icon={<ShoppingBag className="h-4 w-4" />}
          trend={stats.growth}
          trendUp={true}
        />
        <KPICard
          title="日收入"
          value={`¥${stats.dailyRevenue}`}
          icon={<TrendingUp className="h-4 w-4" />}
          trend="+8.3%"
          trendUp={true}
        />
        <KPICard
          title="总用户"
          value={`${stats.totalUsers}`}
          icon={<Users className="h-4 w-4" />}
          trend="+5.2%"
          trendUp={true}
        />
        <KPICard
          title="总产品"
          value={`${stats.totalProducts}`}
          icon={<ShoppingBag className="h-4 w-4" />}
          trend="+2.1%"
          trendUp={true}
        />
        <KPICard
          title="成功率"
          value={`${stats.successRate.toFixed(1)}%`}
          icon={<ArrowUpRight className="h-4 w-4" />}
          trend={stats.successRate >= 80 ? "优秀" : "良好"}
          trendUp={stats.successRate >= 80}
        />
      </div>

      {/* 主图表 - 数据密集型 */}
      <section className="col-span-12 lg:col-span-8 bg-card rounded-lg border border-border/40 p-4" aria-labelledby="overview-heading">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 id="overview-heading" className="text-sm font-semibold text-foreground">销售概览</h2>
            <p className="text-[10px] text-muted-foreground/50">Monthly sales trend</p>
          </div>
          <div className="bg-muted/20 border border-border/40 px-3 py-1 text-[10px] text-foreground/70">Monthly</div>
        </div>

        <div className="h-[200px]" role="img" aria-label="销售概览趋势图">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.salesOverview} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  borderRadius: '8px',
                  borderColor: 'transparent',
                  color: '#fff',
                  fontSize: '12px',
                  padding: '8px 12px'
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 最近用户列表 - 数据表格样式 */}
      <section className="col-span-12 lg:col-span-4 bg-card rounded-lg border border-border/40 p-4" aria-labelledby="recent-users-heading">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 id="recent-users-heading" className="text-sm font-semibold text-foreground">最近用户</h2>
            <p className="text-[10px] text-muted-foreground/50">Latest registered users</p>
          </div>
          <button
            type="button"
            className="text-[10px] text-primary hover:text-primary/80 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm px-2 py-1"
            aria-label="查看全部用户"
          >
            查看全部
          </button>
        </div>

        {/* 紧凑数据表格 */}
        <RecentCustomersTable customers={stats.recentCustomers} />
      </section>

      {/* 底部统计卡片 - 原有 StatCard，响应式优化 */}
      <div className="col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          title="全部产品"
          value={`${stats.totalProducts} active`}
          color="bg-success"
          icon={<ShoppingBag className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard
          title="全部用户"
          value={`${stats.totalUsers} registered`}
          color="bg-primary"
          icon={<Users className="h-4 w-4" aria-hidden="true" />}
        />
        <StatCard
          title="Success Rate"
          value={`${stats.successRate.toFixed(1)}% orders`}
          progress={stats.successRate}
          color="bg-info"
          icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
        />
      </div>
    </div>
  )
}
