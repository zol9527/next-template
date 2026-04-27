'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AuthContext } from '@/components/context/auth-context'
import { User, LogOut, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/toast'

/**
 * File: app-sidebar-header.tsx
 * Description: 侧边栏头部用户信息组件
 * Function: AppSidebarHeader
 *
 * Description: 侧边栏头部用户信息显示组件，展示用户头像和昵称，支持下拉菜单操作
 *
 * Returns:
 *     React.ReactElement: 用户信息组件
 */
export function AppSidebarHeader() {
  const router = useRouter()
  const { toast } = useToast()
  const auth = React.useContext(AuthContext)
  const { user, isLoading, logout } = auth || { user: null, isLoading: false, logout: async () => {} }

  // 获取显示名称：优先使用 username，其次使用 email，最后使用 phone
  const displayName = user?.username || user?.email || user?.phone || '未知用户'

  // 获取头像 URL，如果没有则使用占位符
  const avatarUrl = user?.avatarUrl

  /**
   * Function: handleNavigateToProfile
   *
   * Description: 导航到个人资料页面
   *
   * Returns:
   *     void: 无返回值
   */
  const handleNavigateToProfile = () => {
    router.push('/admin/profile')
  }

  /**
   * Function: handleLogout
   *
   * Description: 处理用户退出登录操作
   *
   * Returns:
   *     Promise<void>: 异步操作完成
   */
  const handleLogout = async () => {
    try {
      await logout()
      toast({
        title: '退出成功',
        description: '您已成功退出登录',
      })
      router.replace('/')
    } catch {
      toast({
        title: '退出失败',
        description: '退出登录时发生错误，请稍后重试',
        variant: 'destructive',
      })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:size-8"
          )}
        >
          {/* 用户头像 */}
          <div className="flex shrink-0 items-center justify-center rounded-lg bg-white/10 text-white h-9 w-9 group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:w-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-full w-full rounded-lg object-cover ring-2 ring-white/20"
              />
            ) : (
              <User className="h-4 w-4 group-data-[collapsible=icon]:h-2 group-data-[collapsible=icon]:w-2" />
            )}
          </div>

          {/* 用户名称（展开时显示） */}
          <span className="text-sm font-medium text-sidebar-foreground sidebar-expanded:opacity-100 group-data-[collapsible=icon]:hidden">
            {isLoading ? '...' : displayName}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-48"
      >
        <DropdownMenuItem onClick={handleNavigateToProfile}>
          <UserCircle className="mr-2 h-4 w-4" />
          <span>个人资料</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>退出登录</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
