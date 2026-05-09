'use client'

/**
 * 日志管理页面
 * 仅超级管理员可访问
 */

import { LogViewer } from '@/components/business/admin/logs'
import { AdminPageLayout } from '@/components/ui/admin-page-layout'

export default function AdminLogsPage() {
  return (
    <AdminPageLayout>
      <LogViewer />
    </AdminPageLayout>
  )
}
