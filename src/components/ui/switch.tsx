/**
 * File: switch.tsx
 * Description: Switch 组件语义化封装，包装 shadcn/ui 基础 Switch
 */

'use client'

import * as React from 'react'
import { Switch as BaseSwitch } from '@/components/base/switch'
import { cn } from '@/lib/utils'
import type { ColorRole } from '@/types/ui-component/semantics'

export interface SwitchProps extends Omit<React.ComponentProps<typeof BaseSwitch>, 'color'> {
  color?: ColorRole
}

const Switch = React.forwardRef<
  React.ElementRef<typeof BaseSwitch>,
  SwitchProps
>(({ className, color, ...props }, ref) => {
  let finalClassName = className

  if (color) {
    finalClassName = cn(colorToClassName(color), className)
  }

  return (
    <BaseSwitch
      ref={ref}
      className={finalClassName}
      {...props}
    />
  )
})
Switch.displayName = BaseSwitch.displayName

function colorToClassName(color: ColorRole): string {
  const colorClassMap: Record<ColorRole, string> = {
    primary: 'data-[state=checked]:bg-primary',
    success: 'data-[state=checked]:bg-success',
    warning: 'data-[state=checked]:bg-warning',
    error: 'data-[state=checked]:bg-error',
    info: 'data-[state=checked]:bg-info',
    neutral: 'data-[state=checked]:bg-neutral',
  }
  return colorClassMap[color]
}

export { Switch }
