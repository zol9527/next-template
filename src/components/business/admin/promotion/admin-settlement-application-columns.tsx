'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { AdminSettlementApplication } from '@/plugins/promotion/contracts/settlement-applications.dto'

interface AdminSettlementApplicationColumnsProps {
  onApprove?: (item: AdminSettlementApplication) => void
  onReject?: (item: AdminSettlementApplication) => void
}

/**
 * Function: getAdminSettlementApplicationColumns
 *
 * Description: 创建提现申请表格列配置
 *
 * Parameters:
 * 	props(onApprove): 审核通过回调
 * 	props(onReject): 审核拒绝回调
 *
 * Returns:
 * 	(columns: ColumnDef<AdminSettlementApplication>[]): 表格列配置
 */
export function getAdminSettlementApplicationColumns(
  props: AdminSettlementApplicationColumnsProps = {}
): ColumnDef<AdminSettlementApplication>[] {
  const { onApprove, onReject } = props

  return [
    {
      accessorKey: 'promoterUserId',
      header: '申请人 ID',
      cell: ({ row }) => (
        <span className="text-xs font-mono">{row.original.promoterUserId}</span>
      ),
    },
    {
      accessorKey: 'amount',
      header: '金额',
      cell: ({ row }) => (
        <span>¥{Number(row.original.amount).toFixed(2)}</span>
      ),
    },
    {
      accessorKey: 'paymentMethod',
      header: '支付方式',
      cell: ({ row }) => (
        <span className="text-xs">{row.original.paymentMethod}</span>
      ),
    },
    {
      accessorKey: 'paymentAccount',
      header: '账号',
      cell: ({ row }) => (
        <span className="text-xs">{row.original.paymentAccount || '-'}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.status === 'pending' ? 'outline' :
            (row.original.status === 'approved' || row.original.status === 'paid') ? 'default' :
            'destructive'
          }
        >
          {row.original.status === 'pending' ? '待审核' :
           row.original.status === 'approved' ? '已通过' :
           row.original.status === 'paid' ? '已打款' : '已拒绝'}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: '申请时间',
      cell: ({ row }) => (
        <span className="text-xs">{row.original.createdAt}</span>
      ),
    },
    {
      accessorKey: 'rejectionReason',
      header: '备注',
      cell: ({ row }) => (
        <span className="text-xs max-w-50 truncate">{row.original.rejectionReason || '-'}</span>
      ),
    },
    {
      accessorKey: 'actions',
      header: '操作',
      cell: ({ row }) => {
        if (row.original.status !== 'pending') return null

        return (
          <div className="flex items-center gap-2 justify-end">
            <Button size="sm" onClick={() => onApprove?.(row.original)}>通过</Button>
            <Button variant="destructive" size="sm" onClick={() => onReject?.(row.original)}>拒绝</Button>
          </div>
        )
      },
    },
  ] as ColumnDef<AdminSettlementApplication>[]
}

import type { ColumnDef } from '@tanstack/react-table'
