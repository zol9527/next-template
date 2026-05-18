'use client'

import { UserManagementPage } from '@/components/business/admin/user/user-management-page'

/**
 * 用户管理页面路由入口
 *
 * 合并了用户列表和角色管理为单页 Tab 切换
 * 路由: /admin/users
 */
export default function AdminUsersPage() {
  return <UserManagementPage />
}
