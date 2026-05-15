'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

/**
 * Function: KpiCard
 *
 * Description: KPI 指标卡片组件：用于显示关键业务指标，支持不同的颜色变体和图标
 *
 * Parameters:
 *	variant("default" | "primary" | "success" | "warning" | "danger"): 颜色变体
 *	title(string): 指标标题
 *	value(string | number): 指标值
 *	icon(LucideIcon): 图标组件
 *	className(string): 额外的 CSS 类名
 *	description(string): 可选的描述文本
 *
 * Returns:
 *	element(React.ReactElement): KPI 卡片组件
 */
export function KpiCard({
  variant = 'default',
  title,
  value,
  icon: Icon,
  className,
  description,
}: {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  title: string
  value: string | number
  icon: LucideIcon
  className?: string
  description?: string
}) {
  const variantStyles = {
    default: {
      bg: 'bg-card',
      iconBg: 'bg-muted/50',
      iconColor: 'text-foreground/70',
      valueColor: 'text-foreground',
      border: 'border-border/40',
    },
    primary: {
      bg: 'bg-primary/5',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      valueColor: 'text-primary',
      border: 'border-primary/20',
    },
    success: {
      bg: 'bg-success/10',
      iconBg: 'bg-success/20',
      iconColor: 'text-success',
      valueColor: 'text-success',
      border: 'border-success/30',
    },
    warning: {
      bg: 'bg-warning/10',
      iconBg: 'bg-warning/20',
      iconColor: 'text-warning',
      valueColor: 'text-warning',
      border: 'border-warning/30',
    },
    danger: {
      bg: 'bg-destructive/10',
      iconBg: 'bg-destructive/20',
      iconColor: 'text-destructive',
      valueColor: 'text-destructive',
      border: 'border-destructive/30',
    },
  }

  const styles = variantStyles[variant]

  return (
    <Card
      className={cn(
        'rounded-xl border shadow-sm hover:shadow-md transition-all duration-200',
        styles.border,
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* 左侧：图标和标题 */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className={cn(
                'h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0',
                styles.iconBg
              )}
            >
              <Icon className={cn('h-5 w-5', styles.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground/60 mb-1">{title}</p>
              <p className={cn('text-2xl font-bold tracking-tight', styles.valueColor)}>
                {value}
              </p>
              {description && (
                <p className="text-xs text-foreground/50 mt-1 truncate">{description}</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
