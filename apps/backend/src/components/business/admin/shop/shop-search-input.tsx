'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'

/**
 * Function: ShopSearchInput
 *
 * Description: 商城管理页面统一搜索输入框组件
 *
 * 设计规范:
 *   - 宽度: 默认 220px (w-[220px])
 *   - 高度: 36px (h-9)
 *   - 背景: #F2F1ED (bg-bg)
 *   - 边框: 无显式边框
 *   - 圆角: pill 形状 (rounded-full)
 *   - 搜索图标: 左侧 16px 处
 *   - placeholder: text-fg-muted
 *   - 输入文字: text-body-sm (DM Sans, 12px)
 *
 * Parameters:
 *   value(string): 输入值
 *   onChange((value: string) => void): 输入变化回调
 *   placeholder(string): 占位文本
 *   className(string): 额外 CSS 类名
 *
 * Returns:
 *   element(React.ReactElement): 搜索输入框
 */
export function ShopSearchInput({
  value,
  onChange,
  placeholder = '搜索...',
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      {/* 搜索图标 */}
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted pointer-events-none"
        aria-hidden="true"
      />

      {/* 输入框 */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        className={cn(
          // 尺寸
          'w-[220px] h-9',
          // 内边距：左侧给图标留空间
          'pl-9 pr-3',
          // 背景和边框
          'bg-bg border-none',
          // 圆角 pill
          'rounded-full',
          // 文字样式
          'text-body-sm text-fg',
          'placeholder:text-fg-muted',
          // 聚焦样式
          'focus:outline-none focus:ring-2 focus:ring-primary/20',
          // 过渡动画
          'motion-safe:transition-all motion-safe:duration-150'
        )}
      />
    </div>
  )
}
