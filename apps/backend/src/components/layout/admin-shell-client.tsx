"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/business/admin/sidebar/app-sidebar";
import { ChangelogDropdown } from "@/components/business/admin/changelog/changelog-dropdown";
import { AdminHeaderUser } from "@/components/business/admin/sidebar/admin-header-user";
import { useSiteConfigContext } from "@/components/context/site-config-context";
import { Loader2 } from "lucide-react";
import {
  getFilteredSidebarGroups,
  type SidebarGroupConfig,
} from "@/components/business/admin/sidebar/sidebar-items";

interface AdminShellClientProps {
  children: ReactNode;
  enabledPlugins: Record<string, boolean>;
}

/**
 * Function: getPageTitle
 *
 * Description: 根据当前路由路径从菜单配置中查找对应的页面标题
 *
 * Parameters:
 *     pathname(string): 当前路由路径
 *     groups(SidebarGroupConfig[]): 侧边栏分组配置
 *
 * Returns:
 *     string | null: 找到的页面标题，如果未找到则返回 null
 */
function getPageTitle(pathname: string, groups: SidebarGroupConfig[]): string | null {
  for (const group of groups) {
    for (const item of group.items) {
      if (item.href === pathname) {
        return item.name;
      }

      if (item.children) {
        for (const child of item.children) {
          if (child.href === pathname) {
            return child.name;
          }
        }
      }
    }
  }

  return null;
}

/**
 * Component: AdminHeader
 *
 * Description: 管理后台头部组件（Paper Design AppShell CardHeader 规格）
 *
 * 结构:
 *   左侧: 页面标题 (heading-1) + 补充说明文字 (text-body-sm)
 *   右侧: 更新日志 + 用户头像下拉菜单
 *
 * 规格来源: Paper Design "App Shell — 主框架模板" CardHeader (FII-1)
 *   - 固定高度: 60px (--card-header-height)
 *   - 水平内边距: 28px
 *   - 底部分割线: border-default
 *
 * Parameters:
 *     pathname(string): 当前路由路径
 *     groups(SidebarGroupConfig[]): 侧边栏分组配置
 */
function AdminHeader({ pathname, groups }: { pathname: string; groups: SidebarGroupConfig[] }) {
  const { siteConfig, isLoading } = useSiteConfigContext();

  const pageTitle = getPageTitle(pathname, groups);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-7">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* 左侧: 页面标题 + 补充说明 */}
      <div className="flex items-center gap-2">
        {pageTitle && (
          <h1 className="heading-1">{pageTitle}</h1>
        )}
        {siteConfig?.siteName && (
          <span className="text-body-sm text-fg-muted">
            {siteConfig.siteName}
          </span>
        )}
      </div>

      {/* 右侧: 更新日志 + 用户头像 */}
      <div className="flex items-center gap-3">
        <ChangelogDropdown />
        <AdminHeaderUser />
      </div>
    </>
  );
}

/**
 * Component: AdminShellClient
 *
 * Description: 后台管理主框架布局（Paper Design AppShell 规格）
 *
 * 结构层级 (对应 Paper Design AppShell):
 *   LayoutWrapper (FGD-1): flex, p-5, bg-bg
 *     ├── Sidebar (FT6-1): w-56, flex-col, shrink-0
 *     └── MainCard (FIH-1): grow, rounded-2xl, shadow-card, bg-surface
 *         ├── CardHeader (FII-1): h-[60px], px-7, border-b
 *         └── CardContent (FIZ-1): grow, py-6, px-7, overflow-auto
 *
 * 规格来源: Paper Design "App Shell — 主框架模板" (FGC-1)
 */
export function AdminShellClient({
  children,
  enabledPlugins,
}: AdminShellClientProps) {
  const pathname = usePathname();
  const filteredGroups = getFilteredSidebarGroups(enabledPlugins);

  // 首页直接渲染，不使用后台布局
  if (pathname === "/") {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      {/* LayoutWrapper: 对应 Paper FGD-1 — 全视口高度 + 20px 内边距 */}
      <div className="bg-bg h-svh w-full overflow-hidden flex p-5">
        {/* Sidebar: 对应 Paper FT6-1 — 224px 宽度，融入背景 */}
        <AppSidebar enabledPlugins={enabledPlugins} />

        {/* MainCard: 对应 Paper FIH-1 — 白色圆角卡片 + 阴影 */}
        <SidebarInset className="flex-1 flex-col overflow-hidden">
          <div className="bg-surface shadow-card flex-1 rounded-2xl overflow-hidden flex flex-col md:m-0">
            {/* CardHeader: 对应 Paper FII-1 — 固定 60px 高度 */}
            <header className="flex h-[60px] shrink-0 items-center justify-between px-7 border-b border-border">
              <AdminHeader pathname={pathname} groups={filteredGroups} />
            </header>

            {/* CardContent: 对应 Paper FIZ-1 — 可滚动主内容区域 */}
            <main className="flex flex-1 flex-col gap-6 py-6 px-7 overflow-auto">
              {children}
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
