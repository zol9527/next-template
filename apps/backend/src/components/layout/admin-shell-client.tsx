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
import { AdminHeaderBreadcrumbs, AdminHeaderTabs } from '@/components/ui/admin-page-header'
import { useSiteConfigContext } from '@/components/context/site-config-context'

/**
 * Component: AdminHeaderLeft
 *
 * Description: CardHeader 左侧内容区域
 *   - 优先使用页面通过 AdminPageHeader 注册的内容
 *   - 如果页面没有注册，则 fallback 到 pathname-based 标题
 */
function AdminHeaderLeft({ fallbackTitle }: { fallbackTitle: string | null }) {
  const { headerContent } = useAdminHeader()
  const { siteConfig, isLoading } = useSiteConfigContext()

  // 页面注册了自定义 header → 渲染页面自定义内容
  if (headerContent) {
    return (
      <div className="flex flex-col gap-1 min-w-0">
        {/* 面包屑 */}
        {headerContent.breadcrumbs && headerContent.breadcrumbs.length > 0 && (
          <AdminHeaderBreadcrumbs items={headerContent.breadcrumbs} />
        )}

        {/* 标题行：标题 + 操作按钮 */}
        <div className="flex items-center gap-3">
          <h1 className="heading-1 truncate">{headerContent.title}</h1>
          {headerContent.description && (
            <span className="text-caption hidden sm:inline">{headerContent.description}</span>
          )}
        </div>

        {/* Tab 导航 */}
        {headerContent.tabs && headerContent.tabs.length > 0 && (
          <AdminHeaderTabs tabs={headerContent.tabs} />
        )}
      </div>
    )
  }

  // Fallback: 未注册自定义 header → 使用 pathname-based 标题
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
 * Component: AdminShellClient
 *
 * Description: 后台管理主框架布局（Paper Design AppShell FGC-1）
 *   - LayoutWrapper: flex, p-5, bg-bg, h-svh
 *   - Sidebar: w-56 (224px), 融入背景色
 *   - MainCard: grow, rounded-lg, shadow-card, bg-surface
 *   - CardHeader: h-[60px], px-7, border-b — 左侧页面自定义 + 右侧共享元素
 *   - CardContent: py-6, px-7, gap-6, overflow-auto
 *
 * Header 机制:
 *   - 左侧: 页面通过 <AdminPageHeader> 注册自定义内容 (标题/面包屑/Tab)
 *   - 右侧: 共享元素 (搜索框 + 更新日志 + 用户头像)
 *   - Fallback: 未注册时显示 pathname-based 标题
 */
export function AdminShellClient({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // 首页直接渲染，不使用后台布局
  if (pathname === '/') {
    return <>{children}</>
  }

  // AdminHeaderProvider 必须包裹在 SidebarProvider 之上，
  // 因为 AdminHeaderLeft 内部使用了 useAdminHeader
  return (
    <AdminHeaderProvider>
      <AdminShellInner>{children}</AdminShellInner>
    </AdminHeaderProvider>
  )
}

/**
 * Component: AdminShellInner
 *
 * Description: AppShell 内层，包含 Sidebar + MainCard + CardHeader
 *   分离出来是因为 AdminHeaderLeft 需要在 AdminHeaderProvider 内部
 */
function AdminShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const fallbackTitle = getPageTitle(pathname)

  return (
    <SidebarProvider defaultOpen={true}>
      {/* LayoutWrapper: 对应 Paper FGD-1 — 全视口高度 + 20px 内边距 */}
      <div className="bg-bg h-svh w-full overflow-hidden flex p-5">
        {/* Sidebar: 对应 Paper FT6-1 — 224px 宽度，融入背景 */}
        <AppSidebar />

        {/* MainCard: 对应 Paper FIH-1 — 白色圆角卡片 + 阴影 */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          <div className="bg-surface shadow-card grow rounded-lg overflow-hidden flex flex-col">
            {/* CardHeader: 对应 Paper FII-1 — 固定 60px 高度 */}
            <header className="flex h-[60px] shrink-0 items-center justify-between px-7 border-b border-border-default">
              {/* 左侧: 页面自定义 header 内容 (通过 context 注入) */}
              <AdminHeaderLeft fallbackTitle={fallbackTitle} />

              {/* 右侧: 共享元素 — 搜索框 + 更新日志 + 用户头像 */}
              <div className="flex items-center gap-3 shrink-0">
                {/* 搜索框 — pill 圆角, --bg 背景, --border 边框 */}
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
            </header>

            {/* CardContent: 对应 Paper FIZ-1 — 可滚动主内容区域 */}
            <main className="flex flex-1 flex-col gap-6 py-6 px-7 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}
