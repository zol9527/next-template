'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

/**
 * Type: HeaderContent
 *
 * Description: 页面注册到 CardHeader 左侧 slot 的内容结构
 *   - title: 页面标题 (必填)
 *   - breadcrumbs: 面包屑导航 (可选)
 *   - actions: 右侧操作区 ReactNode (可选)
 *   - tabs: Tab 导航配置 (可选)
 */
export interface HeaderContent {
  title: string
  description?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
  actions?: ReactNode
  tabs?: Array<{ label: string; href: string; active?: boolean }>
}

/**
 * Type: AdminHeaderContextValue
 *
 * Description: AdminHeaderContext 提供的值
 *   - headerContent: 当前注册的 header 内容 (null 表示未注册，使用 fallback)
 *   - setHeaderContent: 页面调用此方法注册自己的 header
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
 *   header 内容注册能力。页面通过 useAdminHeader() hook 注册自己的
 *   header 内容，AdminShellClient 从 context 读取并渲染在 CardHeader 左侧。
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
 * Description: 页面组件使用此 hook 获取 setHeaderContent 方法，
 *   在 mount 时注册 header 内容，unmount 时清除。
 *
 * 注意: 此 hook 只能在 Client Component 中使用。
 */
export function useAdminHeader() {
  const context = useContext(AdminHeaderContext)
  if (!context) {
    throw new Error('useAdminHeader must be used within an AdminHeaderProvider')
  }
  return context
}
