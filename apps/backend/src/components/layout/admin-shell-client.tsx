'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/business/admin/sidebar/app-sidebar'
import { AdminHeaderUser } from '@/components/business/admin/sidebar/admin-header-user'
import { ChangelogDropdown } from '@/components/business/admin/changelog/changelog-dropdown'
import { Loader2, Search } from 'lucide-react'
import { getPageTitle } from '@/components/business/admin/sidebar/sidebar-items'
import { AdminHeaderProvider, useAdminHeader } from '@/components/layout/admin-header-context'
import { AdminHeaderBreadcrumbs } from '@/components/ui/admin-page-header'
import { useSiteConfigContext } from '@/components/context/site-config-context'

/**
 * Component: AdminHeaderLeft
 *
 * Description: CardHeader 左侧内容区域
 *   - 有 tabs: 渲染 tabs（替代 title+description）
 *   - 无 tabs: 渲染 breadcrumbs + title + description
 */
function AdminHeaderLeft({ fallbackTitle }: { fallbackTitle: string | null }) {
  const { headerContent } = useAdminHeader()
  const { siteConfig, isLoading } = useSiteConfigContext()

  // 页面注册了自定义 header → 渲染页面自定义内容
  if (headerContent) {
    // 有 tabs → tabs 占据左侧（替代 title+description）
    if (headerContent.tabs) {
      return <>{headerContent.tabs}</>
    }

    // 无 tabs → 渲染 breadcrumbs + title + description
    return (
      <div className="flex flex-col gap-0.5 min-w-0">
        {headerContent.breadcrumbs && headerContent.breadcrumbs.length > 0 && (
          <AdminHeaderBreadcrumbs items={headerContent.breadcrumbs} />
        )}
        <div className="flex items-center gap-2">
          <h1 className="heading-1 truncate">{headerContent.title}</h1>
          {headerContent.description && (
            <span className="text-caption hidden sm:inline truncate">{headerContent.description}</span>
          )}
        </div>
      </div>
    )
  }

  // Fallback: pathname-based 标题
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-fg-muted" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {fallbackTitle && <h1 className="heading-1">{fallbackTitle}</h1>}
      {siteConfig?.siteName && (
        <span className="text-caption">{siteConfig.siteName}</span>
      )}
    </div>
  )
}

/**
 * Component: AdminHeaderRight
 *
 * Description: CardHeader 右侧内容区域
 *   - 页面注册了 actions: 渲染页面 actions
 *   - 否则: 渲染共享元素（搜索框 + 更新日志 + 用户头像）
 */
function AdminHeaderRight() {
  const { headerContent } = useAdminHeader()

  // 页面提供了自定义 actions → 渲染 actions + 共享元素
  if (headerContent?.actions) {
    return (
      <div className="flex items-center gap-3 shrink-0">
        {headerContent.actions}
        <ChangelogDropdown />
        <AdminHeaderUser />
      </div>
    )
  }

  // 默认: 共享元素
  return (
    <div className="flex items-center gap-3 shrink-0">
      {/* 搜索框 */}
      <div className="flex items-center h-9 min-w-[200px] rounded-full px-3.5 gap-2 bg-bg border border-border-default">
        <Search className="size-4 shrink-0 text-fg-muted" strokeWidth={2} />
        <span className="font-body text-[13px] text-fg-muted">搜索...</span>
        <kbd className="ml-auto rounded-sm py-px px-1.25 bg-surface border border-border-default font-mono text-[11px] text-fg-muted">
          ⌘K
        </kbd>
      </div>
      <ChangelogDropdown />
      <AdminHeaderUser />
    </div>
  )
}

/**
 * Component: AdminHeaderFilterBar
 *
 * Description: CardHeader 下方筛选栏（可选）
 *   页面通过 AdminPageHeader 的 filterBar prop 注入
 */
function AdminHeaderFilterBar() {
  const { headerContent } = useAdminHeader()

  if (!headerContent?.filterBar) return null

  return (
    <div className="border-b border-border-default">
      {headerContent.filterBar}
    </div>
  )
}

/**
 * Component: AdminShellClient
 *
 * Description: 后台管理主框架布局（Paper Design AppShell FGC-1）
 *
 * CardHeader 布局:
 *   ┌──────────────────────────────────────────────────────┐
 *   │ 左侧: tabs / (breadcrumbs + title + description)     │
 *   │ 右侧: actions / (搜索框 + 更新日志 + 用户头像)        │
 *   ├──────────────────────────────────────────────────────┤
 *   │ filterBar (可选)                                      │
 *   └──────────────────────────────────────────────────────┘
 */
export function AdminShellClient({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  if (pathname === '/') {
    return <>{children}</>
  }

  return (
    <AdminHeaderProvider>
      <AdminShellInner>{children}</AdminShellInner>
    </AdminHeaderProvider>
  )
}

/**
 * Component: AdminShellInner
 */
function AdminShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const fallbackTitle = getPageTitle(pathname)

  return (
    <SidebarProvider defaultOpen={true}>
      {/* LayoutWrapper: Paper FGD-1 */}
      <div className="bg-bg h-svh w-full overflow-hidden flex p-5">
        {/* Sidebar: Paper FT6-1 */}
        <AppSidebar />

        {/* MainCard: Paper FIH-1 */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          <div className="bg-surface shadow-card grow rounded-lg overflow-hidden flex flex-col">
            {/* CardHeader: Paper FII-1 — 动态高度，min-h-[60px] */}
            <header className="flex flex-col shrink-0">
              {/* 主行: 左侧内容 + 右侧共享/自定义 */}
              <div className="flex items-center min-h-[60px] justify-between px-7 border-b border-border-default">
                <AdminHeaderLeft fallbackTitle={fallbackTitle} />
                <AdminHeaderRight />
              </div>

              {/* 筛选栏 (可选) */}
              <AdminHeaderFilterBar />
            </header>

            {/* CardContent: Paper FIZ-1 */}
            <main className="flex flex-1 flex-col gap-6 py-6 px-7 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}
