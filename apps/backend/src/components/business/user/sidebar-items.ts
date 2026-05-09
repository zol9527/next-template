import type { LucideIcon } from 'lucide-react'
import {
  User,
  ShoppingBag,
  Handshake,
} from 'lucide-react'

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
 */
export interface SidebarItem {
  name: string
  href: string
  icon: LucideIcon
  description?: string
  children?: SidebarItem[]
}

/**
 * Type: SidebarGroupConfig
 *
 * Description: 侧边栏分组配置类型
 *
 * Properties:
 *     group(string): 分组名称（显示为 SidebarGroupLabel）
 *     items(SidebarItem[]): 该分组的菜单项列表
 */
export interface SidebarGroupConfig {
  group: string
  items: SidebarItem[]
}

/**
 * Function: userSidebarGroups
 *
 * Description: 用户端侧边栏分组配置，按业务模块分组展示菜单
 *
 * Returns:
 *     SidebarGroupConfig[]: 分组后的菜单配置
 */
export const userSidebarGroups: SidebarGroupConfig[] = [
  {
    group: '个人中心',
    items: [
      { name: '个人资料', href: '/user/profile', icon: User },
      { name: '我的订单', href: '/user/orders', icon: ShoppingBag },
      { name: '分销中心', href: '/user/affiliate', icon: Handshake },
    ],
  },
]
