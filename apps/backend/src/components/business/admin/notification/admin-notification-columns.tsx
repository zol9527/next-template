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

/** 通知数据类型（与后端 API 响应对应） */
export interface AdminNotification {
  id: string
  title: string
  type: string
  summary: string | null
  content: string
  icon: string | null
  priority: number
  isActive: boolean
  isGlobal: boolean
  readCount: number
  createdAt: string
  updatedAt: string
}

interface NotificationColumnsProps {
  onEdit: (notification: AdminNotification) => void
  onDelete: (notification: AdminNotification) => void
  onView: (notification: AdminNotification) => void
}

/**
 * Function: getAdminNotificationColumns
 *
 * Description: 生成通知管理表格列定义
 *
 * Parameters:
 *     props(NotificationColumnsProps): 列操作回调
 *
 * Returns:
 *     columns(ColumnDef<AdminNotification>[]): TanStack Table 列定义
 */
export function getAdminNotificationColumns({
  onEdit,
  onDelete,
  onView,
}: NotificationColumnsProps): ColumnDef<AdminNotification>[] {
  return [
    {
      accessorKey: 'title',
      header: '标题',
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
          SYSTEM: { label: '系统通知', variant: 'default' },
          COURSE: { label: '课程通知', variant: 'secondary' },
          ACTIVITY: { label: '活动通知', variant: 'outline' },
          ORDER: { label: '订单通知', variant: 'outline' },
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
            {isActive ? '启用' : '禁用'}
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
      accessorKey: 'readCount',
      header: '已读数',
      cell: ({ row }) => {
        return <span className="text-sm">{row.getValue('readCount') as number}</span>
      },
    },
    {
      accessorKey: 'createdAt',
      header: '创建时间',
      cell: ({ row }) => {
        const createdAt = row.getValue('createdAt') as string
        return createdAt ? new Date(createdAt).toLocaleDateString('zh-CN') : '-'
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const notification = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="right">
              <DropdownMenuItem onClick={() => onView(notification)}>
                <Eye className="h-4 w-4 mr-2" />
                查看
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(notification)}>
                <Pencil className="h-4 w-4 mr-2" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(notification)}
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
