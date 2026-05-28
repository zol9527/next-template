# AppShell + Dashboard 重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 AppShell 框架（侧边栏 + 主卡片）和 Dashboard 数据面板，完全匹配 Paper Design 视觉设计。

**Architecture:** 保留 shadcn/ui SidebarProvider 做状态管理，自定义 UI 渲染层覆盖视觉效果。Dashboard 使用 Server Components 预获取数据 + Client Components 渲染图表交互。6 个 Checkpoint 暂停对比 Paper Design 截图验证。

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, shadcn/ui, recharts, lucide-react

**Design Spec:** `docs/superpowers/specs/2026-05-18-appshell-dashboard-redesign.md`

---

## File Structure

```
apps/backend/src/
├── app/admin/
│   ├── layout.tsx                          # 调整 — 适配新 Shell props
│   └── page.tsx                            # 重写 — Server Component 数据获取
├── components/
│   ├── layout/
│   │   ├── admin-shell.tsx                 # 调整 — 适配新 props
│   │   └── admin-shell-client.tsx          # 重写 — 简化布局，去掉折叠逻辑
│   ├── business/admin/
│   │   ├── sidebar/
│   │   │   ├── app-sidebar.tsx             # 重写 — 仅展开态
│   │   │   ├── app-sidebar-menu.tsx        # 重写 — 扁平化 10 项导航
│   │   │   ├── app-sidebar-header.tsx      # 重写 — 去掉折叠态逻辑
│   │   │   ├── app-sidebar-footer.tsx      # 重写 — 去掉折叠态逻辑
│   │   │   ├── sidebar-items.ts           # 重写 — Paper Design 扁平菜单配置
│   │   │   └── admin-header-user.tsx       # 保留 — 不动
│   │   ├── dashboard/
│   │   │   ├── types.ts                    # 新建 — Dashboard 类型定义
│   │   │   ├── dashboard-client.tsx        # 新建 — 客户端 Dashboard 主组件
│   │   │   ├── system-status-card.tsx      # 新建 — 系统状态卡片
│   │   │   ├── transaction-card.tsx        # 新建 — 交易数据卡片
│   │   │   ├── kpi-strip.tsx              # 新建 — KPI 指标条
│   │   │   ├── kpi-cell.tsx              # 新建 — 单个 KPI 单元
│   │   │   ├── activity-feed.tsx          # 新建 — 活动 Feed
│   │   │   ├── student-trend-chart.tsx    # 新建 — 折线图
│   │   │   └── course-distribution-chart.tsx # 新建 — 环形图
│   │   ├── admin-dashboard.tsx             # 删除（功能迁移到 dashboard/）
│   │   ├── admin-dashboard-shell.tsx       # 删除（功能迁移到 page.tsx）
│   │   └── ecommerce-dashboard-section.tsx # 删除（功能迁移到 dashboard/）
```

---

## Task 1: 侧边栏菜单配置重写

**Files:**
- Modify: `apps/backend/src/components/business/admin/sidebar/sidebar-items.ts`

将当前分组式菜单配置改为 Paper Design 的 10 项扁平列表。

- [ ] **Step 1: 重写 sidebar-items.ts**

替换整个文件内容为扁平菜单配置。保留 `SidebarItem` 类型和权限检查接口，移除 `SidebarGroupConfig` 和分组逻辑。

```typescript
import type { LucideIcon } from 'lucide-react'
import {
  LayoutGrid,
  Image as ImageIcon,
  FileText,
  Users,
  ShoppingCart,
  Bell,
  CalendarCheck,
  MessageSquare,
  Settings,
  Layers,
} from 'lucide-react'
import type { Action, Scope } from '@/config/access'

/**
 * Type: SidebarItem
 *
 * Description: 侧边栏菜单项类型（扁平列表，无分组）
 *
 * Properties:
 *     name(string): 菜单名称
 *     href(string): 路由链接
 *     icon(LucideIcon): 图标组件
 *     requiredAccess({ action: Action; scope: Scope }, optional): 结构化权限声明
 */
export interface SidebarItem {
  name: string
  href: string
  icon: LucideIcon
  requiredAccess?: { readonly action: Action; readonly scope: Scope }
}

/**
 * Constant: SIDEBAR_ITEMS
 *
 * Description: Paper Design 定义的 10 项扁平菜单列表
 * 来源: Paper Design "Dashboard — 数据面板" 侧边栏导航 (FJ6-1)
 */
export const SIDEBAR_ITEMS: SidebarItem[] = [
  { name: '仪表盘', href: '/admin', icon: LayoutGrid, requiredAccess: { action: 'read', scope: 'dashboard' } },
  { name: '媒体库', href: '/admin/media', icon: ImageIcon, requiredAccess: { action: 'read', scope: 'media' } },
  { name: '博客管理', href: '/admin/blog', icon: FileText, requiredAccess: { action: 'read', scope: 'blog.articles' } },
  { name: '用户管理', href: '/admin/users', icon: Users, requiredAccess: { action: 'read', scope: 'users' } },
  { name: '商城管理', href: '/admin/products', icon: ShoppingCart, requiredAccess: { action: 'read', scope: 'products' } },
  { name: '通知中心', href: '/admin/notifications', icon: Bell, requiredAccess: { action: 'write', scope: 'notifications' } },
  { name: '签到管理', href: '/admin/checkin', icon: CalendarCheck, requiredAccess: { action: 'read', scope: 'checkin' } },
  { name: '用户反馈', href: '/admin/feedback', icon: MessageSquare, requiredAccess: { action: 'read', scope: 'feedback' } },
  { name: '系统配置', href: '/admin/site-config', icon: Settings, requiredAccess: { action: 'write', scope: 'site-config' } },
  { name: '插件管理', href: '/admin/plugins', icon: Layers, requiredAccess: { action: 'read', scope: 'feature-flags' } },
]

/**
 * Function: getPageTitle
 *
 * Description: 根据路由路径查找对应的页面标题
 */
export function getPageTitle(pathname: string): string | null {
  const item = SIDEBAR_ITEMS.find(item => item.href === pathname)
  return item?.name ?? null
}
```

