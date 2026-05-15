/**
 * File: MoneyAmount.tsx
 * Description: 金额显示组件
 */

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import type { ColorRole } from '@/types/ui-component/semantics'

/**
 * Type: MoneyAmountProps
 *
 * Description: 金额显示组件的 props
 *
 * Properties:
 *     amount(number | string): 金额
 *     currency(string): 货币符号
 *     rate(number): 比例值
 *     showRate(boolean): 是否显示比例
 *     color(ColorRole): 颜色角色
 *     className(string): 自定义样式类名
 */
export interface MoneyAmountProps {
  amount: number | string
  currency?: string
  rate?: number
  showRate?: boolean
  color?: ColorRole
  className?: string
}

/**
 * Function: MoneyAmount
 *
 * Description: 金额显示组件，支持货币符号和比例显示
 *
 * Parameters:
 *     props(MoneyAmountProps): 组件配置
 *
 * Returns:
 *     React.ReactElement: 渲染后的金额组件
 *
 * Example:
 *     <MoneyAmount amount={1234.56} showRate rate={0.15} />
 */
export function MoneyAmount({ amount, currency = '¥', rate, showRate, color = 'success', className }: MoneyAmountProps) {
  // 颜色角色到文字色类名的映射
  const colorClassMap: Record<ColorRole, string> = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
    info: 'text-info',
    neutral: 'text-muted-foreground',
  }

  return (
    <div className={cn('text-right', className)}>
      <div className={cn('font-mono font-semibold tabular-nums', colorClassMap[color])}>
        {currency}{Number(amount).toFixed(2)}
      </div>
      {showRate && rate !== undefined && (
        <div className="text-xs text-muted-foreground">
          比例 {(rate * 100).toFixed(0)}%
        </div>
      )}
    </div>
  )
}
