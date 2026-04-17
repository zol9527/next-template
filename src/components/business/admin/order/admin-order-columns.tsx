'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { AdminOrder } from '@/plugins/ecommerce/contracts/admin-orders.dto'

interface OrderColumnsProps {
  onViewDetail: (orderId: string) => void
  onCompleteOrder: (orderId: string) => void
  onRefundOrder: (orderId: string, maxAmount: string, status: string) => void
}

/**
Function: getOrderStatusBadge

Description: 根据订单状态返回对应的状态徽章

Parameters:
    status(string): 订单状态

Returns:
    element(React.ReactElement): 状态徽章组件
*/
function getOrderStatusBadge(status: string) {
  switch (status) {
    case 'paid':
      return <Badge variant="success">已支付</Badge>
    case 'completed':
      return <Badge variant="secondary">已完成</Badge>
    case 'pending_payment':
      return <Badge variant="outline">待支付</Badge>
    case 'refunding':
      return <Badge variant="outline">退款中</Badge>
    case 'refunded':
      return <Badge variant="outline">已退款</Badge>
    case 'cancelled':
      return <Badge variant="outline">已取消</Badge>
    case 'closed':
      return <Badge variant="outline">已关闭</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

/**
Function: getOrderColumns

Description: 生成订单列表表格列定义

Parameters:
    onViewDetail(function): 查看订单详情的回调
    onCompleteOrder(function): 确认完成订单的回调
    onRefundOrder(function): 发起退款的回调

Returns:
    columns(ColumnDef<AdminOrder>[]): TanStack Table 列定义
*/
export function getOrderColumns({
  onViewDetail,
  onCompleteOrder,
  onRefundOrder,
}: OrderColumnsProps): ColumnDef<AdminOrder>[] {
  return [
    {
      accessorKey: 'orderNo',
      header: () => '订单号',
      size: 260,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="truncate max-w-60">{row.original.orderNo}</span>
          <span className="text-[10px] text-foreground/50 font-normal mt-0.5 font-mono">{row.original.id}</span>
        </div>
      ),
    },
    {
      accessorKey: 'productName',
      header: () => '商品',
      size: 200,
      cell: ({ row }) => (
        <div className="truncate max-w-48">{row.original.productName ?? '-'}</div>
      ),
    },
    {
      accessorKey: 'userUsername',
      header: () => '用户',
      size: 200,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="truncate max-w-48">{row.original.userUsername ?? '-'}</span>
          <span className="text-[10px] text-foreground/50 font-normal mt-0.5">{row.original.userPhone ?? '-'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: () => '状态',
      size: 100,
      cell: ({ row }) => getOrderStatusBadge(row.original.status),
    },
    {
      accessorKey: 'priceAmount',
      header: () => '金额',
      size: 120,
      cell: ({ row }) => (
        <span className="font-mono">
          {row.original.priceAmount} {row.original.currencyCode}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: () => '创建时间',
      size: 160,
      cell: ({ row }) => (
        <span className="text-xs text-foreground/70">{row.original.createdAt}</span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">操作</div>,
      size: 240,
      cell: ({ row }) => {
        const order = row.original
        return (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onViewDetail(order.id)}
            >
              <Eye className="h-4 w-4 mr-1" />
              查看
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={order.status !== 'paid'}
              onClick={() => onCompleteOrder(order.id)}
            >
              确认完成
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={order.status !== 'paid' && order.status !== 'completed'}
              onClick={() => onRefundOrder(
                order.id,
                (Number(order.paidAmount || order.priceAmount) - Number(order.refundedAmount || 0)).toFixed(2),
                order.status,
              )}
            >
              退款
            </Button>
          </div>
        )
      },
    },
  ]
}
