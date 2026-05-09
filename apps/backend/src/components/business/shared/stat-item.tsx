/**
 * File: StatItem.tsx
 * Description: 统计项显示组件
 */

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import type { ColorRole } from '@/types/ui-component/semantics'

/**
 * Type: StatItemProps
 *
 * Description: 统计项组件的 props
 *
 * Properties:
 *     label(string): 统计项标签
 *     value(string | number): 统计值
 *     color(ColorRole): 颜色角色
 *     icon(React.ReactNode): 图标
 *     className(string): 自定义样式类名
 */
export interface StatItemProps {
  label: string
  value: string | number
  color?: ColorRole
  icon?: React.ReactNode
  className?: string
}

/**
 * Function: StatItem
 *
 * Description: 统计项显示组件，用于展示数据统计信息
 *
 * Parameters:
 *     props(StatItemProps): 组件配置
 *
 * Returns:
 *     React.ReactElement: 渲染后的统计项组件
 *
 * Example:
 *     <StatItem label="总用户" value="1,234" color="primary" />
 */
export function StatItem({ label, value, color = 'primary', icon, className }: StatItemProps) {
  const colorClassMap: Record<ColorRole, string> = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
    info: 'text-info',
    neutral: 'text-neutral',
  }

  return (
    <div className={cn('bg-card/20 backdrop-blur-xl border border-border shadow-2xl p-4', className)}>
      {icon && <div className="mb-2">{icon}</div>}
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={cn('text-xl font-bold', colorClassMap[color])}>{value}</div>
    </div>
  )
}
