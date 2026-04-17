'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { UserSidebar } from './user-sidebar'

interface UserShellProps {
  children: React.ReactNode
}

export function UserShell({ children }: UserShellProps) {
  const router = useRouter()
  const { toast } = useToast()

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('退出登录失败')
      }

      toast({ title: '已退出登录' })
      router.push('/')
    } catch (error) {
      toast({
        title: '退出登录失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive',
      })
    }
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen overflow-hidden">
        <UserSidebar onLogout={handleLogout} />
        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
          {/* 顶部栏 */}
          <header className="flex h-14 items-center gap-2 border-b px-4 shrink-0">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                退出登录
              </Button>
            </div>
          </header>

          {/* 主内容区 */}
          <main className="flex-1 overflow-auto">
            <div className="container py-6">{children}</div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
