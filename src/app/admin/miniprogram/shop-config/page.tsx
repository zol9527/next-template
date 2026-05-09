'use client'

import { MiniprogramShopConfigForm } from '@/components/business/admin/miniprogram/shop-config-form'

/**
 * Function: AdminMiniprogramShopConfigPage
 *
 * Description: 商城 VIP Banner 配置管理页面
 * 管理小程序商城页面的 VIP Banner 展示内容和跳转链接
 */
export default function AdminMiniprogramShopConfigPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">商城设置</h2>
        <p className="text-muted-foreground mt-1">
          管理微信小程序商城页面的 VIP Banner 展示内容与跳转配置
        </p>
      </div>
      <MiniprogramShopConfigForm />
    </div>
  )
}
