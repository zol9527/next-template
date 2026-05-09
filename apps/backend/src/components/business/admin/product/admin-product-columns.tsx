'use client'

import { Package, Tag, DollarSign, Box } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { CopyCell } from '@/components/ui/data-table/copy-cell'
import { Button } from '@/components/ui/button'
import { Edit, Eye, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import type { AdminProduct } from '@/plugins/ecommerce/contracts/admin-products.dto'

/**
Function: getProductStatusBadge

Description: 根据商品状态返回对应的状态徽章

Parameters:
    status(string): 商品状态

Returns:
    element(React.ReactElement): 状态徽章组件
*/
function getProductStatusBadge(status: string) {
  const config: Record<string, { label: string; status: 'published' | 'draft' | 'unpublished' | 'archived' }> = {
    published: { label: '已上架', status: 'published' },
    draft: { label: '草稿', status: 'draft' },
    unpublished: { label: '已下架', status: 'unpublished' },
    archived: { label: '已归档', status: 'archived' },
  }
  const item = config[status] || { label: status, status: 'draft' as const }
  return <Badge status={item.status}>{item.label}</Badge>
}

interface ProductColumnsProps {
  onSelect?: (productId: string) => void
  onView?: (productId: string) => void
  onPublish?: (productId: string) => void
  onUnpublish?: (productId: string) => void
}

/**
Function: getProductColumns

Description: 生成商品列表表格列定义

Parameters:
    onSelect(function): 选择商品进入编辑的回调
    onView(function): 选择商品进入查看的回调
    onPublish(function): 上架商品的回调
    onUnpublish(function): 下架商品的回调

Returns:
    columns(ColumnDef<AdminProduct>[]): TanStack Table 列定义
*/
export function getProductColumns({
  onSelect,
  onView,
  onPublish,
  onUnpublish,
}: ProductColumnsProps = {}): ColumnDef<AdminProduct>[] {
  const columns: ColumnDef<AdminProduct>[] = []

  // 复选框列 - 用于批量选择
  columns.push({
    id: 'select',
    header: ({ table }) => (
      <div className="flex items-center justify-center h-full">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="全选"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center h-full">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="选择行"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 48, // 设置列宽
  })

  // 商品缩略图列已移除 - 节省空间

  // 商品 ID 列
  columns.push({
    accessorKey: 'id',
    header: () => (
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4" />
        商品 ID
      </div>
    ),
    cell: ({ row }) => (
      <CopyCell value={row.original.id} label="商品 ID" />
    ),
  })

  // 商品名称列
  columns.push({
    accessorKey: 'name',
    header: () => (
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4" />
        名称
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate max-w-60">{row.original.name}</span>
          {row.original.isFeatured && <Badge variant="secondary">精选</Badge>}
        </div>
        <span className="text-xs text-muted-foreground">{row.original.slug}</span>
      </div>
    ),
  })

  // 类型列
  columns.push({
    accessorKey: 'kind',
    header: () => '类型',
    cell: ({ row }) => (
      <Badge variant="default" className="capitalize">
        {row.original.kind === 'course' ? '课程' : '证书'}
      </Badge>
    ),
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
        {getProductStatusBadge(row.original.status)}
      </div>
    ),
  })

  // 价格列
  columns.push({
    accessorKey: 'price',
    header: () => (
      <div className="flex items-center justify-end gap-2">
        <DollarSign className="h-4 w-4" />
        价格
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right">
        <div className="font-mono font-semibold">
          {row.original.price.amount} {row.original.price.currencyCode}
        </div>
        {row.original.originalPrice && (
          <div className="text-xs text-muted-foreground line-through">
            {row.original.originalPrice.amount} {row.original.originalPrice.currencyCode}
          </div>
        )}
      </div>
    ),
  })

  // 库存列
  columns.push({
    accessorKey: 'stockQuantity',
    header: () => (
      <div className="flex items-center justify-end gap-2">
        <Box className="h-4 w-4" />
        库存
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right font-mono">
        {row.original.stockQuantity === null ? '∞' : String(row.original.stockQuantity)}
      </div>
    ),
  })

  // 标签列
  columns.push({
    accessorKey: 'tags',
    header: () => '标签',
    cell: ({ row }) => {
      const tags = row.original.tags ?? []
      return (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 2).map((t) => (
            <Badge key={t} variant="default">
              {t}
            </Badge>
          ))}
          {tags.length > 2 && (
            <Badge variant="default">+{tags.length - 2}</Badge>
          )}
        </div>
      )
    },
  })

  // 操作列
  columns.push({
    id: 'actions',
    header: () => <div className="text-right">操作</div>,
    cell: ({ row }) => (
      <div className="flex justify-end items-center gap-1.5">
        {onView && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 transition-all duration-200 hover:scale-105 active:scale-95"
            onClick={() => onView(row.original.id)}
            title="查看"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )}

        {onSelect && (
          <Button
            type="button"
            variant="solid"
            size="icon"
            className="h-8 w-8 transition-all duration-200 hover:scale-105 active:scale-95"
            onClick={() => onSelect(row.original.id)}
            title="编辑"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
        )}

        {row.original.status === 'published' ? (
          onUnpublish && (
            <Button
              type="button"
              variant="solid"
              color="warning"
              size="icon"
              className="h-8 w-8 transition-all duration-200 hover:scale-105 active:scale-95"
              onClick={() => onUnpublish(row.original.id)}
              title="下架"
            >
              <ArrowDownCircle className="h-3.5 w-3.5" />
            </Button>
          )
        ) : (
          onPublish && (
            <Button
              type="button"
              variant="solid"
              color="success"
              size="icon"
              className="h-8 w-8 transition-all duration-200 hover:scale-105 active:scale-95"
              onClick={() => onPublish(row.original.id)}
              title="上架"
            >
              <ArrowUpCircle className="h-3.5 w-3.5" />
            </Button>
          )
        )}
      </div>
    ),
  })

  return columns
}
