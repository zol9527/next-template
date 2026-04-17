/**
 * Page: AdminSiteConfigPage
 *
 * Description: 站点配置管理页面，使用服务端组件渲染页面结构
 */

import { AdminSiteConfigForm } from '@/components/business/admin/site-config/admin-site-config-form'

export default function AdminSiteConfigPage() {
  return (
    <div className="flex flex-col h-full gap-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          {/* <h1 className="text-2xl font-bold tracking-tight">站点配置</h1> */}
          <p className="text-sm text-muted-foreground">管理站点基础信息、联系方式与备案信息</p>
        </div>
      </div>

      {/* 表单内容 */}
      <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
        <AdminSiteConfigForm />
      </div>
    </div>
  )
}
