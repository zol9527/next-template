'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Function: ShopStatusFilter
 *
 * Description: 商城管理页面状态筛选按钮组（Pill + Count Badge）
 *
 * 设计规范:
 *   - 选中状态: bg-primary text-white, count badge 用 bg-white/20
 *   - 未选中状态: bg-surface border border-border-default, count badge 根据语义色
 *   - 间距: gap-2
 *   - 圆角: rounded-full (pill 形状)
 *   - 文字: text-pill (DM Sans, 11.5px, 500)
 *
 * Parameters:
 *   filters(FilterItem[]): 筛选项列表
 *   activeFilter(string): 当前激活的筛选项 value
 *   onFilterChange((value: string) => void): 筛选变化回调
 *   className(string): 额外 CSS 类名
 *
 * Returns:
 *   element(React.ReactElement): 状态筛选按钮组
 */
/**
 * 语义色到 Tailwind 类名的静态映射
 *
 * 重要: 不能使用模板字符串动态拼接 Tailwind 类名（如 `bg-${color}/10`），
 * 因为 Tailwind JIT 编译器只能识别源码中完整出现的类名字符串。
 */
const BADGE_COLOR_MAP: Record<string, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  rose: 'bg-rose/10 text-rose',
  gold: 'bg-gold/10 text-gold',
  teal: 'bg-teal/10 text-teal',
  primary: 'bg-primary/10 text-primary',
  brown: 'bg-brown/10 text-brown',
  peach: 'bg-peach/10 text-peach',
}

export interface FilterItem {
  /** 筛选项标签文字 */
  label: string
  /** 对应数量 */
  count: number
  /** 筛选项值 */
  value: string
  /** 主题色（用于未选中状态 count badge），可选值: success/warning/rose/gold/teal/primary/brown/peach */
  color?: string
}

interface ShopStatusFilterProps {
  /** 筛选项列表 */
  filters: FilterItem[]
  /** 当前激活的筛选项 */
  activeFilter: string
  /** 筛选变化回调 */
  onFilterChange: (value: string) => void
  /** 额外的 CSS 类名 */
  className?: string
}

export function ShopStatusFilter({
  filters,
  activeFilter,
  onFilterChange,
  className,
}: ShopStatusFilterProps) {
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="tablist"
      aria-label="状态筛选"
    >
      {filters.map((filter) => {
        const isActive = activeFilter === filter.value

        return (
          <button
            key={filter.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onFilterChange(filter.value)}
            className={cn(
              // 基础样式
              'inline-flex items-center gap-1.5',
              // 圆角 pill
              'rounded-full',
              // 内边距
              'px-3 py-1.5',
              // 文字样式
              'text-pill',
              // 过渡动画
              'motion-safe:transition-all motion-safe:duration-150',
              // 聚焦样式
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
              // 选中/未选中状态
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface border border-border-default text-fg-secondary hover:border-border-medium hover:text-fg'
            )}
          >
            {/* 筛选项标签 */}
            <span>{filter.label}</span>

            {/* 数量 Badge */}
            <span
              className={cn(
                'inline-flex items-center justify-center',
                'min-w-5 h-5 px-1.5',
                'rounded-full',
                'text-[10px] font-semibold leading-none',
                isActive
                  ? 'bg-white/20 text-primary-foreground'
                  : filter.color
                    ? BADGE_COLOR_MAP[filter.color] ?? 'bg-surface-alt text-fg-muted'
                    : 'bg-surface-alt text-fg-muted'
              )}
            >
              {filter.count.toLocaleString()}
            </span>
          </button>
        )
      })}
    </div>
  )
}
