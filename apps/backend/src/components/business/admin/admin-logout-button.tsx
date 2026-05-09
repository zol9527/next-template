'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import type { ApiResponse } from '@/contracts/api-response.schema'

/**
Function: AdminLogoutButton

Description: 后台退出登录按钮，调用登出 API 清理 cookie，并跳转到登录页

Parameters:

Returns:
	element(React.ReactElement): 退出登录按钮
*/
export function AdminLogoutButton() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(false)

  async function onClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      const json = (await res.json()) as ApiResponse<Record<string, unknown>>
      if (!json.success) {
        toast({ title: '退出失败', description: json.error.message, variant: 'destructive' })
        return
      }

      router.replace('/')
    } catch {
      toast({ title: '退出失败', description: '网络错误，请稍后再试', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="secondary" onClick={onClick} disabled={loading}>
      {loading ? '退出中…' : '退出登录'}
    </Button>
  )
}
