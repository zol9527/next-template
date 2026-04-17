'use client'

import { CheckCircle, Calendar, DollarSign } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { CopyCell } from '@/components/ui/data-table/copy-cell'
import type { CouponRedemption } from '@/plugins/ecommerce/contracts/coupons.dto'

/**
Function: getRedemptionColumns

Description: 生成核销记录列表表格列定义

Parameters:

Returns:
    columns(ColumnDef<CouponRedemption>[]): TanStack Table 列定义
*/
export function getRedemptionColumns(): ColumnDef<CouponRedemption>[] {
  const columns: ColumnDef<CouponRedemption>[] = []

  // 核销记录 ID 列
  columns.push({
    accessorKey: 'id',
    header: () => (
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4" />
        核销记录 ID
      </div>
    ),
    cell: ({ row }) => (
      <CopyCell value={row.original.id} label="核销记录 ID" />
    ),
  })

  // 优惠券名称列
  columns.push({
    accessorKey: 'couponName',
    header: () => '优惠券',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.coupon?.name ?? row.original.couponId}</span>
        <span className="text-xs text-muted-foreground">{row.original.coupon?.type ?? ''}</span>
      </div>
    ),
  })

  // 用户 ID 列
  columns.push({
    accessorKey: 'userId',
    header: () => '用户',
    cell: ({ row }) => (
      <CopyCell value={row.original.userId} label="用户 ID" />
    ),
  })

  // 订单 ID 列（可选）
  columns.push({
    accessorKey: 'orderId',
    header: () => '订单',
    cell: ({ row }) => (
      row.original.orderId ? (
        <CopyCell value={row.original.orderId} label="订单 ID" />
      ) : (
        <span className="text-muted-foreground">-</span>
      )
    ),
  })

  // 金额信息列
  columns.push({
    accessorKey: 'amounts',
    header: () => (
      <div className="flex items-center justify-end gap-2">
        <DollarSign className="h-4 w-4" />
        金额
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right">
        <div className="flex items-center justify-end gap-2">
          <span className="text-muted-foreground line-through">
            ¥{row.original.originalAmount}
          </span>
          <span className="text-destructive">→</span>
          <span className="font-semibold text-success">
            ¥{row.original.finalAmount}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          折扣: -¥{row.original.discountAmount}
        </div>
      </div>
    ),
  })

  // 核销时间列
  columns.push({
    accessorKey: 'redeemedAt',
    header: () => (
      <div className="flex items-center justify-center gap-2">
        <Calendar className="h-4 w-4" />
        核销时间
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center text-sm">
        {row.original.redeemedAt
          ? new Date(row.original.redeemedAt).toLocaleString()
          : '-'}
      </div>
    ),
  })

  return columns
}
