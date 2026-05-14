'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { AuthContext } from '@/components/context/auth-context'
import { useToast } from '@/components/ui/toast'

/**
 * File: app-sidebar-footer.tsx
 * Description: 侧边栏底部退出登录按钮
 * Function: AppSidebarFooter
 *
 * Description: 侧边栏底部操作区域，显示退出登录按钮
 *
 * 结构 (对应 Paper Design LogoutArea FVL-1):
 *   - LogoutButton: 全宽按钮，圆角，带边框
 *   - 图标: LogOut (18px, --fg-muted)
 *   - 文字: "退出登录" (DM Sans 500 13px, --fg-muted)
 *   - 折叠态 (collapsible=icon): 仅显示图标
 *
 * 规格来源: Paper Design "App Shell — 主框架模板" LogoutArea (FVL-1)
 */
export function AppSidebarFooter() {
  const router = useRouter()
  const { toast } = useToast()
  const auth = React.useContext(AuthContext)
  const { logout } = auth || { logout: async () => {} }

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
    <div className="shrink-0 pt-2 px-2.5 group-data-[collapsible=icon]:px-1">
      <button
        type="button"
        onClick={handleLogout}
        className="w-full flex items-center rounded-sm py-2.25 px-3 gap-2 border border-solid border-border-default transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:rounded-sm"
      >
        <LogOut className="size-[18px] shrink-0 text-fg-muted" strokeWidth={2} />
        <span className="font-body font-medium text-fg-muted text-[13px] leading-4 group-data-[collapsible=icon]:hidden">
          退出登录
        </span>
      </button>
    </div>
  )
}
