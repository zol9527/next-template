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