- [ ] **Step 2: 验证 typecheck 通过**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: 无类型错误（注意：此时代码中引用旧接口的文件会报错，这是预期的，后续 Task 修复）

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/components/business/admin/sidebar/sidebar-items.ts
git commit -m "refactor: rewrite sidebar-items to flat 10-item list per Paper Design"
```

---

## Task 2: 侧边栏组件重写（app-sidebar + header + footer）

**Files:**
- Modify: `apps/backend/src/components/business/admin/sidebar/app-sidebar-header.tsx`
- Modify: `apps/backend/src/components/business/admin/sidebar/app-sidebar-footer.tsx`
- Modify: `apps/backend/src/components/business/admin/sidebar/app-sidebar.tsx`

去掉折叠态逻辑，仅保留展开态。

- [ ] **Step 1: 重写 app-sidebar-header.tsx — 去掉折叠态**

移除所有 `group-data-[collapsible=icon]` 条件样式：

```tsx
'use client'

import { GraduationCap } from 'lucide-react'
import { APP_NAME } from '@/config/site'
import { useSiteConfigContext } from '@/components/context/site-config-context'

/**
 * Component: AppSidebarHeader
 *
 * Description: 侧边栏品牌区域（Paper Design BrandArea FT7-1）
 *   - BrandIcon: 36×36px 圆角深色方块 + 毕业帽图标
 *   - BrandName: 品牌名称，Outfit 600 17px
 *   - 高度: 52px，内边距: py-2 px-4，间距 gap-3
 */
