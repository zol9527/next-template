'use client'

import { MiniprogramHomeConfigForm } from '@/components/business/admin/miniprogram/home-config-form'

/**
 * Function: AdminMiniprogramHomeConfigPage
 *
 * Description: 首页 Banner 配置管理页面
 * 管理小程序首页的 Banner 展示内容和跳转链接
 */
export default function AdminMiniprogramHomeConfigPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">首页设置</h2>
        <p className="text-muted-foreground mt-1">
          管理微信小程序首页的 Banner 展示内容与跳转配置
        </p>
      </div>
      <MiniprogramHomeConfigForm />
    </div>
  )
}
