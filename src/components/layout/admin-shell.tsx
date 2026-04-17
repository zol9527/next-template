import type { ReactNode } from 'react'
import { AdminShellClient } from './admin-shell-client'

/**
 * Function: AdminShell
 *
 * Description: 后台管理系统外壳组件（服务端组件）
 *
 * Parameters:
 *     children(ReactNode): 子组件内容（页面内容）
 *
 * Returns:
 *     React.ReactElement: 包含完整后台布局的 React 元素
 *
 * Features:
 *     - 提供整体布局结构（侧边栏 + 主内容区）
 *     - 集成 shadcn/ui Sidebar 状态管理
 */
export async function AdminShell({
  children,
  enabledPlugins,
}: {
  children: ReactNode
  enabledPlugins: Record<string, boolean>
}) {
  return (
    <AdminShellClient enabledPlugins={enabledPlugins}>
      {children}
    </AdminShellClient>
  )
}
