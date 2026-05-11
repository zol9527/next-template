'use client'

/**
 * 通知管理 - 编辑通知页面
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Bell, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminNotificationForm } from '@/components/business/admin/notification/admin-notification-form-page'

interface EditNotificationPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditNotificationPage({ params }: EditNotificationPageProps) {
  const router = useRouter()
  const { id } = React.use(params)

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* 页面头部 */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/admin/notifications')}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 text-primary p-3">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">编辑通知</h1>
            <p className="text-sm text-muted-foreground">修改通知信息</p>
          </div>
        </div>
      </div>

      {/* 表单区域 */}
      <AdminNotificationForm
        notificationId={id}
        mode="edit"
        onSaved={() => router.push('/admin/notifications')}
        onCancel={() => router.push('/admin/notifications')}
      />
    </div>
  )
}
