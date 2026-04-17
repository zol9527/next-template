/**
 * File: checkbox.tsx
 * Description: Checkbox 组件语义化封装，包装 shadcn/ui 基础 Checkbox
 */

'use client'

import * as React from 'react'
import { Checkbox as BaseCheckbox } from '@/components/base/checkbox'
import { cn } from '@/lib/utils'
import type { ColorRole } from '@/types/ui-component/semantics'

export interface CheckboxProps extends Omit<React.ComponentProps<typeof BaseCheckbox>, 'color'> {
  color?: ColorRole
}

type CheckboxRef = React.ComponentRef<typeof BaseCheckbox>

const Checkbox = React.forwardRef<CheckboxRef, CheckboxProps>(
  ({ className, color, ...props }, ref) => {
    let finalClassName = className

    if (color) {
      finalClassName = cn(
        colorToClassName(color),
        className
      )
    }

    return (
      <BaseCheckbox
        ref={ref}
        className={finalClassName}
        {...props}
      />
    )
  }
)

/**
 * Function: colorToClassName
 *
 * Description: 将颜色角色转换为对应的 Tailwind CSS 类名
 *
 * Parameters:
 * 	color(ColorRole): 颜色角色
 *
 * Returns:
 * 	string: 对应的 CSS 类名字符串
 */
function colorToClassName(color: ColorRole): string {
  const colorClassMap: Record<ColorRole, string> = {
    primary: 'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground border-primary',
    success: 'data-[state=checked]:bg-success data-[state=checked]:text-success-foreground border-success',
    warning: 'data-[state=checked]:bg-warning data-[state=checked]:text-warning-foreground border-warning',
    error: 'data-[state=checked]:bg-error data-[state=checked]:text-error-foreground border-error',
    info: 'data-[state=checked]:bg-info data-[state=checked]:text-info-foreground border-info',
    neutral: 'data-[state=checked]:bg-neutral data-[state=checked]:text-neutral-foreground border-neutral',
  }
  return colorClassMap[color]
}

Checkbox.displayName = 'Checkbox'

export { Checkbox }
