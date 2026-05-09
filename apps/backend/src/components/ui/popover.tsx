/**
 * File: popover.tsx
 * Description: 弹出框组件语义化封装，包装 shadcn/ui 基础 Popover
 */

'use client'
import {
  Popover as BasePopover,
  PopoverTrigger as BasePopoverTrigger,
  PopoverAnchor as BasePopoverAnchor,
  PopoverContent as BasePopoverContent,
} from '@/components/base/popover'
import type { PopoverContentProps } from '@/components/base/popover'

export const Popover = BasePopover
export const PopoverTrigger = BasePopoverTrigger
export const PopoverAnchor = BasePopoverAnchor

export type { PopoverContentProps }

export const PopoverContent = BasePopoverContent
