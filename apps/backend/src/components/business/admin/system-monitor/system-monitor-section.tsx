'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Cpu,
  HardDrive,
  Clock,
  Globe,
  Database,
  Server,
  RefreshCw,
  Activity,
} from 'lucide-react'
import { MonitorStatCard } from './stat-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SystemStatsSchema } from '@/contracts/dtos/admin/system-stats.dto'
import type { SystemStats } from '@/contracts/dtos/admin/system-stats.dto'
import type { ApiResponse } from '@/contracts/api-response.schema'

/**
 * Function: formatBytes
 *
 * Description: 将字节数转换为人类可读的大小格式，自动选择合适的单位 (B/KB/MB/GB/TB)
 *
 * Parameters:
 * 	bytes(number): 待转换的字节数
 *
 * Returns:
 * 	result({ value: string, unit: string }): 包含格式化后数值和单位的对象
 */
function formatBytes(bytes: number): { value: string; unit: string } {
  if (bytes === 0) return { value: '0', unit: 'B' }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.floor(Math.log(bytes) / Math.log(1024))
  // 防止索引越界
  const safeIndex = Math.min(index, units.length - 1)
  const value = (bytes / Math.pow(1024, safeIndex)).toFixed(1)

  return { value, unit: units[safeIndex] }
}

/**
 * Function: formatUptime
 *
 * Description: 将秒数转换为 "X天 X小时" 格式的可读运行时间
 *
 * Parameters:
 * 	seconds(number): 运行时间（秒）
 *
 * Returns:
 * 	result(string): 格式化后的运行时间字符串
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) {
    return `${days}天 ${hours}小时`
  }
  if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`
  }
  return `${minutes}分钟`
}

/**
 * Component: SystemMonitorSection
 *
 * Description: 系统监控面板组件，展示 CPU、内存、磁盘等系统运行指标。
 * 使用 TanStack Query 每 10 秒轮询刷新数据，提供加载骨架屏和错误重试功能。
 */
export function SystemMonitorSection() {
  const { data: stats, isLoading, error, refetch } = useQuery<SystemStats>({
    queryKey: ['admin', 'dashboard', 'system-stats'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/dashboard/system-stats', {
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error(`获取系统指标失败: ${res.statusText}`)
      }
      const json = (await res.json()) as ApiResponse<unknown>
      if (!json.success) {
        throw new Error(json.error.message)
      }
      const parsed = SystemStatsSchema.safeParse(json.data)
      if (!parsed.success) {
        throw new Error('响应数据格式不符合预期')
      }
      return parsed.data
    },
    refetchInterval: 10_000,
    staleTime: 5_000,
  })

  // 加载中状态 — 骨架屏
  if (isLoading) {
    return (
      <section data-testid="system-monitor-loading">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </section>
    )
  }

  // 错误状态 — 错误信息 + 重试按钮
  if (error) {
    return (
      <section data-testid="system-monitor-error">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">系统监控</h2>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border/40 p-6 text-center">
          <p className="text-sm text-destructive mb-3">
            {error instanceof Error ? error.message : '未知错误'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetch() }}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            重试
          </Button>
        </div>
      </section>
    )
  }

  // 无数据状态
  if (!stats) {
    return null
  }

  // 内存格式化
  const memFormatted = formatBytes(stats.memory.used)
  const memTotalFormatted = formatBytes(stats.memory.total)

  // 磁盘格式化
  const diskFormatted = formatBytes(stats.disk.used)
  const diskTotalFormatted = formatBytes(stats.disk.total)

  return (
    <section data-testid="system-monitor">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">系统监控</h2>
          <span className="text-[10px] text-muted-foreground/50">实时 · 10秒刷新</span>
        </div>
      </div>

      {/* 指标卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {/* CPU 使用率 */}
        <MonitorStatCard
          title="CPU"
          value={stats.cpu.usage.toFixed(1)}
          unit="%"
          icon={<Cpu className="h-4 w-4" />}
          progress={stats.cpu.usage}
          description={`${stats.cpu.model} · ${stats.cpu.cores}核`}
        />

        {/* 内存使用 */}
        <MonitorStatCard
          title="内存"
          value={memFormatted.value}
          unit={memFormatted.unit}
          icon={<Activity className="h-4 w-4" />}
          progress={stats.memory.usagePercent}
          description={`共 ${memTotalFormatted.value} ${memTotalFormatted.unit}`}
        />

        {/* 磁盘使用 */}
        <MonitorStatCard
          title="磁盘"
          value={diskFormatted.value}
          unit={diskFormatted.unit}
          icon={<HardDrive className="h-4 w-4" />}
          progress={stats.disk.usagePercent}
          description={`共 ${diskTotalFormatted.value} ${diskTotalFormatted.unit}`}
        />

        {/* 系统运行时间 */}
        <MonitorStatCard
          title="运行时间"
          value={formatUptime(stats.uptime.system)}
          icon={<Clock className="h-4 w-4" />}
          description={`进程: ${formatUptime(stats.uptime.process)}`}
        />

        {/* 数据库状态 */}
        <MonitorStatCard
          title="数据库"
          value={stats.database.status === 'connected' ? '正常' : '异常'}
          icon={<Database className="h-4 w-4" />}
          description={`响应: ${stats.database.responseTime}ms`}
        />

        {/* 主机名 */}
        <MonitorStatCard
          title="主机名"
          value={stats.network.hostname}
          icon={<Server className="h-4 w-4" />}
          description={stats.network.publicIp ?? '无公网 IP'}
        />

        {/* Node.js 版本 */}
        <MonitorStatCard
          title="Node.js"
          value={stats.process.nodeVersion}
          icon={<Globe className="h-4 w-4" />}
          description={`${stats.process.platform} · ${stats.process.arch}`}
        />

        {/* 进程信息 */}
        <MonitorStatCard
          title="进程"
          value={`PID ${stats.process.pid}`}
          icon={<Server className="h-4 w-4" />}
          description={`负载: ${stats.cpu.loadAvg.map(v => v.toFixed(2)).join(' / ')}`}
        />
      </div>
    </section>
  )
}