export function AppSidebarHeader() {
  const { siteConfig } = useSiteConfigContext()
  const brandName = siteConfig?.siteName ?? APP_NAME

  return (
    <div className="flex items-center h-[52px] shrink-0 mb-2 py-2 px-4 gap-3">
      {/* BrandIcon: 对应 Paper FT8-1 — 36×36px 深色方块 */}
      <div className="flex items-center justify-center shrink-0 rounded-lg bg-fg size-9">
        <GraduationCap className="size-5 text-white" strokeWidth={2} />
      </div>

      {/* BrandName: 对应 Paper FTD-1 — Outfit 600 17px */}
      <span className="font-display font-semibold text-fg text-[17px] leading-[22px]">
        {brandName}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: 重写 app-sidebar-footer.tsx — 去掉折叠态**

移除所有 `group-data-[collapsible=icon]` 条件样式，调整圆角为 `rounded-lg`：

将 `rounded-sm` 改为 `rounded-lg`，移除所有 `group-data-[collapsible=icon]:*` 类名。

```tsx
'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { AuthContext } from '@/components/context/auth-context'
import { useToast } from '@/components/ui/toast'

/**
 * Component: AppSidebarFooter
 *
 * Description: 侧边栏底部退出登录按钮（Paper Design LogoutArea FVL-1）
 *   - 全宽按钮，rounded-lg 圆角，border 边框
 *   - 图标: LogOut 18px, --fg-muted
 *   - 文字: "退出登录" DM Sans 500 13px, --fg-muted
 */
export function AppSidebarFooter() {
  const router = useRouter()
  const { toast } = useToast()
  const auth = React.useContext(AuthContext)
  const { logout } = auth || { logout: async () => {} }

  const handleLogout = async () => {
    try {
      await logout()
      toast({ title: '退出成功', description: '您已成功退出登录' })
      router.replace('/')
    } catch {
      toast({ title: '退出失败', description: '退出登录时发生错误，请稍后重试', variant: 'destructive' })
    }
  }

  return (
    <div className="shrink-0 pt-2 px-2.5">
      <button
        type="button"
        onClick={handleLogout}
        className="w-full flex items-center rounded-lg py-[9px] px-3 gap-2 border border-solid border-border-default transition-colors hover:bg-[rgba(38,37,30,0.04)]"
      >
        <LogOut className="size-[18px] shrink-0 text-fg-muted" strokeWidth={2} />
        <span className="font-body font-medium text-fg-muted text-[13px] leading-4">
          退出登录
        </span>
      </button>
    </div>
  )
}
```

- [ ] **Step 3: 重写 app-sidebar.tsx — 仅展开态，去掉 SidebarRail**

```tsx
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
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/components/business/admin/sidebar/app-sidebar-header.tsx \
        apps/backend/src/components/business/admin/sidebar/app-sidebar-footer.tsx \
        apps/backend/src/components/business/admin/sidebar/app-sidebar.tsx
git commit -m "refactor: simplify sidebar to expand-only mode per Paper Design"
```

---

## Task 3: 侧边栏菜单组件重写

**Files:**
- Modify: `apps/backend/src/components/business/admin/sidebar/app-sidebar-menu.tsx`

将分组式菜单渲染改为扁平列表渲染，添加 Active 左侧指示条。

- [ ] **Step 1: 重写 app-sidebar-menu.tsx**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Lock } from 'lucide-react'
import { SIDEBAR_ITEMS } from './sidebar-items'
import { useAuth } from '@/hooks/use-auth'
import { useAccess } from '@/hooks/use-access'
import { PermissionDeniedModal, usePermissionDeniedModal } from './permission-denied-modal'
import { cn } from '@/lib/utils'

/**
 * Component: AppSidebarMenu
 *
 * Description: 扁平化侧边栏导航列表（Paper Design SidebarNav FJ6-1）
 *   - 10 个导航项，无分组 label
 *   - 导航项尺寸: 204×36px (px-3 py-[9px])
 *   - 圆角: rounded-lg (8px)
 *   - 间距: gap-0.5 (2px)
 *   - Active: accent-subtle 背景 + 左侧 3px accent 指示条
 */
export function AppSidebarMenu() {
  const pathname = usePathname()
  const auth = useAuth()
  const access = useAccess()
  const modal = usePermissionDeniedModal()

  return (
    <nav className="flex flex-col grow py-2 px-2.5 gap-0.5 overflow-y-auto">
      {SIDEBAR_ITEMS.map((item) => {
        const hasAccess = item.requiredAccess
          ? access.has(item.requiredAccess)
          : true
        const isActive = pathname === item.href
        const isLocked = item.requiredAccess && !hasAccess && !auth.isLoading

        const handleClick = (e: React.MouseEvent) => {
          if (isLocked) {
            e.preventDefault()
            modal.show(item.name, `${item.requiredAccess?.action}:${item.requiredAccess?.scope}`)
          }
        }

        return (
          <Link
            key={item.href}
            href={isLocked ? '#' : item.href}
            onClick={handleClick}
            className={cn(
              'flex items-center rounded-lg py-[9px] px-3 gap-3 transition-colors relative',
              isActive
                ? 'bg-ds-accent-subtle text-ds-accent'
                : 'text-fg-secondary hover:bg-[rgba(38,37,30,0.04)]',
              isLocked && 'text-fg-secondary/45'
            )}
          >
            {/* Active 左侧指示条 — 3px accent 色 */}
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-ds-accent" />
            )}

            <item.icon className="size-[18px] shrink-0" strokeWidth={2} />
            <span className="font-body font-medium text-[13.5px] leading-[130%] truncate">
              {item.name}
            </span>

            {isLocked && (
              <Lock className="ml-auto size-3.5 shrink-0 text-fg-secondary/45" />
            )}
          </Link>
        )
      })}

      <PermissionDeniedModal {...modal.modalProps} />
    </nav>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/components/business/admin/sidebar/app-sidebar-menu.tsx
git commit -m "refactor: rewrite sidebar menu as flat 10-item nav with active indicator"
```

---

## Task 4: AdminShell 主框架重写

**Files:**
- Modify: `apps/backend/src/components/layout/admin-shell.tsx`
- Modify: `apps/backend/src/components/layout/admin-shell-client.tsx`

简化布局结构，去掉 SidebarInset 和折叠逻辑，侧边栏不再接收 enabledPlugins。

- [ ] **Step 1: 重写 admin-shell.tsx — 简化 props（不再传 enabledPlugins）**

```tsx
import type { ReactNode } from 'react'
import { AdminShellClient } from './admin-shell-client'

/**
 * Component: AdminShell
 *
 * Description: 后台管理系统外壳组件（服务端组件）
 * 侧边栏菜单已固定为 Paper Design 10 项，不再依赖 enabledPlugins 动态过滤
 */
export async function AdminShell({ children }: { children: ReactNode }) {
  return <AdminShellClient>{children}</AdminShellClient>
}
```

- [ ] **Step 2: 重写 admin-shell-client.tsx**

```tsx
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
        <div className="flex-1 flex-col overflow-hidden">
          <div className="bg-surface shadow-card flex-1 rounded-2xl overflow-hidden flex flex-col">
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
```

- [ ] **Step 3: 更新 admin/layout.tsx — 去掉 enabledPlugins 传递**

```tsx
import type { ReactNode } from 'react'
import { connection } from 'next/server'
import { refreshPluginCache } from '@/plugins/registry'
import { AdminShell } from '@/components/layout/admin-shell'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // opt-in 动态渲染
  void (await connection())
  await refreshPluginCache()
  return <AdminShell>{children}</AdminShell>
}
```

- [ ] **Step 4: 运行 typecheck**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: 通过（无类型错误）

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/components/layout/admin-shell.tsx \
        apps/backend/src/components/layout/admin-shell-client.tsx \
        apps/backend/src/app/admin/layout.tsx
git commit -m "refactor: rewrite AdminShell with flat sidebar and fixed expand-only layout"
```

---

## 🔍 CP1: 侧边栏视觉验证

启动 dev server，打开 `/admin`，截取侧边栏区域截图。

