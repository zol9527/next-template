/**
 * File: input.tsx
 * Description: Input 组件语义化封装，支持尺寸变体
 */

import * as React from "react"
import { Input as BaseInput } from "@/components/base/input"
import { cn } from "@/lib/utils"
import type { InputSize } from "@/types/ui-component/semantics"

/**
 * Type: InputProps
 *
 * Description: 输入框组件的 props（语义化扩展）
 *
 * Properties:
 *     className(string): 自定义样式类名
 *     type(string): 输入框类型
 *     size(InputSize): 输入框尺寸
 */
export interface InputProps extends Omit<React.ComponentProps<"input">, 'size'> {
  size?: InputSize
}

/**
 * Function: Input
 *
 * Description: 输入框组件，支持语义化尺寸
 *
 * Parameters:
 *     className(string): 自定义样式类名
 *     type(string): 输入框类型
 *     size(InputSize): 输入框尺寸，可选 'sm' | 'md' | 'lg'
 *
 * Returns:
 *     element(React.ReactElement): 输入框元素
 *
 * Example:
 *     // 基础用法
 *     <Input placeholder="请输入..." />
 *
 *     // 使用尺寸
 *     <Input size="lg" placeholder="大输入框" />
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size = "md", ...props }, ref) => {
    // 尺寸映射
    const sizeMap: Record<InputSize, string> = {
      sm: "h-8 px-2.5 py-0.5 text-xs",
      md: "h-9 px-3 py-1 text-sm",
      lg: "h-10 px-4 py-1.5 text-base",
    }

    const sizeClass = sizeMap[size]

    return (
      <BaseInput
        type={type}
        className={cn(
          "flex w-full rounded-md border border-input bg-transparent shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          sizeClass,
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
