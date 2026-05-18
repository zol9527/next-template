'use client'

/**
 * File: media-pagination.tsx
 * Description: 媒体库标准页码分页器
 *              显示格式: 1 2 3 ... 25
 */

import * as React from 'react'

interface MediaPaginationProps {
  currentPage: number
  totalPages: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

/**
 * Function: generatePageNumbers
 *
 * Description: 生成页码数组（前后各显示2页 + 首尾页）
 *
 * Parameters:
 *   current: 当前页
 *   total: 总页数
 *
 * Returns:
 *   (number | 'ellipsis')[]: 页码数组，'ellipsis' 表示省略号
 */
function generatePageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis')[] = [1]

  const rangeStart = Math.max(2, current - 2)
  const rangeEnd = Math.min(total - 1, current + 2)

  if (rangeStart > 2) {
    pages.push('ellipsis')
  }

  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i)
  }

  if (rangeEnd < total - 1) {
    pages.push('ellipsis')
  }

  if (total > 1) {
    pages.push(total)
  }

  return pages
}

const PAGE_SIZE_OPTIONS = [12, 20, 40, 60]

/**
 * Function: MediaPagination
 *
 * Description: 标准页码分页器
 * - 页码按钮: 32×32px, 圆角 var(--radius-sm)
 * - 当前页: var(--ds-accent) 背景色，白色文字
 * - 其他页: 透明背景，var(--fg-secondary) 文字
 * - 禁用态: opacity 0.4
 * - 右侧: "每页 N 条" 下拉选择器
 */
export function MediaPagination({
  currentPage,
  totalPages,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: MediaPaginationProps) {
  if (totalPages <= 1) return null

  const pages = generatePageNumbers(currentPage, totalPages)

  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: '12px var(--space-7, 28px)',
        borderTop: '1px solid var(--border)',
      }}
    >
      {/* 左侧：分页信息 */}
      <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
        共 {totalCount} 条
      </span>

      {/* 中间：页码 */}
      <div className="flex items-center gap-1">
        {/* 上一页 */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex items-center justify-center transition-colors"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm, 8px)',
            opacity: currentPage <= 1 ? 0.4 : 1,
            color: 'var(--fg-secondary)',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
          }}
        >
          ‹
        </button>

        {/* 页码 */}
        {pages.map((page, index) =>
          page === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="flex items-center justify-center"
              style={{
                width: '32px',
                height: '32px',
                color: 'var(--fg-muted)',
                fontSize: '14px',
              }}
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className="flex items-center justify-center text-sm transition-colors"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm, 8px)',
                backgroundColor: page === currentPage ? 'var(--ds-accent)' : 'transparent',
                color: page === currentPage ? '#ffffff' : 'var(--fg-secondary)',
                fontWeight: page === currentPage ? 600 : 400,
                cursor: page === currentPage ? 'default' : 'pointer',
              }}
            >
              {page}
            </button>
          )
        )}

        {/* 下一页 */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex items-center justify-center transition-colors"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm, 8px)',
            opacity: currentPage >= totalPages ? 0.4 : 1,
            color: 'var(--fg-secondary)',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
          }}
        >
          ›
        </button>
      </div>

      {/* 右侧：每页条数选择 */}
      <div className="flex items-center gap-2">
        <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>每页</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="text-sm outline-none"
          style={{
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm, 8px)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            color: 'var(--fg)',
          }}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} 条
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
