'use client'

/**
 * 公告管理 - 创建公告页面
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Bell, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminAnnouncementForm } from '@/components/business/admin/announcement/admin-announcement-form-page'

export default function CreateAnnouncementPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* 页面头部 */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/admin/announcements')}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 text-primary p-3">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">创建公告</h1>
            <p className="text-sm text-muted-foreground">填写公告信息，支持富文本编辑</p>
          </div>
        </div>
      </div>

      {/* 表单区域 */}
      <AdminAnnouncementForm
        mode="create"
        onSaved={() => router.push('/admin/announcements')}
        onCancel={() => router.push('/admin/announcements')}
      />
    </div>
  )
}
