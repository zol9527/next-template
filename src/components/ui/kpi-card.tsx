'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * File: kpi-card.tsx
 * Description: 紧凑型 KPI 指标卡片组件，用于数据密集型仪表盘
 * Reference: Extracted from admin-dashboard.tsx for reusability
 */

interface KPICardProps {
  /** 指标标题 */
  title: string
  /** 显示的数值 */
  value: string | number
  /** 指标图标 */
  icon: React.ReactNode
  /** 趋势文字，可选 */
  trend?: string
  /** 趋势方向，true 为上升，false 为下降，可选 */
  trendUp?: boolean
  /** 点击回调，可选 */
  onClick?: () => void
}

/**
 * Function: KPICard
 *
 * Description: 紧凑型 KPI 指标卡片，支持趋势指示和点击交互，用于数据密集型仪表盘
 *
 * Parameters:
 * 	title(string): 指标标题
 * 	value(string | number): 显示的数值
 * 	icon(React.ReactNode): 指标图标
 * 	trend(string): 趋势文字，可选
 * 	trendUp(boolean): 趋势方向，true 为上升，false 为下降，可选
 * 	onClick(function): 点击回调，可选
 *
 * Returns:
 * 	JSX.Element: 渲染后的 KPI 卡片组件
 */
export function KPICard({ title, value, icon, trend, trendUp, onClick }: KPICardProps) {
  return (
    <article
      className="bg-card rounded-lg border border-border/40 p-3 hover:border-border transition-all motion-safe:duration-200 group cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
      aria-label={`${title}: ${value}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div
          className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors motion-safe:duration-200"
          aria-hidden="true"
        >
          {icon}
        </div>
        {trend && (
          <div
            className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded',
              trendUp ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
            )}
            aria-label={`趋势: ${trendUp ? '上升' : '下降'}`}
          >
            {trend}
          </div>
        )}
      </div>
      <div className="space-y-0.5">
        <h3 className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wide">
          {title}
        </h3>
        <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
      </div>
    </article>
  )
}
