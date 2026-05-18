import type { LucideIcon } from 'lucide-react'
import {
  LayoutGrid,
  Image as ImageIcon,
  FileText,
  Users,
  ShoppingCart,
  Bell,
  CalendarCheck,
  MessageSquare,
  Settings,
  Layers,
} from 'lucide-react'
import type { Action, Scope } from '@/config/access'

/**
 * Type: SidebarItem
 *
 * Description: 侧边栏菜单项类型（扁平列表，无分组）
 *
 * Properties:
 *     name(string): 菜单名称
 *     href(string): 路由链接
 *     icon(LucideIcon): 图标组件
 *     requiredAccess({ action: Action; scope: Scope }, optional): 结构化权限声明
 */
export interface SidebarItem {
  name: string
  href: string
  icon: LucideIcon
  requiredAccess?: { readonly action: Action; readonly scope: Scope }
}

/**
 * Constant: SIDEBAR_ITEMS
 *
 * Description: Paper Design 定义的 10 项扁平菜单列表
 * 来源: Paper Design "Dashboard — 数据面板" 侧边栏导航 (FJ6-1)
 *
 * Note: "博客分类" 菜单项已移除，分类管理已内嵌到博客管理页面左侧面板
 */
export const SIDEBAR_ITEMS: SidebarItem[] = [
  { name: '仪表盘', href: '/admin', icon: LayoutGrid, requiredAccess: { action: 'read', scope: 'dashboard' } },
  { name: '媒体库', href: '/admin/media', icon: ImageIcon, requiredAccess: { action: 'read', scope: 'media' } },
  { name: '博客管理', href: '/admin/blog', icon: FileText, requiredAccess: { action: 'read', scope: 'blog.articles' } },
  { name: '用户管理', href: '/admin/users', icon: Users, requiredAccess: { action: 'read', scope: 'users' } },
  { name: '商城管理', href: '/admin/products', icon: ShoppingCart, requiredAccess: { action: 'read', scope: 'products' } },
  { name: '通知中心', href: '/admin/notifications', icon: Bell, requiredAccess: { action: 'write', scope: 'notifications' } },
  { name: '签到管理', href: '/admin/checkin', icon: CalendarCheck, requiredAccess: { action: 'read', scope: 'checkin' } },
  { name: '用户反馈', href: '/admin/feedback', icon: MessageSquare, requiredAccess: { action: 'read', scope: 'feedback' } },
  { name: '系统配置', href: '/admin/settings', icon: Settings, requiredAccess: { action: 'write', scope: 'site-config' } },
  { name: '插件管理', href: '/admin/plugins', icon: Layers, requiredAccess: { action: 'read', scope: 'feature-flags' } },
]

/**
 * Function: getPageTitle
 *
 * Description: 根据路由路径查找对应的页面标题
 */
export function getPageTitle(pathname: string): string | null {
  const item = SIDEBAR_ITEMS.find(item => item.href === pathname)
  return item?.name ?? null
}
