'use client'

import { ShoppingCart, User, Package, DollarSign, FileCheck, Receipt, Check } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTableCheckbox } from '@/components/ui/data-table/checkbox'
import { CopyCell } from '@/components/ui/data-table/copy-cell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils/date'
import type { AdminOrderSettlementViewItem } from '@/plugins/ecommerce/contracts/order-settlement-view.dto'

interface OrderSettlementColumnsProps {
  onSettle?: (commissionId: string) => void
  canSettle?: (item: AdminOrderSettlementViewItem) => boolean
}

/**
 * 佣金状态 Badge
 */
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

/**
 * 结算申请状态 Badge
 */
function getApplicationStatusBadge(status: string | null) {
  if (!status) {
    return <Badge variant="secondary">无申请</Badge>
  }

  const config: Record<string, { label: string; status: 'pending' | 'approved' | 'rejected' | 'paid' }> = {
    pending: { label: '待审核', status: 'pending' },
    approved: { label: '已通过', status: 'approved' },
    rejected: { label: '已拒绝', status: 'rejected' },
    paid: { label: '已打款', status: 'paid' },
  }
  const item = config[status] || { label: status, status: 'pending' as const }
  return <Badge status={item.status}>{item.label}</Badge>
}

/**
Function: getOrderSettlementColumns

Description: 生成订单结算视图表格列定义

Parameters:
    props(OrderSettlementColumnsProps): 列配置参数
    - onSettle: 单个结算回调函数
    - canSettle: 判断是否可结算的函数

Returns:
    columns(ColumnDef<AdminOrderSettlementViewItem>[]): TanStack Table 列定义
*/
export function getOrderSettlementColumns(props: OrderSettlementColumnsProps = {}): ColumnDef<AdminOrderSettlementViewItem>[] {
  const { onSettle, canSettle } = props

  const columns: ColumnDef<AdminOrderSettlementViewItem>[] = []

  // 隐藏的 ID 列（用于行选择）
  columns.push({
    accessorKey: 'commissionId',
    header: 'ID',
    cell: () => null,
    enableHiding: true,
  })

  // 复选框列
  if (onSettle) {
    columns.push({
      id: 'select',
      header: ({ table }) => (
        <DataTableCheckbox
          checked={table.getIsAllPageRowsSelected()}
          onChange={(checked) => table.toggleAllPageRowsSelected(checked === true)}
          ariaLabel="全选"
        />
      ),
      cell: ({ row }) => {
        const item = row.original
        const isSelected = row.getIsSelected()
        const canSettleItem = canSettle ? canSettle(item) : item.commissionStatus === 'payable'

        const handleCheckedChange = (checked: boolean) => {
          if (!canSettleItem) return
          row.toggleSelected(checked)
        }

        return (
          <DataTableCheckbox
            checked={isSelected}
            onChange={handleCheckedChange}
            disabled={!canSettleItem}
            ariaLabel={`选择 ${item.orderNo || item.orderId}`}
          />
        )
      },
      enableSorting: false,
      enableHiding: false,
    })
  }
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
      <CopyCell value={row.original.orderNo || row.original.orderId} label="订单号" />
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
      <div className="max-w-50 truncate text-sm" title={row.original.productName ?? undefined}>
        {row.original.productName ?? '-'}
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

  // 佣金状态列
  columns.push({
    accessorKey: 'commissionStatus',
    header: () => (
      <div className="flex items-center justify-center gap-2">
        <FileCheck className="h-4 w-4" />
        佣金状态
      </div>
    ),
    cell: ({ row }) => <div className="text-center">{getCommissionStatusBadge(row.original.commissionStatus)}</div>,
  })

  // 申请状态列
  columns.push({
    accessorKey: 'applicationStatus',
    header: () => (
      <div className="flex items-center justify-center gap-2">
        <Receipt className="h-4 w-4" />
        申请状态
      </div>
    ),
    cell: ({ row }) => {
      // 已结算的不显示申请状态
      if (row.original.commissionStatus === 'settled') {
        return <div className="text-center text-muted-foreground text-sm">-</div>
      }
      return <div className="text-center">{getApplicationStatusBadge(row.original.applicationStatus)}</div>
    },
  })

  // 结算状态列
  columns.push({
    accessorKey: 'settlementId',
    header: () => '结算状态',
    cell: ({ row }) => {
      if (row.original.commissionStatus === 'settled') {
        return <div className="text-center text-sm">已结算</div>
      }
      return <div className="text-center text-muted-foreground text-sm">-</div>
    },
  })

  // 创建时间列
  columns.push({
    accessorKey: 'commissionCreatedAt',
    header: () => '创建时间',
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">{formatDateTime(row.original.commissionCreatedAt)}</div>
    ),
  })

  // 操作列（仅在传入 onSettle 回调时显示）
  if (onSettle) {
    columns.push({
      id: 'actions',
      header: '操作',
      cell: ({ row }) => {
        const item = row.original
        const canSettleItem = canSettle ? canSettle(item) : item.commissionStatus === 'payable'

        return (
          <Button
            type="button"
            size="sm"
            variant={canSettleItem ? 'solid' : 'ghost'}
            disabled={!canSettleItem}
            onClick={() => onSettle?.(item.commissionId)}
            className={cn(
              'h-8 px-3',
              canSettleItem && 'bg-primary hover:bg-primary/90 text-primary-foreground'
            )}
          >
            {canSettleItem ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1" />
                完成结算
              </>
            ) : (
              '-'
            )}
          </Button>
        )
      },
    })
  }

  return columns
}
