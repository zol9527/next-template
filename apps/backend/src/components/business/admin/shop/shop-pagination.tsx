'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Function: ShopPagination
 *
 * Description: 商城管理分页组件
 *
 * 设计规范:
 *   - 左侧: 显示「显示 1-6 共 86 条」信息文字
 *   - 右侧: 页码导航按钮
 *   - 按钮样式: 圆角方形, 32px × 32px
 *   - 当前页: bg-primary text-primary-foreground
 *   - 非当前页: bg-surface border border-border-default
 *
 * Parameters:
 *   currentPage(number): 当前页码 (1-based)
 *   pageSize(number): 每页条数
 *   total(number): 总条数
 *   onPageChange((page: number) => void): 页码变化回调
 *   className(string): 额外 CSS 类名
 *
 * Returns:
 *   element(React.ReactElement): 分页组件
 */
interface ShopPaginationProps {
  /** 当前页码 (1-based) */
  currentPage: number
  /** 每页条数 */
  pageSize: number
  /** 总条数 */
  total: number
  /** 页码变化回调 */
  onPageChange: (page: number) => void
  /** 额外的 CSS 类名 */
  className?: string
}

export function ShopPagination({
  currentPage,
  pageSize,
  total,
  onPageChange,
  className,
}: ShopPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const startItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, total)

  // 计算要显示的页码范围
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      // 总页数较少，全部显示
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // 总是显示第一页
      pages.push(1)

      if (currentPage > 3) {
        pages.push('ellipsis')
      }

      // 当前页附近的页码
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis')
      }

      // 总是显示最后一页
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div
      className={cn(
        // flex 布局：左侧信息 + 右侧页码
        'flex items-center justify-between',
        // 内边距
        'pt-4',
        className
      )}
    >
      {/* 左侧：显示信息 */}
      <p className="text-body-sm text-fg-muted">
        显示 {startItem}-{endItem} 共 {total.toLocaleString()} 条
      </p>

      {/* 右侧：页码导航 */}
      <div className="flex items-center gap-1">
        {/* 上一页按钮 */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={cn(
            'w-8 h-8 rounded-lg',
            'flex items-center justify-center',
            'border border-border-default',
            'text-fg-secondary',
            'motion-safe:transition-colors motion-safe:duration-150',
            'hover:bg-surface-alt',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
          )}
          aria-label="上一页"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* 页码 */}
        {getPageNumbers().map((page, index) =>
          page === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="w-8 h-8 flex items-center justify-center text-fg-muted text-sm"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                'w-8 h-8 rounded-lg',
                'flex items-center justify-center',
                'text-body-sm',
                'motion-safe:transition-colors motion-safe:duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                page === currentPage
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'border border-border-default text-fg-secondary hover:bg-surface-alt'
              )}
              aria-label={`第 ${page} 页`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}

        {/* 下一页按钮 */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={cn(
            'w-8 h-8 rounded-lg',
            'flex items-center justify-center',
            'border border-border-default',
            'text-fg-secondary',
            'motion-safe:transition-all motion-safe:duration-150',
            'hover:bg-surface-alt',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
          )}
          aria-label="下一页"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
