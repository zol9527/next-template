/**
 * File: tooltip.tsx
 * Description: 工具提示组件语义化封装，包装 shadcn/ui 基础 Tooltip
 */

'use client'
import {
  Tooltip as BaseTooltip,
  TooltipTrigger as BaseTooltipTrigger,
  TooltipContent as BaseTooltipContent,
  TooltipProvider as BaseTooltipProvider,
} from '@/components/base/tooltip'

export const Tooltip = BaseTooltip
export const TooltipTrigger = BaseTooltipTrigger
export const TooltipContent = BaseTooltipContent
export const TooltipProvider = BaseTooltipProvider
