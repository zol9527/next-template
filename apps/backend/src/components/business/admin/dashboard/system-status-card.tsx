'use client'

import { Activity } from 'lucide-react'
import type { SystemStatus } from './types'

interface SystemStatusCardProps {
  data: SystemStatus
}

/**
 * Component: SystemStatusCard
 *
 * Description: 系统状态指标卡片（Paper Design SystemCard 1RC-0）
 *   - 5 行指标: CPU, 内存, 磁盘, API 响应, 运行时间
 *   - 每行: label + 数值(JetBrains Mono 12.5px) + 进度条(90×5px, 3px 圆角)
 *   - 子卡片样式: rounded-md + border + bg-surface + p-5
 */
export function SystemStatusCard({ data }: SystemStatusCardProps) {
  const metrics = [
    { label: 'CPU', value: `${data.cpu}%`, progress: data.cpu / 100, color: 'bg-teal' },
    { label: '内存', value: `${data.memory.used} / ${data.memory.total} ${data.memory.unit}`, progress: data.memory.used / data.memory.total, color: 'bg-gold' },
    { label: '磁盘', value: `${data.disk.used} / ${data.disk.total} ${data.disk.unit}`, progress: data.disk.used / data.disk.total, color: 'bg-ds-accent' },
    { label: 'API 响应', value: `${data.apiResponseMs}ms`, progress: Math.min(data.apiResponseMs / 250, 1), color: 'bg-teal' },
    { label: '运行时间', value: data.uptime, progress: undefined, color: '' },
  ]

  return (
    <div className="rounded-md bg-surface border border-border-default p-5">
      {/* 标题行 — 图标 + "系统状态" */}
      <div className="flex items-center gap-1.5 mb-4">
        <Activity className="size-4 text-teal" strokeWidth={2} />
        <h2 className="heading-2">系统状态</h2>
      </div>

      {/* 指标行列表 */}
      <div className="flex flex-col">
        {metrics.map((metric, i) => (
          <div
            key={metric.label}
            className={`flex items-center justify-between py-[11px] ${i < metrics.length - 1 ? 'border-b border-border-default' : ''}`}
          >
            <span className="font-body text-[13px] text-fg-secondary">{metric.label}</span>
            <div className="flex items-center gap-3">
              <span className="font-mono font-semibold text-[12.5px] text-fg tabular-nums">
                {metric.value}
              </span>
              {metric.progress !== undefined && (
                <div className="w-[90px] h-[5px] rounded-[3px] bg-bg overflow-hidden">
                  <div
                    className={`h-full rounded-[3px] ${metric.color}`}
                    style={{ width: `${Math.round(metric.progress * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
