/**
 * File: select.tsx
 * Description: Select 组件语义化封装，包装 shadcn/ui 基础 Select
 */

'use client'

import * as React from 'react'
import {
  Select as BaseSelect,
  SelectGroup as BaseSelectGroup,
  SelectValue as BaseSelectValue,
  SelectTrigger as BaseSelectTrigger,
  SelectContent as BaseSelectContent,
  SelectLabel as BaseSelectLabel,
  SelectItem as BaseSelectItem,
  SelectSeparator as BaseSelectSeparator,
  SelectScrollUpButton as BaseSelectScrollUpButton,
  SelectScrollDownButton as BaseSelectScrollDownButton,
} from '@/components/base/select'
import { cn } from '@/lib/utils'
import type { InputSize } from '@/types/ui-component/semantics'

export const Select = BaseSelect
export const SelectGroup = BaseSelectGroup
export const SelectValue = BaseSelectValue

export interface SelectTriggerProps extends Omit<React.ComponentProps<typeof BaseSelectTrigger>, 'size'> {
  size?: InputSize
}

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof BaseSelectTrigger>,
  SelectTriggerProps
>(({ className, size = 'md', ...props }, ref) => {
  return (
    <BaseSelectTrigger
      ref={ref}
      className={cn(
        sizeToClassName(size),
        className
      )}
      {...props}
    />
  )
})
SelectTrigger.displayName = BaseSelectTrigger.displayName

export const SelectContent = BaseSelectContent
export const SelectLabel = BaseSelectLabel
export const SelectItem = BaseSelectItem
export const SelectSeparator = BaseSelectSeparator
export const SelectScrollUpButton = BaseSelectScrollUpButton
export const SelectScrollDownButton = BaseSelectScrollDownButton

function sizeToClassName(size: InputSize): string {
  const sizeClassMap: Record<InputSize, string> = {
    // Paper Design: py=8px, px=12px, height≈34px, radius=8px
    // 匹配 Input 组件的尺寸
    sm: 'h-8 px-3 text-xs',
    md: 'h-[34px] px-3 text-sm',
    lg: 'h-10 px-3 text-base',
  }
  return sizeClassMap[size]
}
