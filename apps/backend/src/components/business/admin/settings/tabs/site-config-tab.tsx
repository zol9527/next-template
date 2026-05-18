'use client'

import * as React from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AdminSiteConfigForm } from '@/components/business/admin/site-config/admin-site-config-form'

/**
 * Component: SiteConfigTab
 *
 * Description: 站点配置 Tab 面板
 * 复用现有的 AdminSiteConfigForm 组件
 * 表单内部自带保存逻辑和保存按钮
 */
export function SiteConfigTab() {
  return (
    <ScrollArea className="flex-1 min-h-0 bg-transparent">
      <div className="pr-2">
        <AdminSiteConfigForm />
      </div>
    </ScrollArea>
  )
}
