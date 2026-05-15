/**
 * File: table.tsx
 * Description: Table 组件设计系统封装，应用 Paper Design 表格样式
 *
 * 设计规范:
 * - 表头: --surface-alt 背景, DM Sans 600 11px, uppercase, letterSpacing 0.04em
 * - 行: padding 12px 20px, hover rgba(38,37,30,0.02), border-bottom --border-default
 * - 最小宽度: 480px (支持横向滚动)
 * - 自定义滚动条: 4px 高度
 */

import * as React from "react"
import {
  Table as BaseTable,
  TableHeader as BaseTableHeader,
  TableBody as BaseTableBody,
  TableFooter as BaseTableFooter,
  TableHead as BaseTableHead,
  TableRow as BaseTableRow,
  TableCell as BaseTableCell,
  TableCaption as BaseTableCaption,
} from '@/components/base/table'
import { cn } from "@/lib/utils"

// ============================================
// Table — 表格容器
// ============================================

/**
 * Function: Table
 *
 * Description: 表格容器，添加最小宽度和自定义滚动条
 */
const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto edu-scrollbar">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm min-w-[480px]", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

// ============================================
// TableHeader — 表头区域
// ============================================

/**
 * Function: TableHeader
 *
 * Description: 表头区域，应用 --surface-alt 背景
 */
const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <BaseTableHeader
    ref={ref}
    className={cn("bg-[var(--surface-alt)]", className)}
    {...props}
  />
))
TableHeader.displayName = "TableHeader"

// ============================================
// TableBody — 表体区域
// ============================================

const TableBody = BaseTableBody

// ============================================
// TableFooter — 表尾区域
// ============================================

const TableFooter = BaseTableFooter

// ============================================
// TableRow — 表格行
// ============================================

/**
 * Function: TableRow
 *
 * Description: 表格行，应用 Paper Design 的 hover 和边框样式
 */
const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <BaseTableRow
    ref={ref}
    className={cn(
      // 行内边距: 12px 20px
      "[&_td]:px-5 [&_td]:py-3",
      // hover: rgba(38,37,30,0.02)
      "hover:bg-[var(--table-row-hover,_rgba(38,37,30,0.02))]",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

// ============================================
// TableHead — 表头单元格
// ============================================

/**
 * Function: TableHead
 *
 * Description: 表头单元格，应用 Paper Design 的表头文字样式
 *   - DM Sans 600, 11px, uppercase, letterSpacing 0.04em
 *   - 颜色: --fg-muted
 *   - 内边距: 9px 20px
 */
const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <BaseTableHead
    ref={ref}
    className={cn(
      // 文字样式: 11px, 600, uppercase, letterSpacing
      "text-[11px] font-semibold uppercase tracking-[0.04em]",
      // 颜色: --fg-muted
      "text-[var(--fg-muted,_var(--muted-foreground))]",
      // 内边距: 9px 20px
      "h-auto px-5 py-[9px]",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

// ============================================
// TableCell — 数据单元格
// ============================================

const TableCell = BaseTableCell

// ============================================
// TableCaption — 表格标题
// ============================================

const TableCaption = BaseTableCaption

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
