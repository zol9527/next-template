/**
 * File: tabs.tsx
 * Description: Tabs 组件设计系统封装，应用 Paper Design 底部边框样式
 *
 * 设计规范:
 * - 容器: 底部边框 --border-default
 * - Tab: paddingBlock 10px, paddingInline 20px, DM Sans 500 13px
 * - 激活态: 底部 2px 指示条 --ds-accent, 文字 --fg
 * - 默认态: 文字 --fg-secondary, hover 文字 --fg
 * - 过渡: 0.15s ease
 */

"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

/**
 * Function: TabsList
 *
 * Description: Tab 列表容器，底部边框分割线
 */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // 底部边框分割线
      "flex w-full items-center border-b border-[var(--border-default,_var(--border))]",
      // 移除 base 的背景和圆角
      "bg-transparent p-0",
      "gap-0",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

/**
 * Function: TabsTrigger
 *
 * Description: Tab 触发器，底部指示条 + 文字样式
 *   - 激活态: 底部 2px --ds-accent 指示条, --fg 文字
 *   - 默认态: --fg-secondary 文字, hover --fg
 *   - Paper Design: paddingBlock 10px, paddingInline 20px
 */
const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // 移除默认按钮样式
      "relative inline-flex items-center justify-center",
      // 内边距: Paper Design — paddingBlock 10px, paddingInline 20px
      "px-5 py-2.5",
      // 字体: DM Sans 500, 13px
      "text-[13px] font-medium",
      // 默认态: 次要文字色
      "text-[var(--fg-secondary,_var(--muted-foreground))]",
      // 过渡
      "transition-colors duration-150",
      // 移除默认 outline/focus 样式
      "outline-none",
      // hover: 文字变深
      "hover:text-[var(--fg,_var(--foreground))]",
      // 禁用态
      "disabled:pointer-events-none disabled:opacity-50",
      // 激活态: 底部 2px 指示条 + 主色文字
      "data-[state=active]:text-[var(--fg,_var(--foreground))]",
      "data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0",
      "data-[state=active]:after:h-[2px] data-[state=active]:after:bg-[var(--ds-accent,_var(--primary))]",
      // focus
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent,_var(--ring))] focus-visible:ring-offset-1",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

/**
 * Function: TabsContent
 *
 * Description: Tab 内容区域
 */
const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent,_var(--ring))] focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
