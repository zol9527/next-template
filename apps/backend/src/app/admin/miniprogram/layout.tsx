import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { isPluginEnabled } from '@/plugins/registry'
import { MiniprogramSubSidebar } from '@/components/business/admin/miniprogram/miniprogram-sub-sidebar'

/**
 * Component: MiniprogramLayout
 *
 * Description: 微信小程序管理的子路由布局
 * 左侧为功能模块子侧边栏，右侧为主内容区域
 * 包含 wechat 插件启用守卫，未启用时返回 404
 *
 * Parameters:
 *     children(ReactNode): 子路由页面内容
 *
 * Returns:
 *     React.ReactElement: 子侧边栏 + 内容区的弹性布局
 */
export default function MiniprogramLayout({ children }: { children: ReactNode }) {
  // 插件守卫：wechat 插件未启用时返回 404
  if (!isPluginEnabled('wechat')) {
    notFound()
  }

  return (
    <div className="flex h-full -m-4">
      <MiniprogramSubSidebar />
      <div className="flex-1 overflow-auto p-6">
        {children}
      </div>
    </div>
  )
}
