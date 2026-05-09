'use client'

import { AdminDashboard } from '@/components/business/admin/admin-dashboard'

/**
 * Function: EcommerceDashboardSection
 *
 * Description: 电商数据仪表盘区块，包装现有的 AdminDashboard 组件
 *              仅在 ecommerce 插件启用时渲染
 *
 * Returns:
 *     JSX.Element: 包含 AdminDashboard 的区块组件
 */
export function EcommerceDashboardSection() {
  return <AdminDashboard />
}
