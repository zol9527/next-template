'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
Function: PaginationConfig

Description: 统一分页配置接口（服务端游标分页）

Parameters:
    无

Returns:
    无（类型定义）
*/
export interface PaginationConfig {
  /** 下一页游标 */
  nextCursor: string | null
  /** 游标历史栈（用于返回上一页） */
  prevCursors: string[]
  /** 是否正在加载 */
  isLoading: boolean
  /** 请求下一页的回调 */
  onNextPage: () => void
  /** 请求上一页的回调 */
  onPrevPage: () => void
  /** 改变每页条数的回调 */
  onPageSizeChange: (size: number) => void
  /** 当前每页条数 */
  pageSize: number
  /** 每页条数可选项（可选；不传则使用默认值） */
  pageSizeOptions?: number[]
  /** 当前页数据量 */
  totalCount: number
  /** 总记录数（必填） */
  totalRecords: number
}

interface DataTablePaginationProps {
  config: PaginationConfig
}

/**
 * 分页状态计算（React Compiler 不可优化部分）
 *
 * Description: 计算分页状态和按钮可用性
 *
 * Parameters:
 *   config(PaginationConfig): 分页配置
 *
 * Returns:
 *   paginationState(PaginationState): 计算后的分页状态
 */
interface PaginationState {
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

function usePaginationState(config: PaginationConfig): PaginationState {
  return React.useMemo(() => ({
    currentPage: config.prevCursors.length + 1,
    hasNextPage: config.nextCursor !== null,
    hasPrevPage: config.prevCursors.length > 0,
  }), [config.prevCursors, config.nextCursor])
}

/**
Function: DataTablePagination

Description: 统一数据表格分页组件（服务端游标分页）

Parameters:
    config(PaginationConfig): 分页配置

Returns:
    element(React.ReactElement): 分页控件 UI
*/
export function DataTablePagination({ config }: DataTablePaginationProps) {
  const state = usePaginationState(config)
  const pageSizeOptions = React.useMemo(() => {
    const defaults = config.pageSizeOptions ?? [10, 20, 30, 40, 50]
    const merged = new Set<number>(defaults)
    merged.add(config.pageSize)
    return Array.from(merged).sort((a, b) => a - b)
  }, [config.pageSize, config.pageSizeOptions])

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-muted/10 border border-border/30 rounded-xl backdrop-blur-sm">
      {/* 左侧：数据统计 */}
      <div className="flex-1 text-sm text-muted-foreground">
        共 <span className="font-medium">{config.totalRecords}</span> 条记录
      </div>

      {/* 右侧：分页控制 */}
      <div className="flex items-center space-x-6 lg:space-x-8">
        {/* 每页条数选择器 */}
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">每页条数</p>
          <Select
            value={`${config.pageSize}`}
            onValueChange={(value) => {
              config.onPageSizeChange(Number(value))
            }}
          >
            <SelectTrigger className="h-9 w-20">
                <SelectValue placeholder={`${config.pageSize}`} />
            </SelectTrigger>
            <SelectContent side="top">
                {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 当前页码 */}
        <div className="flex w-16 items-center justify-center text-sm font-medium">
          第 {state.currentPage} 页
        </div>

        {/* 翻页按钮组 */}
        <div className="flex items-center space-x-2">
          {/* 上一页按钮 */}
          <Button
            variant="outline"
            className="h-9 w-9 p-0"
            onClick={config.onPrevPage}
            disabled={!state.hasPrevPage || config.isLoading}
          >
            <span className="sr-only">上一页</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* 下一页按钮 */}
          <Button
            variant="outline"
            className="h-9 w-9 p-0"
            onClick={config.onNextPage}
            disabled={!state.hasNextPage || config.isLoading}
          >
            <span className="sr-only">下一页</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
