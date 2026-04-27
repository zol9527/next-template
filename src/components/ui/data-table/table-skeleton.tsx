'use client'

import { Skeleton } from '@/components/ui/skeleton'

/**
 * File: table-skeleton.tsx
 * Description: 数据表格骨架屏加载组件，支持配置行数和列数
 */

interface TableSkeletonProps {
  /** 表格行数，默认 10 */
  rowCount?: number
  /** 表格列数，默认 6 */
  columnCount?: number
}

/**
 * Function: TableSkeleton
 *
 * Description: 数据表格骨架屏，展示表头和表格行的加载状态，使用延迟动画提升视觉体验
 *
 * Parameters:
 * 	rowCount(number): 表格行数，默认 10
 * 	columnCount(number): 表格列数，默认 6
 *
 * Returns:
 * 	JSX.Element: 骨架屏组件
 */
export function TableSkeleton({ rowCount = 10, columnCount = 6 }: TableSkeletonProps) {
  return (
    <div className="flex flex-col gap-4 bg-background rounded-xl border border-border/40">
      {/* 表头骨架 */}
      <div className="border-b border-border/40 bg-muted/10">
        <div className="flex items-center h-12 px-4 gap-4">
          {Array.from({ length: columnCount }).map((_, i) => (
            <Skeleton
              key={`header-${i}`}
              className="h-4 bg-muted/30"
              style={{
                width: i === 0 ? '15%' : i === columnCount - 1 ? '10%' : `${80 / (columnCount - 1)}%`,
                animationDelay: `${i * 50}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* 表格行骨架 */}
      <div className="divide-y divide-border/30">
        {Array.from({ length: rowCount }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="flex items-center px-4 gap-4 hover:bg-muted/5 transition-colors motion-safe:duration-200"
            style={{ minHeight: '56px' }}
          >
            {Array.from({ length: columnCount }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                className="h-4 bg-muted/20 rounded-sm"
                style={{
                  width: colIndex === 0 ? '15%' : colIndex === columnCount - 1 ? '10%' : `${80 / (columnCount - 1)}%`,
                  animationDelay: `${(rowIndex * columnCount + colIndex) * 30}ms`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
