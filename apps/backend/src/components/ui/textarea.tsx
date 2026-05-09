/**
 * File: textarea.tsx
 * Description: Textarea 组件语义化封装，支持 size 属性
 */

import * as React from "react"

import { cn } from "@/lib/utils"
import type { InputSize } from "@/types/ui-component/semantics"

// Textarea 尺寸映射
const textareaSizeClasses: Record<InputSize, string> = {
  sm: "h-20 px-2.5 py-2 text-xs min-h-[60px]",
  md: "h-24 px-3 py-2 text-sm min-h-[80px]",
  lg: "h-28 px-4 py-2 text-base min-h-[96px]",
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: InputSize
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, size = "md", ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex w-full rounded-md border border-input bg-transparent shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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
