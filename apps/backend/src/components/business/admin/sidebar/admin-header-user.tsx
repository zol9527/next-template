'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AuthContext } from '@/components/context/auth-context'
import { LogOut, UserCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/toast'

/**
 * File: admin-header-user.tsx
 * Description: CardHeader 右侧用户头像下拉菜单
 * Function: AdminHeaderUser
 *
 * Description: 在管理后台头部右侧显示用户头像，点击展开下拉菜单，
 *             包含「个人资料」和「退出登录」操作
 *
 * 结构 (对应 Paper Design AppShell CardHeader 右侧头像 FIX-1):
 *   - 头像: 34×34px 圆形渐变背景 + 首字母
 *   - 下拉菜单: 个人资料 / 退出登录
 *
 * 规格来源: Paper Design "App Shell — 主框架模板" CardHeader (FII-1)
 *   头像区域为右侧操作区的最后一个元素
 */
export function AdminHeaderUser() {
  const router = useRouter()
  const { toast } = useToast()
  const auth = React.useContext(AuthContext)
  const { user, isLoading, logout } = auth || { user: null, isLoading: false, logout: async () => {} }

  // 获取显示名称：优先 username，其次 email，最后 phone
  const displayName = user?.username || user?.email || user?.phone || '?'
  const avatarUrl = user?.avatarUrl
  // 取首字母用于头像占位
  const initial = displayName.charAt(0).toUpperCase()

  const handleNavigateToProfile = () => {
    router.push('/admin/profile')
  }

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

  if (isLoading) {
    return (
      <div className="size-[34px] rounded-full bg-surface-alt animate-pulse" />
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex size-[34px] shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="用户菜单"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              className="size-full rounded-full object-cover ring-2 ring-border-default"
            />
          ) : (
            // 渐变背景头像 — 对应 Paper Design FIX-1 的 oklab 渐变
            <div
              className="flex size-full items-center justify-center rounded-full text-white font-body font-semibold text-[13px] leading-[130%]"
              style={{
                backgroundImage: 'linear-gradient(135deg, #c08532 0%, #8b6f47 100%)',
              }}
            >
              {initial}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-48" align="right">
        <DropdownMenuItem onClick={handleNavigateToProfile}>
          <UserCircle className="mr-2 size-4" />
          <span>个人资料</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 size-4" />
          <span>退出登录</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
