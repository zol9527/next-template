'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { AuthContext } from '@/components/context/auth-context'
import { useToast } from '@/components/ui/toast'

/**
 * Component: AppSidebarFooter
 *
 * Description: 侧边栏底部退出登录按钮（Paper Design LogoutArea FVL-1）
 *   - 全宽按钮，rounded-lg 圆角，border 边框
 *   - 图标: LogOut 18px, --fg-muted
 *   - 文字: "退出登录" DM Sans 500 13px, --fg-muted
 */
export function AppSidebarFooter() {
  const router = useRouter()
  const { toast } = useToast()
  const auth = React.useContext(AuthContext)
  const { logout } = auth || { logout: async () => {} }

  const handleLogout = async () => {
    try {
      await logout()
      toast({ title: '退出成功', description: '您已成功退出登录' })
      router.replace('/')
    } catch {
      toast({ title: '退出失败', description: '退出登录时发生错误，请稍后重试', variant: 'destructive' })
    }
  }

  return (
    <div className="shrink-0 pt-2 px-2.5">
      <button
        type="button"
        onClick={handleLogout}
        className="w-full flex items-center rounded-lg py-[9px] px-3 gap-2 border border-solid border-border-default transition-colors hover:bg-[rgba(38,37,30,0.04)]"
      >
        <LogOut className="size-[18px] shrink-0 text-fg-muted" strokeWidth={2} />
        <span className="font-body font-medium text-fg-muted text-[13px] leading-4">
          退出登录
        </span>
      </button>
    </div>
  )
}
