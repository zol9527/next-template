/**
 * File: textarea.tsx
 * Description: Textarea 组件语义化封装，支持 size 属性
 */

import * as React from "react"

import { cn } from "@/lib/utils"
import type { InputSize } from "@/types/ui-component/semantics"

// Textarea 尺寸映射
// Paper Design: py=8px, px=12px, radius=8px, minHeight=56px
const textareaSizeClasses: Record<InputSize, string> = {
  sm: "px-3 py-2 text-xs min-h-[48px]",
  md: "px-3 py-2 text-sm min-h-[56px]",
  lg: "px-3 py-2 text-base min-h-[72px]",
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: InputSize
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, size = "md", ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex w-full rounded-[8px] border border-[var(--border-medium)] bg-transparent shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ds-accent)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          textareaSizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"
