'use client'

import { UserManagementPage } from '@/components/business/admin/user/user-management-page'
import { AdminPageHeader } from '@/components/ui/admin-page-header'

/**
 * 用户管理页面路由入口
 *
 * 合并了用户列表和角色管理为单页 Tab 切换
 * 路由: /admin/users
 */
export default function AdminUsersPage() {
  return (
    <>
      <AdminPageHeader title="用户管理" description="管理用户账户和角色权限" />
      <UserManagementPage />
    </>
  )
}
