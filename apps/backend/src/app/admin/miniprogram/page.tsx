import { notFound, redirect } from 'next/navigation'
import { isPluginEnabled } from '@/plugins/registry'

/**
 * Function: AdminMiniprogramPage
 *
 * Description: 微信小程序管理入口页，自动重定向到轮播图管理
 * 访问 /admin/miniprogram 时直接跳转到默认功能模块
 */
export default function AdminMiniprogramPage() {
  if (!isPluginEnabled('wechat')) {
    notFound()
  }

  redirect('/admin/miniprogram/carousels')
}
