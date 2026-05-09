'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarCheck,
  Users,
  RefreshCw,
  Flame,
  Loader2,
  TrendingUp,
  Calendar,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { CheckinStatsSchema, type CheckinStats } from '@/contracts/dtos/admin-checkin.dto'
import type { ApiResponse } from '@/contracts/api-response.schema'

/**
 * Component: StatCard
 * 
 * Description: 签到统计页面的指标卡片，包含图标、标签、数值。
 */
interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  description: string
  className?: string
  iconClassName?: string
}

function StatCard({ title, value, icon, description, className, iconClassName }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden border-border/20 bg-muted/5 transition-all hover:bg-muted/10", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground/80">{title}</CardTitle>
        <div className={cn("rounded-lg p-2 text-primary bg-primary/10", iconClassName)}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <p className="text-xs text-muted-foreground/60 mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

/**
 * Component: AdminCheckinStatsPage
 * 
 * Description: 签到统计管理页面，展示核心指标和 7 天签到趋势图。
 */
export default function AdminCheckinStatsPage() {
  const { toast } = useToast()

  const { data: stats, isLoading, error, refetch, isFetching } = useQuery<CheckinStats>({
    queryKey: ['admin', 'checkin', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/checkin/stats')
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData?.error?.message || `获取统计数据失败 (${res.status})`)
      }
      const json = (await res.json()) as ApiResponse<unknown>
      if (!json.success) {
        throw new Error(json.error?.message || '获取统计数据失败')
      }
      const parsed = CheckinStatsSchema.safeParse(json.data)
      if (!parsed.success) {
        console.error('Checkin stats validation failed:', parsed.error)
        throw new Error('统计数据格式校验失败')
      }
      return parsed.data
    },
    staleTime: 60 * 1000, // 1分钟缓存
  })

  // 处理刷新
  const handleRefresh = React.useCallback(async () => {
    try {
      await refetch()
      toast({
        title: '数据已更新',
        description: '签到统计数据刷新成功',
      })
    } catch (err) {
      toast({
        title: '更新失败',
        description: err instanceof Error ? err.message : '未知错误',
        variant: 'destructive',
      })
    }
  }, [refetch, toast])

  // 处理图表日期格式化
  const chartData = React.useMemo(() => {
    if (!stats?.trend) return []
    return stats.trend.map(item => ({
      ...item,
      // 提取 MM-DD
      shortDate: item.date.split('-').slice(1).join('-'),
    }))
  }, [stats?.trend])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="rounded-full bg-destructive/10 p-3">
          <Calendar className="h-6 w-6 text-destructive" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">加载统计失败</h3>
          <p className="text-sm text-muted-foreground mt-1">{error instanceof Error ? error.message : '请检查网络连接'}</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          重试
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 头部标题区 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">签到统计</h1>
          <p className="text-sm text-muted-foreground">查看每日签到趋势和活跃用户情况</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={isFetching}
          className="bg-background hover:bg-muted/30 transition-all gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          刷新数据
        </Button>
      </div>

      {/* 指标卡片行 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse bg-muted/5 border-border/20 h-[120px]" />
          ))
        ) : (
          <>
            <StatCard
              title="今日签到"
              value={stats?.todayCount ?? 0}
              icon={<CalendarCheck className="h-4 w-4" />}
              description="今日完成签到的总用户数"
            />
            <StatCard
              title="连续签到用户"
              value={stats?.activeStreakUsers ?? 0}
              icon={<Flame className="h-4 w-4" />}
              description="当前保持连续签到状态的用户"
              iconClassName="text-orange-500 bg-orange-500/10"
            />
            <StatCard
              title="累计签到用户"
              value={stats?.totalCheckinUsers ?? 0}
              icon={<Users className="h-4 w-4" />}
              description="系统中所有参与过签到的用户"
              iconClassName="text-blue-500 bg-blue-500/10"
            />
          </>
        )}
      </div>

      {/* 趋势图表区 */}
      <Card className="border-border/20 bg-muted/5 overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">签到趋势</CardTitle>
          </div>
          <CardDescription>最近 7 天的每日签到人数变化</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          {isLoading ? (
            <div className="h-[350px] w-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
            </div>
          ) : (
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                  <XAxis 
                    dataKey="shortDate" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--primary)', opacity: 0.05 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border border-border bg-background p-3 shadow-xl ring-1 ring-black/5">
                            <p className="text-[10px] font-medium uppercase text-muted-foreground mb-1">{payload[0].payload.date}</p>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                              <span className="text-sm font-bold">{payload[0].value} 人签到</span>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="var(--primary)" 
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index === chartData.length - 1 ? 'var(--primary)' : 'var(--primary)'} 
                        fillOpacity={index === chartData.length - 1 ? 1 : 0.7}
                        className="transition-all duration-300 hover:fill-opacity-100"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
