'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { AppSidebarMenu } from './app-sidebar-menu'
import { AppSidebarHeader } from './app-sidebar-header'
import { AppSidebarFooter } from './app-sidebar-footer'
import { getFilteredSidebarGroups } from './sidebar-items'

interface AppSidebarProps {
  enabledPlugins: Record<string, boolean>
}

/**
 * File: app-sidebar.tsx
 * Description: 业务侧边栏主组件，集成 shadcn/ui Sidebar
 * Function: AppSidebar
 *
 * Description: 业务侧边栏组件，封装 shadcn/ui Sidebar 和业务逻辑
 *
 * Parameters:
 *     enabledPlugins(Record<string, boolean>): 插件启用状态映射，用于动态过滤菜单
 *
 * Returns:
 *     React.ReactElement: 完整的侧边栏组件
 *
 * Features:
 *     - Logo 区域
 *     - 菜单导航（根据插件状态动态过滤）
 *     - 底部操作（退出登录）
 *     - 键盘快捷键（Ctrl/Cmd + B）
 *     - Cookie 状态持久化
 *     - 权限由上层 PermissionProvider 提供
 */
export function AppSidebar({ enabledPlugins }: AppSidebarProps) {
  const filteredGroups = getFilteredSidebarGroups(enabledPlugins)

  return (
    <Sidebar collapsible="icon" variant="sidebar">

      {/* header */}
      <SidebarHeader>
        <AppSidebarHeader />
      </SidebarHeader>

      {/* content */}
      <SidebarContent>
        <AppSidebarMenu groups={filteredGroups} />
      </SidebarContent>

      {/* footer */}
      <SidebarFooter>
        <AppSidebarFooter />
      </SidebarFooter>

      {/* rail */}
      <SidebarRail />
    </Sidebar>
  )
}
