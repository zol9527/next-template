'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar'
import { AppSidebarMenu } from './app-sidebar-menu'
import { AppSidebarHeader } from './app-sidebar-header'
import { AppSidebarFooter } from './app-sidebar-footer'

/**
 * Component: AppSidebar
 *
 * Description: 业务侧边栏组件（Paper Design 展开态 224px）
 * 基于 shadcn/ui Sidebar，仅保留展开态，去掉折叠逻辑
 * 规格来源: Paper Design "App Shell — 主框架模板" Sidebar (FT6-1)
 */
export function AppSidebar() {
  return (
    <Sidebar collapsible="none" variant="sidebar" className="border-none shadow-none">
      {/* 品牌区 */}
      <SidebarHeader>
        <AppSidebarHeader />
      </SidebarHeader>

      {/* 导航区 — 10 项扁平列表 */}
      <SidebarContent>
        <AppSidebarMenu />
      </SidebarContent>

      {/* 底部操作区 — 退出登录 */}
      <SidebarFooter>
        <AppSidebarFooter />
      </SidebarFooter>
    </Sidebar>
  )
}
