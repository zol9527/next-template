/**
 * File: status-badge.tsx
 * Description: 状态徽章组件，根据配置自动显示对应的状态标签
 */

import { Badge } from '@/components/ui/badge'
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
  // 颜色角色到样式类名的映射
  const colorClassMap: Record<ColorRole, string> = {
    primary: 'bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 dark:text-primary dark:border-primary/40',
    success: 'bg-success/10 text-success border-success/30 dark:bg-success/20 dark:text-success dark:border-success/40',
    warning: 'bg-warning/10 text-warning border-warning/30 dark:bg-warning/20 dark:text-warning dark:border-warning/40',
    error: 'bg-error/10 text-error border-error/30 dark:bg-error/20 dark:text-error dark:border-error/40',
    info: 'bg-info/10 text-info border-info/30 dark:bg-info/20 dark:text-info dark:border-info/40',
    neutral: 'bg-neutral/10 text-neutral border-neutral/30 dark:bg-neutral/20 dark:text-neutral dark:border-neutral/40',
  }

  const statusConfig = config[status]

  // 未找到配置时显示原始状态值
  if (!statusConfig) {
    return <Badge variant="outline">{status}</Badge>
  }

  return (
    <Badge variant="outline" className={colorClassMap[statusConfig.color]}>
      {statusConfig.label}
    </Badge>
  )
}

export { StatusBadge }
