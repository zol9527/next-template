'use client'

import { useAuth } from '@/hooks/use-auth'
import { useAccess } from '@/hooks/use-access'
import { SystemMonitorSection } from '@/components/business/admin/system-monitor/system-monitor-section'
import { EcommerceDashboardSection } from '@/components/business/admin/ecommerce-dashboard-section'

interface AdminDashboardShellProps {
  /** 已启用的插件列表 */
  enabledPlugins?: string[]
}

/**
 * Function: AdminDashboardShell
 *
 * Description: 管理后台仪表盘条件渲染壳组件
 *              根据用户权限和插件状态决定显示内容：
 *              - 所有已登录用户：Welcome 区域
 *              - 有 dashboard read 权限：系统监控区域
 *              - ecommerce 插件启用：电商数据区域
 *
 * Parameters:
 *     enabledPlugins(string[]): 已启用的插件列表，默认为空数组
 *
 * Returns:
 *     JSX.Element: 条件渲染的仪表盘内容
 */
export function AdminDashboardShell({ enabledPlugins = [] }: AdminDashboardShellProps) {
  const { user, isAuthenticated } = useAuth()
  const access = useAccess()

  const canReadDashboard = access.canRead('dashboard')
  const isEcommerceEnabled = enabledPlugins.includes('ecommerce')

  return (
    <div className="space-y-6">
      {/* Welcome 区域 — 所有已登录用户可见 */}
      {isAuthenticated && user && (
        <section data-testid="welcome-section" className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">
            欢迎回来，{user.username || user.email || '管理员'}
          </h1>
          <p className="text-sm text-muted-foreground">
            今天是 {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </section>
      )}

      {/* 系统监控区域 — 有 dashboard read 权限的用户可见 */}
      {canReadDashboard && (
        <SystemMonitorSection />
      )}

      {/* 电商数据区域 — ecommerce 插件启用时可见 */}
      {isEcommerceEnabled && (
        <section data-testid="ecommerce-section">
          <EcommerceDashboardSection />
        </section>
      )}
    </div>
  )
}
