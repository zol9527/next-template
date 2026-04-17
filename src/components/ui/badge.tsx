/**
 * File: badge.tsx
 * Description: Badge 组件语义化封装，包装 shadcn/ui 基础 Badge
 */

'use client'

import * as React from 'react'
import { Badge as BaseBadge, type BadgeProps as BaseBadgeProps } from '@/components/base/badge'
import { cn } from '@/lib/utils'
import type { ColorRole } from '@/types/ui-component/semantics'
import { getStatusColor, type BusinessStatus } from '@/types/ui-component/ui-status'

export interface BadgeProps extends Omit<React.ComponentProps<'div'>, 'variant'> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | ColorRole
  status?: BusinessStatus
}

/**
 * Function: COLOR_ROLES
 *
 * Description: 颜色角色集合，用于类型检查
 */
const COLOR_ROLES = new Set(['primary', 'success', 'warning', 'error', 'info', 'neutral'] as const)

/**
 * Function: isColorRole
 *
 * Description: 检查值是否为颜色角色
 *
 * Parameters:
 *     value(unknown): 待检查的值
 *
 * Returns:
 *     boolean: 是否为颜色角色
 */
function isColorRole(value: unknown): value is ColorRole {
  return typeof value === 'string' && COLOR_ROLES.has(value as ColorRole)
}

/**
 * Function: Badge
 *
 * Description: 徽章组件：用于展示状态、标签等短小信息，支持语义化颜色和业务状态
 *
 * Parameters:
 *     className(string): 自定义样式类名
 *     variant(string | ColorRole): 变体类型或颜色角色
 *     status(BusinessStatus): 业务状态（优先级高于 variant）
 *     children(React.ReactNode): 徽章内容
 *
 * Returns:
 *     element(React.ReactElement): 徽章元素
 *
 * Example:
 *     // 基础用法
 *     <Badge>默认</Badge>
 *
 *     // 使用颜色角色
 *     <Badge variant="success">成功</Badge>
 *     <Badge variant="warning">警告</Badge>
 *
 *     // 使用业务状态（推荐）
 *     <Badge status="published">已上架</Badge>
 *     <Badge status="draft">草稿</Badge>
 */
const Badge = React.memo(
  React.forwardRef<HTMLDivElement, BadgeProps>(
    ({ className, variant = 'default', status, ...props }, ref) => {
      // 缓存有效变体计算
      const effectiveVariant = React.useMemo(
        () => (status ? getStatusColor(status) : variant),
        [status, variant]
      )

      // 缓存颜色角色检查结果
      const isColorVariant = React.useMemo(
        () => isColorRole(effectiveVariant),
        [effectiveVariant]
      )

      // 始终在顶层计算颜色类名（修复 hooks 顺序问题）
      const colorClassName = React.useMemo(
        () => (isColorVariant ? colorToClassName(effectiveVariant as ColorRole) : ''),
        [isColorVariant, effectiveVariant]
      )

      // 如果是颜色角色，使用颜色角色样式
      if (isColorVariant) {
        return (
          <div
            ref={ref}
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              colorClassName,
              className
            )}
            {...props}
          />
        )
      }

      // 否则使用 base badge
      return (
        <BaseBadge
          ref={ref}
          variant={effectiveVariant as BaseBadgeProps['variant']}
          className={className}
          {...props}
        />
      )
    }
  )
)
Badge.displayName = 'Badge'

/**
 * Function: colorToClassName
 *
 * Description: 将颜色角色转换为对应的 Tailwind CSS 类名
 *
 * Parameters:
 *     color(ColorRole): 颜色角色
 *
 * Returns:
 *     string: CSS 类名字符串
 */
function colorToClassName(color: ColorRole): string {
  const colorVariants: Record<ColorRole, string> = {
    primary: 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20',
    success: 'bg-success/10 text-success border border-success/30 hover:bg-success/20',
    warning: 'bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20',
    error: 'bg-error/10 text-error border border-error/30 hover:bg-error/20',
    info: 'bg-info/10 text-info border border-info/30 hover:bg-info/20',
    neutral: 'bg-neutral/10 text-neutral border border-neutral/30 hover:bg-neutral/20',
  }
  return colorVariants[color]
}

export { Badge }
