/**
 * File: badge.tsx
 * Description: shadcn/ui Badge 组件（纯净基础组件）
 */

import * as React from "react"

/**
 * Type: BadgeProps
 *
 * Description: 徽章组件的 props
 *
 * Properties:
 *     variant(string): 变体类型
 *     className(string): 自定义样式类名
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

/**
 * Function: Badge
 *
 * Description: 徽章组件：用于展示状态、标签等短小信息
 *
 * Parameters:
 *     className(string): 自定义样式类名
 *     variant(string): 变体类型，可选 'default' | 'secondary' | 'destructive' | 'outline'
 *     children(React.ReactNode): 徽章内容
 *
 * Returns:
 *     element(React.ReactElement): 徽章元素
 */
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-primary text-primary-foreground hover:bg-primary/80",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
      outline: "text-foreground border border-foreground/20 hover:bg-foreground/5",
    }

    return (
      <div
        ref={ref}
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }
