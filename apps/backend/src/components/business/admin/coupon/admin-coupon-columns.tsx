'use client'

import { Tag, Calendar, Users, Edit, Trash2 } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { CopyCell } from '@/components/ui/data-table/copy-cell'
import { Button } from '@/components/ui/button'
import type { Coupon } from '@/plugins/ecommerce/contracts/coupons.dto'

// 优惠券类型配置（使用 variant，因为类型不是状态）
const couponTypeConfig: Record<string, { label: string; variant: 'info' | 'success' | 'warning' | 'error' }> = {
  discount: { label: '折扣券', variant: 'info' },
  fixed_amount: { label: '固定金额券', variant: 'success' },
  threshold: { label: '满减券', variant: 'warning' },
  gift: { label: '赠品券', variant: 'error' },
}

// 优惠券状态配置
const couponStatusConfig: Record<string, { label: string; status: 'draft' | 'scheduled' | 'active' | 'paused' | 'expired' | 'disabled' }> = {
  draft: { label: '草稿', status: 'draft' },
  scheduled: { label: '待生效', status: 'scheduled' },
  active: { label: '生效中', status: 'active' },
  paused: { label: '已暂停', status: 'paused' },
  expired: { label: '已过期', status: 'expired' },
  disabled: { label: '已禁用', status: 'disabled' },
}

/**
Function: getCouponTypeBadge

Description: 根据优惠券类型返回对应的类型徽章

Parameters:
    type(string): 优惠券类型

Returns:
    element(React.ReactElement): 类型徽章组件
*/
function getCouponTypeBadge(type: string) {
  const config = couponTypeConfig[type] || { label: type, variant: 'neutral' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

/**
Function: getCouponStatusBadge

Description: 根据优惠券状态返回对应的状态徽章

Parameters:
    status(string): 优惠券状态

Returns:
    element(React.ReactElement): 状态徽章组件
*/
function getCouponStatusBadge(status: string) {
  const config = couponStatusConfig[status] || { label: status, status: 'draft' as const }
  return <Badge status={config.status}>{config.label}</Badge>
}

interface CouponColumnsProps {
  onEdit?: (couponId: string) => void
  onDelete?: (couponId: string) => void
}

/**
Function: getCouponColumns

Description: 生成优惠券列表表格列定义

Parameters:
    onEdit(function): 编辑优惠券的回调
    onDelete(function): 删除优惠券的回调

Returns:
    columns(ColumnDef<Coupon>[]): TanStack Table 列定义
*/
export function getCouponColumns({
  onEdit,
  onDelete,
}: CouponColumnsProps = {}): ColumnDef<Coupon>[] {
  const columns: ColumnDef<Coupon>[] = []

  // 优惠券 ID 列
  columns.push({
    accessorKey: 'id',
    header: () => (
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4" />
        优惠券 ID
      </div>
    ),
    cell: ({ row }) => (
      <CopyCell value={row.original.id} label="优惠券 ID" />
    ),
  })

  // 优惠券名称列
  columns.push({
    accessorKey: 'name',
    header: () => (
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4" />
        名称
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium truncate max-w-60">{row.original.name}</span>
        {row.original.description && (
          <span className="text-xs text-muted-foreground truncate max-w-60">{row.original.description}</span>
        )}
      </div>
    ),
  })

  // 类型列
  columns.push({
    accessorKey: 'type',
    header: () => '类型',
    cell: ({ row }) => getCouponTypeBadge(row.original.type),
  })

  // 状态列
  columns.push({
    accessorKey: 'status',
    header: () => (
      <div className="flex items-center justify-center gap-2">
        状态
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        {getCouponStatusBadge(row.original.status)}
      </div>
    ),
  })

  // 使用限制列
  columns.push({
    accessorKey: 'usage',
    header: () => (
      <div className="flex items-center justify-center gap-2">
        <Users className="h-4 w-4" />
        使用情况
      </div>
    ),
    cell: ({ row }) => {
      const used = row.original.usedCount ?? 0
      const limit = row.original.usageLimit
      return (
        <div className="text-center font-mono text-sm">
          {used}{limit !== null && limit !== undefined ? `/${limit}` : ''}
          {limit === null || limit === undefined ? <span className="text-muted-foreground ml-1">∞</span> : ''}
        </div>
      )
    },
  })

  // 有效期列
  columns.push({
    accessorKey: 'validPeriod',
    header: () => (
      <div className="flex items-center justify-center gap-2">
        <Calendar className="h-4 w-4" />
        有效期
      </div>
    ),
    cell: ({ row }) => {
      const validFrom = row.original.validFrom ? new Date(row.original.validFrom).toLocaleDateString() : '-'
      const validTo = row.original.validTo ? new Date(row.original.validTo).toLocaleDateString() : '-'
      return (
        <div className="text-center text-sm">
          <div>{validFrom}</div>
          <div className="text-muted-foreground">至 {validTo}</div>
        </div>
      )
    },
  })

  // 创建时间列
  columns.push({
    accessorKey: 'createdAt',
    header: () => '创建时间',
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {row.original.createdAt ? new Date(row.original.createdAt).toLocaleString() : '-'}
      </div>
    ),
  })

  // 操作列
  columns.push({
    id: 'actions',
    header: () => <div className="text-right">操作</div>,
    cell: ({ row }) => (
      <div className="flex justify-end items-center gap-1.5">
        {onEdit && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-8 w-8 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-safe:transition-all motion-safe:duration-200"
            onClick={() => onEdit(row.original.id)}
            aria-label={`编辑 ${row.original.name}`}
            title="编辑"
          >
            <Edit className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}

        {onDelete && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 motion-safe:transition-all motion-safe:duration-200"
            onClick={() => onDelete(row.original.id)}
            aria-label={`删除 ${row.original.name}`}
            title="删除"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>
    ),
  })

  return columns
}
