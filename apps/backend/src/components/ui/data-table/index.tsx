'use client'

import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type Table as TanStackTable,
} from '@tanstack/react-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { DataTablePagination, type PaginationConfig } from './pagination'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  toolbar?: React.ReactNode
  /** 分页配置（服务端游标分页） */
  pagination?: PaginationConfig
  /** 行选择变化回调，返回选中的行 ID 数组 */
  onSelectionChange?: (selectedIds: string[]) => void
}

/**
 * 表格内容渲染组件
 *
 * Description: 纯渲染组件，负责渲染表格结构和数据，可被 React Compiler 优化
 *
 * Parameters:
 *   table(TanStackTable<TData>): TanStack Table 实例
 *   columns(ColumnDef<TData, TValue>[]): 列定义
 *   pagination(PaginationConfig | undefined): 分页配置
 *
 * Returns:
 *   element(React.ReactElement): 表格渲染内容
 */
function DataTableContent<TData, TValue>({
  table,
  columns,
  pagination,
}: {
  table: TanStackTable<TData>
  columns: ColumnDef<TData, TValue>[]
  pagination?: PaginationConfig
}) {
  return (
    <div className="flex flex-col gap-4 bg-background rounded-xl border border-border/60 shadow-sm">
      {/* 表格区域：支持水平和垂直滚动，固定表头 */}
      <ScrollArea className="h-150 w-full backdrop-blur-sm">
        <Table className="min-w-[1200px]">
          <TableHeader className="sticky top-0 z-10 border-b border-border/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-border/40 hover:bg-muted/5 transition-colors">
                {headerGroup.headers.map((header) => {
                  const isSelectColumn = header.id === 'select'
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{ width: header.getSize() }}
                      className={`first:pl-4 last:pr-4 h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-r border-border/20 last:border-r-0 ${
                        isSelectColumn ? 'text-center' : ''
                      }`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                // 创建稳定的点击处理器
                const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
                  const target = e.target as HTMLElement
                  // 防止点击交互元素时触发行选择
                  if (
                    target.closest('button') ||
                    target.closest('input[type="checkbox"]') ||
                    target.closest('label') ||
                    target.closest('a') ||
                    target.closest('[role="checkbox"]')
                  ) {
                    return
                  }
                  // 切换行选中状态
                  row.toggleSelected()
                }

                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="hover:bg-muted/30 transition-colors duration-200 cursor-pointer border-b border-border/20 last:border-b-0"
                    onClick={handleRowClick}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isSelectColumn = cell.column.id === 'select'
                      return (
                        <TableCell
                          key={cell.id}
                          style={{ width: cell.column.getSize() }}
                          className={`border-r border-border/20 last:border-r-0 ${
                            isSelectColumn ? 'p-2' : 'px-4 py-2'
                          }`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* 分页 */}
      {pagination && <DataTablePagination config={pagination} />}
    </div>
  )
}

/**
Function: DataTable

Description: 通用数据表格组件：支持排序、过滤、服务端分页、行选择

Parameters:
    columns(ColumnDef<TData, TValue>[]): 表格列定义
    data(TData[]): 表格数据
    toolbar(React.ReactNode): 自定义工具栏
    pagination(PaginationConfig): 分页配置（可选）
    onSelectionChange(function): 行选择变化回调，返回选中的行 ID 数组（可选）

Returns:
    element(React.ReactElement): 数据表格 UI
*/
function DataTable<TData, TValue>({
  columns,
  data,
  pagination,
  onSelectionChange,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])

  // 当行选择变化时，通知父组件
  // 使用 useMemo 避免无限循环
  const selectedIds = React.useMemo(() => {
    return data
      .filter((_, index) => rowSelection[index as keyof typeof rowSelection])
      .map((item) => {
        const record = item as Record<string, unknown>
        return typeof record.id === 'string' ? record.id : String(record.id)
      })
  }, [rowSelection, data])

  // 使用 useEffect 触发回调，只在 selectedIds 真正变化时才调用
  React.useEffect(() => {
    if (!onSelectionChange) return
    onSelectionChange(selectedIds)
  }, [selectedIds, onSelectionChange])

  // 初始化 TanStack Table 实例
  // 注意：此组件不使用 'use no memo'，因为逻辑已与渲染分离
  const table = useReactTable({
    data,                          // 表格数据源
    columns,                       // 列定义
    state: {
      sorting,                     // 排序状态
      columnVisibility,            // 列显示/隐藏状态
      rowSelection,                // 行选择状态
      columnFilters,               // 列过滤状态
    },
    enableRowSelection: true,      // 启用行选择功能
    onRowSelectionChange: setRowSelection,        // 行选择变化回调
    onSortingChange: setSorting,                   // 排序变化回调
    onColumnFiltersChange: setColumnFilters,      // 过滤器变化回调
    onColumnVisibilityChange: setColumnVisibility, // 列可见性变化回调
    // 核心模型：必须，提供基础表格功能
    getCoreRowModel: getCoreRowModel(),
    // 过滤模型：支持列过滤/搜索功能
    getFilteredRowModel: getFilteredRowModel(),
    // 排序模型：支持列排序功能
    getSortedRowModel: getSortedRowModel(),
    // Faceted 模型：为过滤器提供唯一值选项（优化性能）
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  return <DataTableContent table={table} columns={columns} pagination={pagination} />
}

export { DataTable }
export type { DataTableProps }
