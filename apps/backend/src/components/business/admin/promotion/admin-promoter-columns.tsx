'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Award } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AdminPromoterListItem } from '@/plugins/promotion/contracts/admin-promoters.dto'

/**
Function: getPromoterColumns

Description: 生成推广员列表表格列定义

Parameters:
    onViewDetail(function): 查看详情回调
    onAdjustLevel(function): 调整等级回调

Returns:
    columns(ColumnDef<AdminPromoterListItem>[]): TanStack Table 列定义
*/
export function getPromoterColumns({
  onViewDetail,
  onAdjustLevel,
}: {
  onViewDetail?: (promoter: AdminPromoterListItem) => void
  onAdjustLevel?: (promoter: AdminPromoterListItem) => void
} = {}): ColumnDef<AdminPromoterListItem>[] {
  return [
    {
      accessorKey: 'username',
      header: '推广员',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-semibold">
            {row.original.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="font-medium">{row.original.username || '未设置用户名'}</div>
            <div className="text-[10px] text-foreground/50 font-mono">
              {row.original.userId.slice(0, 8)}...
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'currentLevel',
      header: '等级',
      cell: ({ row }) => getLevelBadge(row.original.currentLevel),
    },
    {
      accessorKey: 'totalOrders',
      header: '业绩',
      cell: ({ row }) => (
        <div className="text-sm space-y-0.5">
          <div className="text-foreground/70">
            <span className="font-mono">{row.original.totalOrders}</span> 单
          </div>
          <div className="text-foreground/70">
            ¥<span className="font-mono">{row.original.totalSalesAmount}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'subPromoterCount',
      header: '下级',
      cell: ({ row }) => (
        <span className="text-sm text-foreground/70">{row.original.subPromoterCount} 人</span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="text-right">操作</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onViewDetail?.(row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAdjustLevel?.(row.original)}
          >
            <Award className="h-4 w-4" />
          </Button>
        </div>
      ),
      enableSorting: false,
    },
  ]
}

/**
Function: getLevelBadge

Description: 根据等级返回对应的 Badge 组件

Parameters:
    level({ name: string; level: number }): 等级信息

Returns:
    element(React.ReactElement): Badge 组件
*/
function getLevelBadge(level: { name: string; level: number }) {
  const colors: Record<number, string> = {
    1: 'bg-muted/30 text-muted-foreground border-muted',
    2: 'bg-info/20 text-info-foreground border-info/30',
    3: 'bg-warning/20 text-warning-foreground border-warning/30',
    4: 'bg-primary/20 text-primary-foreground border-primary/30',
  }
  const colorClass = colors[level.level] || colors[1]
  return (
    <Badge variant="outline" className={cn(colorClass, 'border')}>
      {level.name}
    </Badge>
  )
}
