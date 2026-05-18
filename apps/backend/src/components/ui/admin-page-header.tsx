'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useAdminHeader, type HeaderContent } from '@/components/layout/admin-header-context'

/**
 * Type: BreadcrumbItem
 *
 * Description: 面包屑导航项
 */
interface BreadcrumbItem {
  label: string
  href?: string
}

/**
 * Type: HeaderTab
 *
 * Description: Header Tab 导航项
 */
interface HeaderTab {
  label: string
  href: string
  active?: boolean
}

/**
 * Type: AdminPageHeaderProps
 *
 * Description: 页面级 Header 配置
 *   - title: 页面标题 (必填)
 *   - description: 补充说明 (可选)
 *   - breadcrumbs: 面包屑 (可选，自动根据路由生成首页链接)
 *   - actions: 操作按钮区 (可选，渲染到 CardHeader 右侧)
 *   - tabs: Tab 导航 (可选，渲染在标题下方)
 */
interface AdminPageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  tabs?: HeaderTab[]
}

/**
 * Component: AdminPageHeader
 *
 * Description: 页面级 Header 注入器。
 *   调用此组件会将 header 内容注册到 AdminHeaderContext，
 *   由 AdminShellClient 在 CardHeader 左侧 slot 中渲染。
 *
 * 使用方式:
 *   在页面组件的顶层调用即可:
 *   <AdminPageHeader title="博客管理" description="管理所有文章" />
 *
 * 注意:
 *   - 此组件不渲染任何可见 DOM，仅通过 context 注册内容
 *   - 页面 unmount 时自动清除注册的 header
 *   - 必须在 AdminHeaderProvider 内部使用
 */
export function AdminPageHeader({ title, description, breadcrumbs, actions, tabs }: AdminPageHeaderProps) {
  const { setHeaderContent } = useAdminHeader()

  useEffect(() => {
    // 注册 header 内容到 context
    setHeaderContent({ title, description, breadcrumbs, actions, tabs })

    // unmount 时清除，恢复为默认 (pathname-based) 标题
    return () => {
      setHeaderContent(null)
    }
  }, [title, description, breadcrumbs, actions, tabs, setHeaderContent])

  // 不渲染任何 DOM，仅作为 context 注入器
  return null
}

/**
 * Component: AdminHeaderBreadcrumbs
 *
 * Description: 面包屑导航渲染组件，由 AdminShellClient 内部使用
 */
export function AdminHeaderBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1 text-caption" aria-label="面包屑导航">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="size-3 text-fg-muted" strokeWidth={2} />}
          {item.href && index < items.length - 1 ? (
            <Link
              href={item.href}
              className="text-fg-secondary hover:text-ds-accent transition-colors duration-150"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-fg font-semibold">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

/**
 * Component: AdminHeaderTabs
 *
 * Description: Header Tab 导航渲染组件，由 AdminShellClient 内部使用
 */
export function AdminHeaderTabs({ tabs }: { tabs: HeaderTab[] }) {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1" aria-label="页面 Tab 导航">
      {tabs.map((tab) => {
        // 自动判断 active: 如果提供了 active 属性用那个，否则根据 pathname 判断
        const isActive = tab.active ?? pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`
              inline-flex items-center px-3 py-1 rounded-pill text-[12px] font-medium
              transition-colors duration-150
              ${isActive
                ? 'bg-ds-accent text-white'
                : 'bg-transparent text-fg-secondary border border-border-default hover:bg-bg'
              }
            `}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
