'use client'

import { Progress } from '@/components/ui/progress'
import React from 'react'

interface MonitorStatCardProps {
  /** 指标标题 (中文) */
  title: string
  /** 显示的数值 */
  value: string | number
  /** 数值单位 (如 '%', 'GB', 'MB', '秒', '个') */
  unit?: string
  /** 左侧图标 */
  icon?: React.ReactNode
  /** 进度百分比 (0-100)，传入时显示进度条 */
  progress?: number
  /** 附加描述信息 */
  description?: string
}

/**
 * Function: MonitorStatCard
 *
 * Description: 系统监控指标卡片组件，用于展示 CPU、内存、磁盘等系统指标的数值、进度和描述信息。
 *
 * Parameters:
 * 	title(string): 指标标题，如 "CPU"、"内存"
 * 	value(string | number): 显示的数值
 * 	unit(string): 数值单位，如 '%'、'GB'、'MB'、'秒'、'个'，可选
 * 	icon(React.ReactNode): 左侧图标，可选
 * 	progress(number): 进度百分比 (0-100)，传入时显示进度条，可选
 * 	description(string): 附加描述信息，可选
 *
 * Returns:
 * 	JSX.Element: 渲染后的系统监控指标卡片
 */
export function MonitorStatCard({ title, value, unit, icon, progress, description }: MonitorStatCardProps) {
  return (
    <article
      className="group bg-card p-3 sm:p-4 rounded-lg border border-border/40 hover:border-border transition-all motion-safe:duration-200"
      data-testid="monitor-stat-card"
    >
      <div className="flex items-center gap-2">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors" aria-hidden="true">
            {icon}
          </div>
        )}
        <h3 className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">{title}</h3>
      </div>

      <div className="mt-2">
        <span className="text-base sm:text-lg font-bold text-foreground">{value}</span>
        {unit && (
          <span className="text-sm text-muted-foreground/50 ml-1">{unit}</span>
        )}
      </div>

      {description && <p className="mt-1 text-xs text-muted-foreground/60">{description}</p>}

      {progress !== undefined && (
        <div className="mt-2" data-testid="stat-card-progress">
          <Progress value={progress} className="h-1.5" />
        </div>
      )}
    </article>
  )
}