对比 Paper Design `App Shell — 主框架模板` (FGC-1) Sidebar 部分：
- [ ] 品牌区：Logo 方块 36×36 (#26251E) + "EduAdmin" (Outfit 600 17px)
- [ ] 10 个导航项扁平排列，无分组 label
- [ ] 导航项尺寸 204×36，间距 2px，圆角 8px
- [ ] Active 项：accent-subtle 背景 + 左侧 3px 指示条 + accent 色文字/图标
- [ ] 默认项：透明背景 + #6B6960 文字/图标
- [ ] 退出登录按钮位于底部，带 border 边框
- [ ] 侧边栏融入页面背景色，无边框无阴影
- [ ] 路由切换时 Active 状态正确跟随

---

## 🔍 CP2: AppShell 主卡片视觉验证

截取 MainCard 区域截图。

对比 Paper Design `App Shell — 主框架模板` (FGC-1) MainCard 部分：
- [ ] MainCard：白色背景 + 16px 圆角 + shadow-card
- [ ] CardHeader 高度 60px，底部分割线
- [ ] 左侧页面标题 (Outfit 600 18px) + 补充说明
- [ ] 右侧搜索框 (pill 圆角, --bg 背景)
- [ ] 通知图标 34×34 + 用户头像 32×32
- [ ] CardContent 内边距 py-6 px-7，子页面正确渲染

---

## Task 5: Dashboard 类型定义

**Files:**
- Create: `apps/backend/src/components/business/admin/dashboard/types.ts`

- [ ] **Step 1: 创建 Dashboard 类型文件**

```typescript
/**
 * File: dashboard/types.ts
 * Description: Dashboard 数据面板所有组件的 TypeScript 类型定义
 * 规格来源: Paper Design "Dashboard — 数据面板" (1O0-0)
 */

/** 系统状态指标 */
export interface SystemStatus {
  cpu: number
  memory: { used: number; total: number; unit: 'GB' }
  disk: { used: number; total: number; unit: 'GB' }
  apiResponseMs: number
  uptime: string
}

/** 交易数据指标 */
export interface TransactionData {
  todayAmount: number
  pendingOrders: number
  refunding: number
  conversionRate: number
  avgOrderValue: number
}

/** KPI 指标项 */
export interface KpiItem {
  id: string
  icon: string
  value: string
  label: string
  trend: { direction: 'up' | 'down' | 'stable'; value: string }
  colorTheme: 'orange' | 'gold' | 'teal' | 'rose' | 'brown' | 'peach'
  details: { label: string; value: string }[]
  progress?: number
}

/** 活动动态项 */
export interface ActivityItem {
  id: string
  type: 'user' | 'system' | 'refund' | 'security'
  content: string
  time: string
}

/** 折线图数据点 */
export interface TrendDataPoint {
  date: string
  value: number
}

/** 环形图分布项 */
export interface DistributionItem {
  name: string
  value: number
  percentage: number
  color: string
}

/** Dashboard 完整数据（Server Component 传递给 Client） */
export interface DashboardData {
  systemStatus: SystemStatus
  transactionData: TransactionData
  kpiItems: KpiItem[]
  activities: ActivityItem[]
  studentTrend: TrendDataPoint[]
  courseDistribution: DistributionItem[]
}

/** KPI 颜色主题到 CSS 变量的映射 */
export const KPI_COLOR_MAP = {
  orange: { bg: 'bg-ds-accent-subtle', text: 'text-ds-accent', bar: 'bg-ds-accent' },
  gold: { bg: 'bg-gold-subtle', text: 'text-gold', bar: 'bg-gold' },
  teal: { bg: 'bg-teal-subtle', text: 'text-teal', bar: 'bg-teal' },
  rose: { bg: 'bg-rose-subtle', text: 'text-rose', bar: 'bg-rose' },
  brown: { bg: 'bg-brown-subtle', text: 'text-brown', bar: 'bg-brown' },
  peach: { bg: 'bg-peach-subtle', text: 'text-peach', bar: 'bg-peach' },
} as const

/** 活动类型到色点颜色的映射 */
export const ACTIVITY_COLOR_MAP = {
  user: 'bg-peach',
  system: 'bg-teal',
  refund: 'bg-rose',
  security: 'bg-gold',
} as const

/** 趋势方向到颜色的映射 */
export const TREND_COLOR_MAP = {
  up: 'text-teal',
  down: 'text-rose',
  stable: 'text-fg-muted',
} as const
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/components/business/admin/dashboard/types.ts
git commit -m "feat: add Dashboard type definitions and color maps"
```

---

## Task 6: Dashboard TopGrid — 系统状态卡片

**Files:**
- Create: `apps/backend/src/components/business/admin/dashboard/system-status-card.tsx`

- [ ] **Step 1: 创建系统状态卡片组件**

```tsx
'use client'

import { Activity } from 'lucide-react'
import type { SystemStatus } from './types'

interface SystemStatusCardProps {
  data: SystemStatus
}

/**
 * Component: SystemStatusCard
 *
 * Description: 系统状态指标卡片（Paper Design SystemCard 1RC-0）
 *   - 5 行指标: CPU, 内存, 磁盘, API 响应, 运行时间
 *   - 每行: label + 数值(JetBrains Mono 12.5px) + 进度条(90×5px, 3px 圆角)
 *   - 子卡片样式: rounded-xl + border + bg-surface + p-5
 */
export function SystemStatusCard({ data }: SystemStatusCardProps) {
  const metrics = [
    { label: 'CPU', value: `${data.cpu}%`, progress: data.cpu / 100, color: 'bg-teal' },
    { label: '内存', value: `${data.memory.used} / ${data.memory.total} ${data.memory.unit}`, progress: data.memory.used / data.memory.total, color: 'bg-gold' },
    { label: '磁盘', value: `${data.disk.used} / ${data.disk.total} ${data.disk.unit}`, progress: data.disk.used / data.disk.total, color: 'bg-ds-accent' },
    { label: 'API 响应', value: `${data.apiResponseMs}ms`, progress: Math.min(data.apiResponseMs / 250, 1), color: 'bg-teal' },
    { label: '运行时间', value: data.uptime, progress: undefined, color: '' },
  ]

  return (
    <div className="rounded-xl bg-surface border border-border-default p-5">
      {/* 标题行 — 图标 + "系统状态" */}
      <div className="flex items-center gap-1.5 mb-4">
        <Activity className="size-4 text-teal" strokeWidth={2} />
        <h2 className="heading-2">系统状态</h2>
      </div>

      {/* 指标行列表 */}
      <div className="flex flex-col">
        {metrics.map((metric, i) => (
          <div
            key={metric.label}
            className={`flex items-center justify-between py-[11px] ${i < metrics.length - 1 ? 'border-b border-border-default' : ''}`}
          >
            <span className="font-body text-[13px] text-fg-secondary">{metric.label}</span>
            <div className="flex items-center gap-3">
              <span className="font-mono font-semibold text-[12.5px] text-fg tabular-nums">
                {metric.value}
              </span>
              {metric.progress !== undefined && (
                <div className="w-[90px] h-[5px] rounded-[3px] bg-bg overflow-hidden">
                  <div
                    className={`h-full rounded-[3px] ${metric.color}`}
                    style={{ width: `${Math.round(metric.progress * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/components/business/admin/dashboard/system-status-card.tsx
git commit -m "feat: add SystemStatusCard component for Dashboard TopGrid"
```

---

## Task 7: Dashboard TopGrid — 交易数据卡片

**Files:**
- Create: `apps/backend/src/components/business/admin/dashboard/transaction-card.tsx`

- [ ] **Step 1: 创建交易数据卡片组件**

```tsx
'use client'

import { DollarSign } from 'lucide-react'
import type { TransactionData } from './types'

interface TransactionCardProps {
  data: TransactionData
}

/**
 * Component: TransactionCard
 *
 * Description: 交易数据指标卡片（Paper Design TransactionCard 1S4-0）
 *   - 5 行指标: 今日交易额, 待处理订单, 退款中, 转化率, 客单价
 *   - 语义色: 交易额(teal), 订单(gold), 退款(rose), 其余(fg)
 */
export function TransactionCard({ data }: TransactionCardProps) {
  const metrics = [
    { label: '今日交易额', value: `¥${data.todayAmount.toLocaleString()}`, color: 'text-teal' },
    { label: '待处理订单', value: `${data.pendingOrders} 笔`, color: 'text-gold' },
    { label: '退款中', value: `${data.refunding} 笔`, color: 'text-rose' },
    { label: '今日转化率', value: `${data.conversionRate}%`, color: 'text-fg', progress: data.conversionRate / 10, progressColor: 'bg-teal' },
    { label: '客单价', value: `¥${data.avgOrderValue.toLocaleString()}`, color: 'text-fg' },
  ]

  return (
    <div className="rounded-xl bg-surface border border-border-default p-5">
      {/* 标题行 — 图标 + "交易数据" */}
      <div className="flex items-center gap-1.5 mb-4">
        <DollarSign className="size-4 text-ds-accent" strokeWidth={2} />
        <h2 className="heading-2">交易数据</h2>
      </div>

      {/* 指标行列表 */}
      <div className="flex flex-col">
        {metrics.map((metric, i) => (
          <div
            key={metric.label}
            className={`flex items-center justify-between py-[11px] ${i < metrics.length - 1 ? 'border-b border-border-default' : ''}`}
          >
            <span className="font-body text-[13px] text-fg-secondary">{metric.label}</span>
            <div className="flex items-center gap-3">
              <span className={`font-mono font-semibold text-[12.5px] tabular-nums ${metric.color}`}>
                {metric.value}
              </span>
              {metric.progress !== undefined && (
                <div className="w-[90px] h-[5px] rounded-[3px] bg-bg overflow-hidden">
                  <div
                    className={`h-full rounded-[3px] ${metric.progressColor}`}
                    style={{ width: `${Math.round(metric.progress * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/components/business/admin/dashboard/transaction-card.tsx
git commit -m "feat: add TransactionCard component for Dashboard TopGrid"
```

---

## Task 8: Dashboard KPI 指标条 + 活动 Feed

**Files:**
- Create: `apps/backend/src/components/business/admin/dashboard/kpi-cell.tsx`
- Create: `apps/backend/src/components/business/admin/dashboard/kpi-strip.tsx`
- Create: `apps/backend/src/components/business/admin/dashboard/activity-feed.tsx`

- [ ] **Step 1: 创建 KPI 单元组件 (kpi-cell.tsx)**

```tsx
'use client'

import * as LucideIcons from 'lucide-react'
import type { KpiItem } from './types'
import { KPI_COLOR_MAP, TREND_COLOR_MAP } from './types'

interface KpiCellProps {
  item: KpiItem
  isLast: boolean
}

/**
 * Component: KpiCell
 *
 * Description: 单个 KPI 指标单元（Paper Design KPI 列 243-0 ~ 26L-0）
 *   - 图标色块 28×28px
 *   - 数值 Outfit 600 18px tabular-nums
 *   - 标签 11px --fg-muted
 *   - 趋势标签 rounded-full 10px
 *   - 底部分隔线 + 详情区 (2 行 key-value + 3px 进度条)
 *   - 列间 border-r 分割线（最后一列无）
 */
export function KpiCell({ item, isLast }: KpiCellProps) {
  const colors = KPI_COLOR_MAP[item.colorTheme]
  const trendColor = TREND_COLOR_MAP[item.trend.direction]
  // 动态图标解析
  const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>>)[item.icon]

  return (
    <div className={`flex flex-col py-0 px-3.5 ${!isLast ? 'border-r border-border-default' : ''}`}>
      {/* 图标色块 */}
      <div className={`flex items-center justify-center size-7 rounded-md ${colors.bg}`}>
        {IconComponent && <IconComponent className={`size-3.5 ${colors.text}`} strokeWidth={2} />}
      </div>

      {/* 数值 */}
      <span className="font-display font-semibold text-[18px] leading-[22px] text-fg mt-2 tabular-nums">
        {item.value}
      </span>

      {/* 标签 */}
      <span className="text-caption mt-0.5">{item.label}</span>

      {/* 趋势标签 */}
      <div className={`inline-flex items-center rounded-full py-px px-1.5 mt-1.5 self-start ${trendColor}`}>
        <span className="font-body font-semibold text-[10px] leading-[12px]">
          {item.trend.direction === 'up' ? '↑' : item.trend.direction === 'down' ? '↓' : ''} {item.trend.value}
        </span>
      </div>

      {/* 底部分隔线 */}
      <div className="border-t border-[rgba(38,37,30,0.06)] mt-3 pt-2.5">
        {item.details.map((detail) => (
          <div key={detail.label} className="flex justify-between mb-1 last:mb-0">
            <span className="text-caption">{detail.label}</span>
            <span className="font-mono font-medium text-[11px] text-fg-secondary tabular-nums">{detail.value}</span>
          </div>
        ))}

        {/* 进度条 */}
        {item.progress !== undefined && (
          <div className="w-full h-[3px] rounded-xs bg-bg overflow-hidden mt-1.5">
            <div
              className={`h-full rounded-xs ${colors.bar}`}
              style={{ width: `${Math.round(item.progress * 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 KPI 指标条组件 (kpi-strip.tsx)**

```tsx
'use client'

import type { KpiItem } from './types'
import { KpiCell } from './kpi-cell'

interface KpiStripProps {
  items: KpiItem[]
}

/**
 * Component: KpiStrip
 *
 * Description: KPI 指标条容器（Paper Design KpiStrip 242-0）
 *   - 6 列等宽网格
 *   - 容器: rounded-xl + border + bg-surface + py-4 px-5
 */
export function KpiStrip({ items }: KpiStripProps) {
  return (
    <div className="rounded-xl bg-surface border border-border-default py-4 px-5">
      <div className="grid grid-cols-6">
        {items.map((item, i) => (
          <KpiCell key={item.id} item={item} isLast={i === items.length - 1} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 创建活动 Feed 组件 (activity-feed.tsx)**

```tsx
'use client'

import type { ActivityItem } from './types'
import { ACTIVITY_COLOR_MAP } from './types'

interface ActivityFeedProps {
  activities: ActivityItem[]
}

/**
 * Component: ActivityFeed
 *
 * Description: 最近动态时间线（Paper Design ActivityFeed 274-0）
 *   - 标题: "最近动态" Outfit 600 15px
 *   - 每条: 色点 7×7px + 内容 13px + 时间戳 11.5px
 *   - 条目间距 py-3, 底部 border 分割
 */
export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="rounded-xl bg-surface border border-border-default p-5">
      <h2 className="heading-2 mb-3">最近动态</h2>

      <div className="flex flex-col">
        {activities.map((activity, i) => {
          const dotColor = ACTIVITY_COLOR_MAP[activity.type]
          return (
            <div
              key={activity.id}
              className={`flex items-start py-3 gap-2.5 ${i < activities.length - 1 ? 'border-b border-border-default' : ''}`}
            >
              {/* 色点 */}
              <div className={`w-[7px] h-[7px] mt-1.5 shrink-0 rounded-full ${dotColor}`} />

              {/* 内容 */}
              <span className="font-body text-[13px] leading-[16px] text-fg grow">
                {activity.content}
              </span>

              {/* 时间戳 */}
              <span className="font-body text-[11.5px] leading-[14px] text-fg-muted shrink-0">
                {activity.time}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/components/business/admin/dashboard/kpi-cell.tsx \
        apps/backend/src/components/business/admin/dashboard/kpi-strip.tsx \
        apps/backend/src/components/business/admin/dashboard/activity-feed.tsx
git commit -m "feat: add KPI strip and Activity Feed components for Dashboard"
```

---

## Task 9: Dashboard 图表区 — 折线图 + 环形图

**Files:**
- Create: `apps/backend/src/components/business/admin/dashboard/student-trend-chart.tsx`
- Create: `apps/backend/src/components/business/admin/dashboard/course-distribution-chart.tsx`

- [ ] **Step 1: 创建折线图组件 (student-trend-chart.tsx)**

```tsx
'use client'

import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { TrendDataPoint } from './types'

interface StudentTrendChartProps {
  data: TrendDataPoint[]
}

/**
 * Component: StudentTrendChart
 *
 * Description: 学员增长趋势折线图（Paper Design LineChartCard 1V4-0）
 *   - Tab 切换: 周/月/年
 *   - 渐变填充: accent 12% 透明度 → 透明
 *   - 折线: accent 色, strokeWidth 2.5
 *   - 数据点: 白色填充 + accent 边框
 *   - 网格线: border 颜色
 */
export function StudentTrendChart({ data }: StudentTrendChartProps) {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')

  const tabs = [
    { key: 'week' as const, label: '周' },
    { key: 'month' as const, label: '月' },
    { key: 'year' as const, label: '年' },
  ]

  return (
    <div className="rounded-xl bg-surface border border-border-default p-5">
      {/* 标题行 + Tab 切换 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="heading-2">学员增长趋势</h2>
        <div className="flex gap-[3px]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPeriod(tab.key)}
              className={`rounded-full py-1 px-[11px] text-[13px] leading-[16px] font-body font-medium border transition-colors ${
                period === tab.key
                  ? 'bg-ds-accent border-ds-accent text-white'
                  : 'bg-surface border-border-default text-fg-secondary hover:bg-surface-alt'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 图表 */}
      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--ds-accent)" stopOpacity={0.12} />
                <stop offset="100%" stopColor="var(--ds-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="0" stroke="var(--border-default)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--fg-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--fg-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--ds-accent)"
              strokeWidth={2.5}
              fill="url(#trendGradient)"
              dot={{ fill: 'white', stroke: 'var(--ds-accent)', strokeWidth: 2, r: 4 }}
              activeDot={{ fill: 'var(--ds-accent)', stroke: 'white', strokeWidth: 2, r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建环形图组件 (course-distribution-chart.tsx)**

```tsx
'use client'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import type { DistributionItem } from './types'

interface CourseDistributionChartProps {
  data: DistributionItem[]
}

/**
 * Component: CourseDistributionChart
 *
 * Description: 课程分类分布环形图（Paper Design DonutChartCard 1WW-0）
 *   - 5 色数据系列: accent, gold, teal, rose, brown
 *   - 中心汇总值: Outfit 600 22px + "总课程" 11px
 *   - 右侧图例: 色块 9×9px + 分类名 + 百分比
 */
export function CourseDistributionChart({ data }: CourseDistributionChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="rounded-xl bg-surface border border-border-default p-5">
      <h2 className="heading-2 mb-4">课程分类分布</h2>

      <div className="flex items-center gap-6">
        {/* 环形图 */}
        <div className="relative w-[150px] h-[150px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* 中心汇总值 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display font-semibold text-[22px] leading-[28px] text-fg tabular-nums">
              {total}
            </span>
            <span className="text-caption">总课程</span>
          </div>
        </div>

        {/* 图例列表 */}
        <div className="flex flex-col gap-2.5 grow">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2.5">
              <div
                className="w-[9px] h-[9px] rounded-[3px] shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-body text-[13px] text-fg-secondary grow">{item.name}</span>
              <span className="font-mono font-semibold text-[13px] text-fg tabular-nums">
                {item.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/components/business/admin/dashboard/student-trend-chart.tsx \
        apps/backend/src/components/business/admin/dashboard/course-distribution-chart.tsx
git commit -m "feat: add StudentTrendChart and CourseDistributionChart for Dashboard"
```

---

## Task 10: Dashboard 客户端主组件

**Files:**
- Create: `apps/backend/src/components/business/admin/dashboard/dashboard-client.tsx`

将所有 Dashboard 子组件组装到一起。

- [ ] **Step 1: 创建 DashboardClient 组件**

```tsx
'use client'

import type { DashboardData } from './types'
import { SystemStatusCard } from './system-status-card'
import { TransactionCard } from './transaction-card'
import { KpiStrip } from './kpi-strip'
import { ActivityFeed } from './activity-feed'
import { StudentTrendChart } from './student-trend-chart'
import { CourseDistributionChart } from './course-distribution-chart'

interface DashboardClientProps {
  data: DashboardData
}

/**
 * Component: DashboardClient
 *
 * Description: Dashboard 数据面板客户端组件（Paper Design Dashboard 1O0-0 CardContent）
 * 布局结构（自上而下）:
 *   1. TopGrid: 系统状态 + 交易数据 (grid-cols-2 gap-4)
 *   2. KpiActivityRow: KPI 指标条 + 活动 Feed (grid-cols-[1.2fr_1fr] gap-4)
 *   3. ChartsGrid: 折线图 + 环形图 (grid-cols-[1.4fr_1fr] gap-4)
 */
export function DashboardClient({ data }: DashboardClientProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* 1. TopGrid — 系统状态 + 交易数据 */}
      <div className="grid grid-cols-2 gap-4">
        <SystemStatusCard data={data.systemStatus} />
        <TransactionCard data={data.transactionData} />
      </div>

      {/* 2. KpiActivityRow — KPI 指标条 + 活动 Feed */}
      <div className="grid grid-cols-[1.2fr_1fr] gap-4">
        <KpiStrip items={data.kpiItems} />
        <ActivityFeed activities={data.activities} />
      </div>

      {/* 3. ChartsGrid — 折线图 + 环形图 */}
      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <StudentTrendChart data={data.studentTrend} />
        <CourseDistributionChart data={data.courseDistribution} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/components/business/admin/dashboard/dashboard-client.tsx
git commit -m "feat: add DashboardClient component assembling all dashboard sections"
```

---

## Task 11: Dashboard Server Component — 数据获取 + 页面集成

**Files:**
- Modify: `apps/backend/src/app/admin/page.tsx`

替换当前 AdminDashboardShell 为新 Dashboard。由于后端 API 可能尚未全部就绪，此 Task 先用临时 fallback 数据结构让页面可渲染，后续 Task 对接真实 API。

- [ ] **Step 1: 重写 admin/page.tsx**

```tsx
import { connection } from 'next/server'
import { DashboardClient } from '@/components/business/admin/dashboard/dashboard-client'
import type { DashboardData } from '@/components/business/admin/dashboard/types'

/**
 * Function: getDashboardData
 *
 * Description: 获取 Dashboard 所有数据（Server Component 端）
 * TODO: 对接真实后端 API，当前使用 fallback 空数据
 */
async function getDashboardData(): Promise<DashboardData> {
  // TODO: 对接真实 API
  // const [systemStatus, transactions, kpi, activities, trend, distribution] = await Promise.all([...])

  // Fallback: 空数据结构，确保页面可渲染
  return {
    systemStatus: {
      cpu: 0,
      memory: { used: 0, total: 16, unit: 'GB' },
      disk: { used: 0, total: 500, unit: 'GB' },
      apiResponseMs: 0,
      uptime: '加载中...',
    },
    transactionData: {
      todayAmount: 0,
      pendingOrders: 0,
      refunding: 0,
      conversionRate: 0,
      avgOrderValue: 0,
    },
    kpiItems: [],
    activities: [],
    studentTrend: [],
    courseDistribution: [],
  }
}

/**
 * Page: AdminHomePage
 *
 * Description: 管理后台首页 — 数据面板
 * Server Component 获取数据，传递给 Client Component 渲染
 */
export default async function AdminHomePage() {
  void (await connection())
  const data = await getDashboardData()

  return <DashboardClient data={data} />
}
```

- [ ] **Step 2: 删除旧 Dashboard 组件**

```bash
rm apps/backend/src/components/business/admin/admin-dashboard-shell.tsx
rm apps/backend/src/components/business/admin/admin-dashboard.tsx
rm apps/backend/src/components/business/admin/ecommerce-dashboard-section.tsx
```

- [ ] **Step 3: 运行 typecheck**

Run: `cd apps/backend && npx tsc --noEmit`
Expected: 通过

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/app/admin/page.tsx
git add -u apps/backend/src/components/business/admin/admin-dashboard-shell.tsx \
         apps/backend/src/components/business/admin/admin-dashboard.tsx \
         apps/backend/src/components/business/admin/ecommerce-dashboard-section.tsx
git commit -m "refactor: replace old dashboard with new Paper Design dashboard layout"
```

---

## 🔍 CP3: Dashboard TopGrid 视觉验证

启动 dev server，打开 `/admin`，截取 TopGrid 区域截图。

对比 Paper Design Dashboard TopGrid 部分：
- [ ] 2 列等宽布局，gap 16px
- [ ] 子卡片 rounded-xl + border + 白色背景 + p-5
- [ ] 系统状态 5 行指标 + 进度条正确渲染
- [ ] 交易数据 5 行指标 + 语义色正确
- [ ] 行间距、字体大小、颜色完全匹配

---

## 🔍 CP4: Dashboard KPI + ActivityFeed 视觉验证

截取 KpiActivityRow 区域截图。

对比 Paper Design Dashboard KpiActivityRow 部分：
- [ ] KPI 条 6 列等宽，列间分割线
- [ ] 每个 KPI：图标色块 28×28 + 数值 Outfit 600 18px + 标签 + 趋势标签
- [ ] 6 个 KPI 颜色主题按序使用
- [ ] 底部详情区：key-value 行 + 进度条 3px
- [ ] 活动 Feed：色点 7×7 + 内容 + 时间戳，间距匹配

---

## 🔍 CP5: Dashboard 图表区视觉验证

截取 ChartsGrid 区域截图。

对比 Paper Design Dashboard ChartsGrid 部分：
- [ ] 1.4:1 网格比例
- [ ] 折线图：渐变填充 + 数据点 + Tab 切换
- [ ] 环形图：5 色数据系列 + 中心汇总值 + 右侧图例
- [ ] 图表颜色严格按色板顺序
- [ ] 轴标签 11px，网格线 border 颜色

---

## Task 12: 对接真实后端 API

**Files:**
- Modify: `apps/backend/src/app/admin/page.tsx`

将 Task 11 中的 fallback 数据替换为真实 API 调用。此 Task 需要检查现有 API 端点，缺失的端点需新增。

- [ ] **Step 1: 调查现有 API 端点**

在 `apps/backend/src/app/api/admin/` 目录下搜索已有的 dashboard/stats/analytics 相关端点，列出可用和缺失的端点。

- [ ] **Step 2: 新增缺失的 API 端点**

根据 Task 1 调查结果，新增以下端点（如果缺失）：
- `GET /api/admin/dashboard/system-status` — 系统监控数据
- `GET /api/admin/dashboard/transactions` — 交易数据
- `GET /api/admin/dashboard/kpi` — KPI 指标
- `GET /api/admin/dashboard/activities` — 活动 Feed
- `GET /api/admin/dashboard/student-trend` — 学员趋势
- `GET /api/admin/dashboard/course-distribution` — 课程分布

- [ ] **Step 3: 更新 admin/page.tsx 对接真实 API**

替换 `getDashboardData()` 中的 fallback 逻辑为真实 API 调用。

- [ ] **Step 4: 运行 E2E 测试**

Run: `cd apps/backend && npx playwright test`
Expected: 所有新增 API 端点的 E2E 测试通过

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/app/api/admin/dashboard/ apps/backend/src/app/admin/page.tsx
git commit -m "feat: integrate Dashboard with real backend API endpoints"
```

---

## 🔍 CP6: 全页面集成验证

截取完整页面截图。

对比 Paper Design `Dashboard — 数据面板` (1O0-0) 整体：
- [ ] 整体布局与 Paper Design 一致
- [ ] 4 个区域间距 gap-6 (24px)
- [ ] 数据来自真实 API，无 mock
- [ ] 响应式：小屏侧边栏变为抽屉
- [ ] 通过 lint + typecheck
- [ ] 新增 API 有 E2E 测试覆盖

---

## Self-Review

**1. Spec coverage:**
- ✅ AppShell 整体布局 → Task 4
- ✅ 侧边栏品牌区 → Task 2
- ✅ 侧边栏导航 10 项 → Task 1 + Task 3
- ✅ 侧边栏退出登录 → Task 2
- ✅ MainCard CardHeader → Task 4
- ✅ MainCard CardContent → Task 4
- ✅ Dashboard TopGrid 系统状态 → Task 6
- ✅ Dashboard TopGrid 交易数据 → Task 7
- ✅ Dashboard KPI 条 → Task 8
- ✅ Dashboard 活动 Feed → Task 8
- ✅ Dashboard 折线图 → Task 9
- ✅ Dashboard 环形图 → Task 9
- ✅ Dashboard 组装 → Task 10
- ✅ Server Component 数据获取 → Task 11
- ✅ 真实 API 对接 → Task 12
- ✅ 响应式适配 → 侧边栏 `collapsible="none"` + 后续按需
- ⚠️ 搜索框功能 (⌘K) → 仅 UI，功能后续实现
- ✅ 6 个 Checkpoint → 每个 Task 组后都有

**2. Placeholder scan:**
- 无 "TBD"、"TODO"（除 API 对接标注的 TODO，这在 Task 12 中解决）
- 无 "implement later"、"fill in details"

**3. Type consistency:**
- `DashboardData` 在 types.ts 定义，在 page.tsx 构建，在 dashboard-client.tsx 消费 — 一致
- `KpiItem.colorTheme` 枚举值与 `KPI_COLOR_MAP` 键名匹配 — 一致
- `ActivityItem.type` 枚举值与 `ACTIVITY_COLOR_MAP` 键名匹配 — 一致
