"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/business/admin/sidebar/app-sidebar";
import { ChangelogDropdown } from "@/components/business/admin/changelog/changelog-dropdown";
import { useSiteConfigContext } from "@/components/context/site-config-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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
 * Description: 管理后台头部组件，显示站点名称和操作按钮
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
      <div className="flex items-center gap-2 px-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <SidebarTrigger className="-ml-1" />
      {pageTitle && (
        <h1 className="text-lg font-semibold text-foreground">
          {pageTitle}
        </h1>
      )}
      {siteConfig?.siteName && (
        <span className="text-sm text-muted-foreground">
          {siteConfig.siteName}
        </span>
      )}
    </div>
  );
}

export function AdminShellClient({
  children,
  enabledPlugins,
}: AdminShellClientProps) {
  const pathname = usePathname();
  const filteredGroups = getFilteredSidebarGroups(enabledPlugins);

  if (pathname === "/") {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      {/* Base Layer: h-svh 锁死视口高度，overflow-hidden 禁止窗口级滚动 */}
      <div className="bg-[var(--stitch-base,var(--bg))] h-svh w-full overflow-hidden flex">
        <AppSidebar enabledPlugins={enabledPlugins} />

        <SidebarInset className="flex-1 flex-col overflow-hidden">
          {/* Surface Layer: 四周 margin 暴露背景色，圆角 + 阴影营造悬浮感 */}
          <div className="bg-background shadow-[var(--shadow-card)] flex-1 m-0 md:m-4 rounded-none md:rounded-2xl h-full md:h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
            {/* Header: 固定高度，不参与滚动 */}
            <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-6">
              <AdminHeader pathname={pathname} groups={filteredGroups} />

              <div className="flex items-center gap-2">
                <ThemeToggle />
                <ChangelogDropdown />
              </div>
            </header>

            {/* Content: overflow-auto 滚动限制在此容器内 */}
            <main className="flex flex-1 flex-col gap-6 p-6 overflow-auto">
              {children}
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
