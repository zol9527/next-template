'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

/**
 * Type: BreadcrumbItem
 *
 * Description: 面包屑导航项
 */
export interface BreadcrumbItem {
  label: string
  href?: string
}

/**
 * Type: HeaderContent
 *
 * Description: 页面注册到 CardHeader slot 的内容结构。
 *   支持静态文本和交互式 ReactNode。
 *
 * 渲染规则:
 *   CardHeader 上半部分 (主行):
 *     左侧: breadcrumbs → title + description / tabs
 *     右侧: actions → 共享元素 (搜索框+更新日志+用户头像)
 *   CardHeader 下半部分 (可选):
 *     filterBar: 筛选栏 (类型标签、状态条等)
 */
export interface HeaderContent {
  /** 页面标题 (必填) */
  title: string
  /** 补充说明 (可选) */
  description?: string
  /** 面包屑导航 (可选) */
  breadcrumbs?: BreadcrumbItem[]
  /**
   * 右侧操作区 (可选)
   * 交互式 ReactNode：搜索框、按钮等
   * 如果提供，会替代共享的搜索框位置
   */
  actions?: ReactNode
  /**
   * Tab 导航 (可选)
   * 交互式 ReactNode：完整的 TabBar 组件
   * 如果提供，title 和 description 会被隐藏，tabs 占据左侧
   */
  tabs?: ReactNode
  /**
   * 筛选栏 (可选)
   * 交互式 ReactNode：筛选标签、状态条等
   * 渲染在 CardHeader 主行下方，有独立的 border-bottom
   */
  filterBar?: ReactNode
}

/**
 * Type: AdminHeaderContextValue
 */
interface AdminHeaderContextValue {
  headerContent: HeaderContent | null
  setHeaderContent: (content: HeaderContent | null) => void
}

const AdminHeaderContext = createContext<AdminHeaderContextValue | null>(null)

/**
 * Component: AdminHeaderProvider
 *
 * Description: 包裹在 Admin Layout 内部，为所有 admin 子页面提供
 *   header 内容注册能力。
 */
export function AdminHeaderProvider({ children }: { children: ReactNode }) {
  const [headerContent, setHeaderContentState] = useState<HeaderContent | null>(null)

  const setHeaderContent = useCallback((content: HeaderContent | null) => {
    setHeaderContentState(content)
  }, [])

  return (
    <AdminHeaderContext.Provider value={{ headerContent, setHeaderContent }}>
      {children}
    </AdminHeaderContext.Provider>
  )
}

/**
 * Hook: useAdminHeader
 *
 * Description: 页面组件使用此 hook 注册自己的 header 内容。
 */
export function useAdminHeader() {
  const context = useContext(AdminHeaderContext)
  if (!context) {
    throw new Error('useAdminHeader must be used within an AdminHeaderProvider')
  }
  return context
}
