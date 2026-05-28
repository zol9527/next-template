'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Function: ShopTableHeader
 *
 * Description: 商城管理表格表头组件
 *
 * 设计规范:
 *   - 背景: #F7F7F4 (bg-surface-alt)
 *   - 文字: text-caption (DM Sans, 11px, fg-muted)
 *   - 高度: 约 40px
 *   - 左侧 40px 留给 checkbox 列（如果需要）
 *
 * Parameters:
 *   columns(ColumnInfo[]): 列定义数组
 *   selectable(boolean): 是否显示 checkbox 列
 *   className(string): 额外 CSS 类名
 *
 * Returns:
 *   element(React.ReactElement): 表格表头
 */
export interface ColumnInfo {
  /** 列标题 */
  label: string
  /** 列宽度类名，如 'w-[200px]' */
  width?: string
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
}

interface ShopTableHeaderProps {
  /** 列定义 */
  columns: ColumnInfo[]
  /** 是否显示 checkbox 列 */
  selectable?: boolean
  /** 全选状态 */
  allSelected?: boolean
  /** 全选切换回调 */
  onToggleAll?: () => void
  /** 额外的 CSS 类名 */
  className?: string
}

export function ShopTableHeader({
  columns,
  selectable = false,
  allSelected = false,
  onToggleAll,
  className,
}: ShopTableHeaderProps) {
  return (
    <div
      className={cn(
        // 背景
        'bg-surface-alt',
        // 圆角顶部
        'rounded-t-lg',
        // 布局
        'flex items-center',
        // 内边距
        'px-4 py-2.5',
        // 底部边框
        'border-b border-border-default',
        className
      )}
    >
      {/* Checkbox 列 */}
      {selectable && (
        <div className="w-10 flex-shrink-0 flex items-center justify-center">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleAll}
            className="h-4 w-4 rounded border-border-medium text-primary focus:ring-primary/20 cursor-pointer"
            aria-label="全选"
          />
        </div>
      )}

      {/* 列标题 */}
      {columns.map((col, index) => (
        <div
          key={index}
          className={cn(
            col.width,
            'flex-shrink-0',
            // 文字样式
            'text-caption text-fg-muted font-medium',
            // 对齐
            col.align === 'center' && 'text-center',
            col.align === 'right' && 'text-right',
            col.align === 'left' && 'text-left',
            !col.align && 'text-left'
          )}
        >
          {col.label}
        </div>
      ))}
    </div>
  )
}

/**
 * Function: ShopTableRow
 *
 * Description: 商城管理表格行组件，支持选中高亮
 *
 * 设计规范:
 *   - 选中行: 左边框 3px 橙色 #F54E00, 背景 #F54E000A (ds-accent-subtle)
 *   - 正常行: 白色背景
 *   - 悬停: 微弱背景变化
 *   - 行高: 约 52px
 *   - checkbox 选中: 橙色填充 + 白色勾选
 *
 * Parameters:
 *   selected(boolean): 是否选中
 *   selectable(boolean): 是否显示 checkbox 列
 *   onSelect(() => void): 行选中回调
 *   children(React.ReactNode): 行内容
 *   className(string): 额外 CSS 类名
 *
 * Returns:
 *   element(React.ReactElement): 表格行
 */
interface ShopTableRowProps {
  /** 是否选中 */
  selected?: boolean
  /** 是否可选中 */
  selectable?: boolean
  /** 选中状态回调 */
  onSelect?: () => void
  /** 点击行事件 */
  onClick?: () => void
  /** 行内容 */
  children: React.ReactNode
  /** 额外的 CSS 类名 */
  className?: string
}

export function ShopTableRow({
  selected = false,
  selectable = false,
  onSelect,
  onClick,
  children,
  className,
}: ShopTableRowProps) {
  return (
    <div
      role="row"
      className={cn(
        // 布局
        'flex items-center',
        // 内边距
        'px-4 py-3',
        // 底部边框
        'border-b border-border-default last:border-b-0',
        // 悬停效果
        'hover:bg-surface-alt/50',
        // 过渡动画
        'motion-safe:transition-colors motion-safe:duration-150',
        // 选中状态：左边框 + 背景
        selected && 'border-l-[3px] border-l-primary bg-ds-accent-subtle',
        // 可点击样式
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Checkbox 列 */}
      {selectable && (
        <div className="w-10 flex-shrink-0 flex items-center justify-center">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation()
              onSelect?.()
            }}
            className={cn(
              'h-4 w-4 rounded cursor-pointer',
              'border-border-medium',
              'focus:ring-primary/20',
              selected
                ? 'bg-primary border-primary text-primary-foreground'
                : 'bg-surface'
            )}
            aria-label="选择行"
          />
        </div>
      )}

      {/* 行内容 */}
      {children}
    </div>
  )
}
