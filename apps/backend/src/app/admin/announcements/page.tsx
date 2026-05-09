'use client'

/**
 * 公告管理页面
 * 使用独立页面布局替代 Modal 对话框
 */

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search } from 'lucide-react'
import { getAdminAnnouncementColumns } from '@/components/business/admin/announcement/admin-announcement-columns'
import { DataTable } from '@/components/ui/data-table'
import { AdminPageLayout } from '@/components/ui/admin-page-layout'
import { AdminPageHeader } from '@/components/ui/admin-page-header'
import { AdminFilterBar } from '@/components/ui/admin-filter-bar'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { Announcement } from '@/contracts/dtos/admin/site-config.dto'
import { AnnouncementListResponseSchema } from '@/contracts/dtos/admin/site-config.dto'

export default function AdminAnnouncementsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [search, setSearch] = React.useState('')

  // 获取公告列表
  const { data } = useQuery<{
    items: Announcement[]
    nextCursor: string | null
  }>({
    queryKey: ['admin', 'announcements'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/announcements', {
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`)
      const json = (await res.json()) as ApiResponse<{
        items: Announcement[]
        nextCursor: string | null
      }>
      if (!json.success) throw new Error(json.error.message)

      // 验证响应数据
      const parsed = AnnouncementListResponseSchema.safeParse(json.data)
      if (!parsed.success) {
        throw new Error('Invalid response data')
      }

      return parsed.data
    },
  })

  // 删除 Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/admin/announcements/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`Failed to delete: ${res.statusText}`)
      const json = (await res.json()) as ApiResponse<unknown>
      if (!json.success) throw new Error(json.error.message)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] })
      toast({ title: '删除成功', variant: 'default' })
    },
    onError: (error: Error) => {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' })
    },
  })

  // 路由跳转到编辑/查看页面
  const handleEdit = (announcement: Announcement) => {
    router.push(`/admin/announcements/${announcement.id}/edit`)
  }

  const handleView = (announcement: Announcement) => {
    router.push(`/admin/announcements/${announcement.id}`)
  }

  const handleDelete = (announcement: Announcement) => {
    if (confirm(`确定要删除公告 "${announcement.title}" 吗？`)) {
      deleteMutation.mutate(announcement.id)
    }
  }

  const columns = getAdminAnnouncementColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
    onView: handleView,
  })

  const announcements = data?.items ?? []
  const filteredAnnouncements = search
    ? announcements.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()))
    : announcements

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="公告管理"
        description="管理站点的公告信息"
        actions={
          <Link href="/admin/announcements/create">
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              创建公告
            </Button>
          </Link>
        }
      />

      {/* 搜索工具栏 */}
      <AdminFilterBar>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索公告标题..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 bg-muted/5 border-border/10"
          />
        </div>
      </AdminFilterBar>

      {/* 数据表格 */}
      <DataTable
        columns={columns}
        data={filteredAnnouncements}
      />
    </AdminPageLayout>
  )
}
