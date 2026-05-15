/**
 * File: status-badge.tsx
 * Description: 状态徽章组件，根据配置自动显示对应的状态标签
 */

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ColorRole } from '@/types/ui-component/semantics'

/**
 * Type: StatusBadgeProps
 *
 * Description: 状态徽章组件的 props
 *
 * Properties:
 *     status(string): 状态值
 *     config(Record): 状态配置映射
 */
export interface StatusBadgeProps {
  status: string
  config: Record<string, { label: string; color: ColorRole }>
}

/**
 * Function: StatusBadge
 *
 * Description: 状态徽章组件，根据配置自动显示对应的状态标签
 *
 * Parameters:
 *     status(string): 状态值
 *     config(Record): 状态配置映射
 *
 * Returns:
 *     element(React.ReactElement): 徽章元素
 *
 * Example:
 *     const orderStatuses = {
 *       pending: { label: '待支付', color: 'warning' },
 *       paid: { label: '已支付', color: 'success' },
 *       cancelled: { label: '已取消', color: 'neutral' },
 *     }
 *     <StatusBadge status="pending" config={orderStatuses} />
 */
function StatusBadge({ status, config }: StatusBadgeProps) {
  // 颜色角色到样式类名的映射（语义色浅底 + 语义色文字 + 语义色边框）
  const colorClassMap: Record<ColorRole, string> = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    error: 'bg-error/10 text-error border-error/20',
    info: 'bg-info/10 text-info border-info/20',
    neutral: 'bg-muted text-muted-foreground border-border',
  }

  // 色点颜色映射（与文字色一致）
  const dotColorMap: Record<ColorRole, string> = {
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
    info: 'bg-info',
    neutral: 'bg-muted-foreground',
  }

  const statusConfig = config[status]

  // 未找到配置时显示原始状态值
  if (!statusConfig) {
    return <Badge variant="outline">{status}</Badge>
  }

  return (
    <Badge
      variant="outline"
      className={cn('inline-flex items-center gap-1.5 rounded-full', colorClassMap[statusConfig.color])}
    >
      {/* 5×5px 圆形色点 */}
      <span
        className={cn('inline-block h-[5px] w-[5px] rounded-full', dotColorMap[statusConfig.color])}
        aria-hidden="true"
      />
      {statusConfig.label}
    </Badge>
  )
}

export { StatusBadge }
