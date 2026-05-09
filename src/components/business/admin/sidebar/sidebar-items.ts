import { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Package,
  Layers,
  Image as ImageIcon,
  ShoppingCart,
  Tag,
  Handshake,
  Users,
  ShieldCheck,
  Globe,
  Bell,
  FileText,
  Shield,
  Smartphone,
  ScrollText,
  Sparkles,
  MessageSquare,
  CalendarCheck,
  Database,
} from 'lucide-react'
import type { Action, Scope } from '@/config/access'

/**
 * Type: SidebarItem
 *
 * Description: 侧边栏菜单项类型
 *
 * Properties:
 *     name(string): 菜单名称
 *     href(string): 路由链接
 *     icon(LucideIcon): 图标组件
 *     description(string, optional): 描述
 *     children(SidebarItem[], optional): 子菜单列表，有值时渲染为可展开的父菜单
 *     requiredAccess({ action: Action; scope: Scope }, optional): 结构化权限声明
 */
export interface SidebarItem {
  name: string
  href: string
  icon: LucideIcon
  description?: string
  children?: SidebarItem[]
  requiredAccess?: { readonly action: Action; readonly scope: Scope }
}

/**
 * Type: SidebarGroupConfig
 *
 * Description: 侧边栏分组配置类型
 *
 * Properties:
 *     group(string): 分组名称（显示为 SidebarGroupLabel）
 *     items(SidebarItem[]): 该分组的菜单项列表
 *     pluginName(string, optional): 关联的插件名称，存在时根据 enabledPlugins 动态过滤
 */
export interface SidebarGroupConfig {
  group: string
  items: SidebarItem[]
  pluginName?: string
}

/** 核心菜单 - 始终显示 */
const coreSidebarGroups: SidebarGroupConfig[] = [
  {
    group: '仪表盘',
    items: [
      { name: '仪表盘', href: '/admin', icon: LayoutDashboard, requiredAccess: { action: 'read', scope: 'dashboard' } },
    ],
  },
  {
    group: '内容管理',
    items: [
      { name: '媒体管理', href: '/admin/media', icon: ImageIcon, requiredAccess: { action: 'read', scope: 'media' } },
      { name: '博客文章', href: '/admin/blog', icon: FileText, requiredAccess: { action: 'read', scope: 'blog.articles' } },
      { name: '博客分类', href: '/admin/blog/categories', icon: Layers, requiredAccess: { action: 'read', scope: 'blog.categories' } },
    ],
  },
  {
    group: '用户权限',
    items: [
      { name: '用户管理', href: '/admin/users', icon: Users, requiredAccess: { action: 'read', scope: 'users' } },
      { name: '权限管理', href: '/admin/rbac', icon: ShieldCheck, requiredAccess: { action: 'read', scope: 'rbac' } },
      { name: 'MFA 设置', href: '/admin/mfa-settings', icon: Shield, requiredAccess: { action: 'read', scope: 'mfa' } },
    ],
  },
  {
    group: '运营管理',
    items: [
      { name: '反馈管理', href: '/admin/feedback', icon: MessageSquare, requiredAccess: { action: 'read', scope: 'feedback' } },
      { name: '签到统计', href: '/admin/checkin', icon: CalendarCheck, requiredAccess: { action: 'read', scope: 'checkin' } },
    ],
  },
  {
    group: '系统配置',
    items: [
      { name: '站点配置', href: '/admin/site-config', icon: Globe, requiredAccess: { action: 'write', scope: 'site-config' } },
      { name: '公告管理', href: '/admin/announcements', icon: Bell, requiredAccess: { action: 'write', scope: 'site-config' } },
      { name: '协议管理', href: '/admin/agreements', icon: FileText, requiredAccess: { action: 'write', scope: 'site-config' } },
      { name: '功能开关', href: '/admin/feature-flags', icon: Shield, requiredAccess: { action: 'read', scope: 'feature-flags' } },
      { name: 'AI 设置', href: '/admin/ai-settings', icon: Sparkles, requiredAccess: { action: 'read', scope: 'ai.settings' } },
      { name: '数据管理', href: '/admin/data-management', icon: Database, description: '数据库备份与恢复' },
      { name: '插件管理', href: '/admin/plugins', icon: Shield, requiredAccess: { action: 'read', scope: 'feature-flags' } },
      { name: '日志管理', href: '/admin/logs', icon: ScrollText, requiredAccess: { action: 'read', scope: 'logs' } },
    ],
  },
]

/** 插件菜单 - 根据 enabledPlugins 动态过滤 */
const pluginSidebarGroups: SidebarGroupConfig[] = [
  {
    group: '电商管理',
    pluginName: 'ecommerce',
    items: [
      { name: '商品管理', href: '/admin/products', icon: Package, requiredAccess: { action: 'read', scope: 'products' } },
      { name: '分类管理', href: '/admin/categories', icon: Layers, requiredAccess: { action: 'read', scope: 'categories' } },
      { name: '订单管理', href: '/admin/orders', icon: ShoppingCart, requiredAccess: { action: 'read', scope: 'orders' } },
      { name: '优惠券管理', href: '/admin/coupons', icon: Tag, requiredAccess: { action: 'read', scope: 'coupons' } },
    ],
  },
  {
    group: '分销管理',
    pluginName: 'promotion',
    items: [
      { name: '分销管理', href: '/admin/affiliate', icon: Handshake, requiredAccess: { action: 'read', scope: 'promoters' } },
    ],
  },
  {
    group: '微信管理',
    pluginName: 'wechat',
    items: [
      {
        name: '应用管理',
        href: '/admin/miniprogram',
        icon: Smartphone,
        requiredAccess: { action: 'read', scope: 'miniprogram.carousels' },
        children: [
          { name: '微信小程序', href: '/admin/miniprogram', icon: ImageIcon, requiredAccess: { action: 'read', scope: 'miniprogram.carousels' } },
        ],
      },
    ],
  },
]

/**
 * Function: getFilteredSidebarGroups
 *
 * Description: 根据插件启用状态过滤侧边栏分组，合并核心菜单和已启用的插件菜单
 *
 * Parameters:
 *     enabledPlugins(Record<string, boolean>): 插件名称 → 启用状态映射
 *
 * Returns:
 *     SidebarGroupConfig[]: 过滤后的侧边栏分组配置
 */
export function getFilteredSidebarGroups(enabledPlugins: Record<string, boolean>): SidebarGroupConfig[] {
  const enabledPluginGroups = pluginSidebarGroups.filter(
    (group) => !group.pluginName || enabledPlugins[group.pluginName]
  )
  return [...coreSidebarGroups, ...enabledPluginGroups]
}

/**
 * Function: sidebarGroups (deprecated)
 *
 * Description: 保留全量侧边栏配置用于 getPageTitle 标题查找（向后兼容）
 * 新代码应使用 getFilteredSidebarGroups() 代替
 */
export const sidebarGroups: SidebarGroupConfig[] = [
  ...coreSidebarGroups,
  ...pluginSidebarGroups,
]
