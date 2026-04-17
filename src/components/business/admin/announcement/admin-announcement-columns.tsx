'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react'
import type { Announcement } from '@/contracts/dtos/admin/site-config.dto'

interface AnnouncementColumnsProps {
  onEdit: (announcement: Announcement) => void
  onDelete: (announcement: Announcement) => void
  onView: (announcement: Announcement) => void
}

/**
 * Function: getAdminAnnouncementColumns
 *
 * Description: 生成公告表格列定义
 *
 * Parameters:
 *     props(AnnouncementColumnsProps): 列操作回调
 *
 * Returns:
 *     columns(ColumnDef<Announcement>[]): TanStack Table 列定义
 */
export function getAdminAnnouncementColumns({
  onEdit,
  onDelete,
  onView,
}: AnnouncementColumnsProps): ColumnDef<Announcement>[] {
  return [
    {
      accessorKey: 'title',
      header: '公告标题',
      cell: ({ row }) => {
        return (
          <div className="font-medium">{row.getValue('title')}</div>
        )
      },
    },
    {
      accessorKey: 'type',
      header: '类型',
      cell: ({ row }) => {
        const type = row.getValue('type') as string
        const typeMap: Record<
          string,
          { label: string; variant: 'default' | 'secondary' | 'outline' }
        > = {
          NOTICE: { label: '通知', variant: 'default' },
          ACTIVITY: { label: '活动', variant: 'secondary' },
          MAINTENANCE: { label: '维护', variant: 'outline' },
        }
        const config = typeMap[type] || { label: type, variant: 'default' }
        return <Badge variant={config.variant}>{config.label}</Badge>
      },
    },
    {
      accessorKey: 'isActive',
      header: '状态',
      cell: ({ row }) => {
        const isActive = row.getValue('isActive') as boolean
        return (
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? '已启用' : '已禁用'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'priority',
      header: '优先级',
      cell: ({ row }) => {
        return <span className="text-sm">{row.getValue('priority') as number}</span>
      },
    },
    {
      accessorKey: 'startAt',
      header: '生效时间',
      cell: ({ row }) => {
        const startAt = row.getValue('startAt') as string | null
        return startAt ? new Date(startAt).toLocaleDateString('zh-CN') : '-'
      },
    },
    {
      accessorKey: 'endAt',
      header: '失效时间',
      cell: ({ row }) => {
        const endAt = row.getValue('endAt') as string | null
        return endAt ? new Date(endAt).toLocaleDateString('zh-CN') : '-'
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const announcement = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="right">
              <DropdownMenuItem onClick={() => onView(announcement)}>
                <Eye className="h-4 w-4 mr-2" />
                查看
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(announcement)}>
                <Pencil className="h-4 w-4 mr-2" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(announcement)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
