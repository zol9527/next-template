'use client'

/**
 * 通知管理页面
 * 使用独立页面布局替代 Modal 对话框
 */

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search } from 'lucide-react'
import { getAdminNotificationColumns } from '@/components/business/admin/notification/admin-notification-columns'
import type { AdminNotification } from '@/components/business/admin/notification/admin-notification-columns'
import { DataTable } from '@/components/ui/data-table'
import { AdminPageLayout } from '@/components/ui/admin-page-layout'
import { AdminPageHeader } from '@/components/ui/admin-page-header'
import { AdminFilterBar } from '@/components/ui/admin-filter-bar'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast'
import type { ApiResponse } from '@/contracts/api-response.schema'

export default function AdminNotificationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [search, setSearch] = React.useState('')

  // 获取通知列表
  const { data } = useQuery<{
    items: AdminNotification[]
    nextCursor: string | null
  }>({
    queryKey: ['admin', 'notifications'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/notifications', {
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`)
      const json = (await res.json()) as ApiResponse<{
        items: AdminNotification[]
        nextCursor: string | null
      }>
      if (!json.success) throw new Error(json.error.message)
      return json.data
    },
  })

  // 删除 Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/admin/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`Failed to delete: ${res.statusText}`)
      const json = (await res.json()) as ApiResponse<unknown>
      if (!json.success) throw new Error(json.error.message)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] })
      toast({ title: '删除成功', variant: 'default' })
    },
    onError: (error: Error) => {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' })
    },
  })

  // 路由跳转到编辑/查看页面
  const handleEdit = (notification: AdminNotification) => {
    router.push(`/admin/notifications/${notification.id}/edit`)
  }

  const handleView = (notification: AdminNotification) => {
    router.push(`/admin/notifications/${notification.id}`)
  }

  const handleDelete = (notification: AdminNotification) => {
    if (confirm(`确定要删除通知 "${notification.title}" 吗？`)) {
      deleteMutation.mutate(notification.id)
    }
  }

  const columns = getAdminNotificationColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
    onView: handleView,
  })

  const notifications = data?.items ?? []
  const filteredNotifications = search
    ? notifications.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()))
    : notifications

  return (
    <>
      <AdminPageHeader
        title="通知中心"
        description="管理站点的通知信息"
      />
      <AdminPageLayout>
        {/* 搜索工具栏 */}
        <AdminFilterBar>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索通知标题..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 bg-muted/5 border-border/10"
          />
        </div>
      </AdminFilterBar>

      {/* 数据表格 */}
      <DataTable
        columns={columns}
        data={filteredNotifications}
      />
    </AdminPageLayout>
    </>
  )
}
