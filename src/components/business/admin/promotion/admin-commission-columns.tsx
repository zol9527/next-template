'use client'

import { DollarSign, ShoppingCart, User, FileCheck, Hash, Package } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { CopyCell } from '@/components/ui/data-table/copy-cell'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils/date'
import type { AdminCommissionRecord } from '@/plugins/promotion/contracts/commissions.dto'

// 根据佣金状态返回对应的状态徽章
function getCommissionStatusBadge(status: string) {
  const config: Record<string, { label: string; status: 'frozen' | 'payable' | 'settling' | 'settled' | 'failed' | 'voided' }> = {
    frozen: { label: '冻结', status: 'frozen' },
    payable: { label: '可结算', status: 'payable' },
    settling: { label: '结算中', status: 'settling' },
    settled: { label: '已结算', status: 'settled' },
    failed: { label: '失败', status: 'failed' },
    voided: { label: '已作废', status: 'voided' },
  }
  const item = config[status] || { label: status, status: 'pending' as const }
  return <Badge status={item.status}>{item.label}</Badge>
}

interface CommissionColumnsProps {
  onSelectForSettlement?: (commissionIds: string[]) => void
  canSelect?: (item: AdminCommissionRecord) => boolean
}

/**
Function: getCommissionColumns

Description: 生成佣金列表表格列定义

Parameters:
    onSelectForSettlement(function): 选择佣金加入结算的回调
    canSelect(function): 判断是否可以选择某条记录

Returns:
    columns(ColumnDef<AdminCommissionRecord>[]): TanStack Table 列定义
*/
export function getCommissionColumns({
}: CommissionColumnsProps = {}): ColumnDef<AdminCommissionRecord>[] {
  const columns: ColumnDef<AdminCommissionRecord>[] = []

  // 佣金 ID 列
  columns.push({
    accessorKey: 'id',
    header: () => (
      <div className="flex items-center gap-2">
        <Hash className="h-4 w-4" />
        佣金 ID
      </div>
    ),
    cell: ({ row }) => (
      <CopyCell value={row.original.id} label="佣金 ID" />
    ),
  })

  // 订单号列
  columns.push({
    accessorKey: 'orderNo',
    header: () => (
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-4 w-4" />
        订单号
      </div>
    ),
    cell: ({ row }) => (
      row.original.orderNo ? (
        <CopyCell value={row.original.orderNo} label="订单号" />
      ) : (
        <CopyCell value={row.original.orderId} label="订单号" />
      )
    ),
  })

  // 推广员列
  columns.push({
    accessorKey: 'promoterUsername',
    header: () => (
      <div className="flex items-center gap-2">
        <User className="h-4 w-4" />
        推广员
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-3 w-3 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate text-sm">{row.original.promoterUsername ?? '-'}</div>
        </div>
      </div>
    ),
  })

  // 商品列
  columns.push({
    accessorKey: 'productName',
    header: () => (
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4" />
        商品
      </div>
    ),
    cell: ({ row }) => (
      <div className="max-w-60 truncate text-sm" title={row.original.productName ?? undefined}>
        {row.original.productName ?? '-'}
      </div>
    ),
  })

  // 状态列
  columns.push({
    accessorKey: 'status',
    header: () => (
      <div className="flex items-center justify-center gap-2">
        <FileCheck className="h-4 w-4" />
        状态
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        {getCommissionStatusBadge(row.original.status)}
        {row.original.settlementId && (
          <div className="text-xs text-muted-foreground mt-0.5">已结算</div>
        )}
      </div>
    ),
  })

  // 佣金金额列
  columns.push({
    accessorKey: 'commissionAmount',
    header: () => (
      <div className="flex items-center justify-end gap-2">
        <DollarSign className="h-4 w-4" />
        佣金金额
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right">
        <div className="font-mono font-semibold text-success">
          ¥{Number(row.original.commissionAmount).toFixed(2)}
        </div>
        <div className="text-xs text-muted-foreground">
          比例 {Number(row.original.rate) * 100}%
        </div>
      </div>
    ),
  })

  // 创建时间列
  columns.push({
    accessorKey: 'createdAt',
    header: () => (
      <div className="flex items-center gap-2">
        <FileCheck className="h-4 w-4" />
        创建时间
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {formatDateTime(row.original.createdAt)}
      </div>
    ),
  })

  return columns
}
