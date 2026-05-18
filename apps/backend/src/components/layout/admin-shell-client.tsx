'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/business/admin/sidebar/app-sidebar'
import { AdminHeaderUser } from '@/components/business/admin/sidebar/admin-header-user'
import { ChangelogDropdown } from '@/components/business/admin/changelog/changelog-dropdown'
import { useSiteConfigContext } from '@/components/context/site-config-context'
import { Loader2, Search } from 'lucide-react'
import { getPageTitle } from '@/components/business/admin/sidebar/sidebar-items'

/**
 * Component: AdminHeader
 *
 * Description: 管理后台头部（Paper Design CardHeader FII-1）
 *   - 固定高度: 60px
 *   - 左侧: 页面标题 (heading-1) + 补充说明 (text-caption)
 *   - 右侧: 搜索框 + 更新日志 + 用户头像
 */
function AdminHeader({ pathname }: { pathname: string }) {
  const { siteConfig, isLoading } = useSiteConfigContext()
  const pageTitle = getPageTitle(pathname)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-7">
        <Loader2 className="h-4 w-4 animate-spin text-fg-muted" />
      </div>
    )
  }

  return (
    <>
      {/* 左侧: 页面标题 + 补充说明 */}
      <div className="flex items-center gap-2">
        {pageTitle && <h1 className="heading-1">{pageTitle}</h1>}
        {siteConfig?.siteName && (
          <span className="text-caption">{siteConfig.siteName}</span>
        )}
      </div>

      {/* 右侧: 搜索框 + 更新日志 + 用户头像 */}
      <div className="flex items-center gap-3">
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
    </>
  )
}

/**
 * Component: AdminShellClient
 *
 * Description: 后台管理主框架布局（Paper Design AppShell FGC-1）
 *   - LayoutWrapper: flex, p-5, bg-bg, h-svh
 *   - Sidebar: w-56 (224px), 融入背景色
 *   - MainCard: grow, rounded-2xl, shadow-card, bg-surface
 *   - CardHeader: h-[60px], px-7, border-b
 *   - CardContent: py-6, px-7, gap-6, overflow-auto
 */
export function AdminShellClient({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // 首页直接渲染，不使用后台布局
  if (pathname === '/') {
    return <>{children}</>
  }

  return (
    <SidebarProvider defaultOpen={true}>
      {/* LayoutWrapper: 对应 Paper FGD-1 — 全视口高度 + 20px 内边距 */}
      <div className="bg-bg h-svh w-full overflow-hidden flex p-5">
        {/* Sidebar: 对应 Paper FT6-1 — 224px 宽度，融入背景 */}
        <AppSidebar />

        {/* MainCard: 对应 Paper FIH-1 — 白色圆角卡片 + 阴影 */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          <div className="bg-surface shadow-card grow rounded-2xl overflow-hidden flex flex-col">
            {/* CardHeader: 对应 Paper FII-1 — 固定 60px 高度 */}
            <header className="flex h-[60px] shrink-0 items-center justify-between px-7 border-b border-border-default">
              <AdminHeader pathname={pathname} />
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
