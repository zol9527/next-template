'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useAdminHeader, type BreadcrumbItem } from '@/components/layout/admin-header-context'

/**
 * Type: AdminPageHeaderProps
 *
 * Description: 页面级 Header 配置
 */
interface AdminPageHeaderProps {
  /** 页面标题 (必填，当 tabs 未提供时显示) */
  title: string
  /** 补充说明 (可选) */
  description?: string
  /** 面包屑 (可选) */
  breadcrumbs?: BreadcrumbItem[]
  /**
   * 右侧操作区 (可选)
   * 交互式 ReactNode：搜索框、按钮等
   * 替代共享搜索框的位置
   */
  actions?: React.ReactNode
  /**
   * Tab 导航 (可选)
   * 交互式 ReactNode：完整的 TabBar 组件
   * 如果提供，title/description 会被隐藏，tabs 占据左侧
   */
  tabs?: React.ReactNode
  /**
   * 筛选栏 (可选)
   * 交互式 ReactNode：筛选标签、状态条等
   * 渲染在 CardHeader 主行下方
   */
  filterBar?: React.ReactNode
}

/**
 * Component: AdminPageHeader
 *
 * Description: 页面级 Header 注入器。
 *   不渲染任何可见 DOM，仅通过 context 注册内容到 AdminShellClient 的 CardHeader。
 *
 * 使用方式:
 *   // 简单页面
 *   <AdminPageHeader title="仪表盘" description="数据概览" />
 *
 *   // 带 Tab 导航的页面
 *   <AdminPageHeader title="商城管理" tabs={<ShopTabBar active="products" />} />
 *
 *   // 带操作按钮和筛选栏
 *   <AdminPageHeader
 *     title="媒体库"
 *     breadcrumbs={[{ label: '内容管理' }, { label: '媒体库' }]}
 *     actions={<><SearchInput /><UploadButton /></>}
 *     filterBar={<MediaFilterBar ... />}
 *   />
 */
export function AdminPageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  tabs,
  filterBar,
}: AdminPageHeaderProps) {
  const { setHeaderContent } = useAdminHeader()

  useEffect(() => {
    setHeaderContent({ title, description, breadcrumbs, actions, tabs, filterBar })

    // unmount 时清除
    return () => {
      setHeaderContent(null)
    }
  }, [title, description, breadcrumbs, actions, tabs, filterBar, setHeaderContent])

  // 不渲染任何 DOM
  return null
}

/**
 * Component: AdminHeaderBreadcrumbs
 *
 * Description: 面包屑导航渲染（由 AdminShellClient 内部使用）
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
