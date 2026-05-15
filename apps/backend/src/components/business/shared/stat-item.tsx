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
  // 语义色浅底 + 边框样式映射
  const colorStyleMap: Record<ColorRole, { container: string; icon: string; value: string }> = {
    primary: {
      container: 'bg-primary/5 border-primary/10',
      icon: 'bg-primary/10 text-primary',
      value: 'text-primary',
    },
    success: {
      container: 'bg-success/5 border-success/10',
      icon: 'bg-success/10 text-success',
      value: 'text-success',
    },
    warning: {
      container: 'bg-warning/5 border-warning/10',
      icon: 'bg-warning/10 text-warning',
      value: 'text-warning',
    },
    error: {
      container: 'bg-error/5 border-error/10',
      icon: 'bg-error/10 text-error',
      value: 'text-error',
    },
    info: {
      container: 'bg-info/5 border-info/10',
      icon: 'bg-info/10 text-info',
      value: 'text-info',
    },
    neutral: {
      container: 'bg-muted/50 border-border',
      icon: 'bg-muted text-muted-foreground',
      value: 'text-foreground',
    },
  }

  const styles = colorStyleMap[color]

  return (
    <div className={cn('flex flex-col gap-1.5 p-4 rounded-xl border', styles.container, className)}>
      {icon && (
        <div className={cn('flex items-center justify-center h-7 w-7 rounded-lg', styles.icon)}>
          {icon}
        </div>
      )}
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('text-lg font-semibold tabular-nums', styles.value)}>{value}</div>
    </div>
  )
}
