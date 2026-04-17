"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/business/admin/sidebar/app-sidebar";
import { Separator } from "@/components/ui/separator";
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
      <Separator orientation="vertical" className="mr-2 h-4" />
      {pageTitle && (
        <>
          <h1 className="text-lg font-semibold text-foreground">
            {pageTitle}
          </h1>
          <Separator orientation="vertical" className="h-4" />
        </>
      )}
      {siteConfig?.siteName && (
        <>
          <span className="text-sm text-muted-foreground">
            {siteConfig.siteName}
          </span>
        </>
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
    <SidebarProvider defaultOpen={true} className="min-h-svh">
      <AppSidebar enabledPlugins={enabledPlugins} />

      <SidebarInset className="flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
          <AdminHeader pathname={pathname} groups={filteredGroups} />

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ChangelogDropdown />
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 overflow-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
