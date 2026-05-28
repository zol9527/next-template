'use client'

import { UserManagementPage } from '@/components/business/admin/user/user-management-page'

/**
 * 用户管理页面路由入口
 *
 * Header 由 UserManagementPage 内部通过 AdminPageHeader 注入:
 *   第一行: 标题 + 说明 + 操作按钮（搜索/筛选/添加用户/添加角色）
 *   第二行: Tab 导航（用户列表 / 角色管理）
 *
 * 路由: /admin/users
 */
export default function AdminUsersPage() {
  return <UserManagementPage />
}
