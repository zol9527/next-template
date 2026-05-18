'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Camera, Loader2, Send, Shield } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { AdminUserListItem } from '@/contracts/dtos/admin/users.dto'
import type { SafeAdminUserDetail } from '@/contracts/dtos/admin/user-detail.dto'

/**
 * 编辑用户 Drawer
 *
 * 480px 宽，包含：
 * - 头像编辑区
 * - 基本信息（姓名、邮箱、手机号、状态）
 * - 安全设置（重置密码、两步验证）
 * - 保存/取消按钮
 */

interface EditUserDrawerProps {
  user: AdminUserListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditUserDrawer({ user, open, onOpenChange }: EditUserDrawerProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isSaving, setIsSaving] = React.useState(false)

  // 表单状态
  const [nickname, setNickname] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [status, setStatus] = React.useState('active')

  // 获取用户详情（含 MFA 信息）
  const { data: userDetail } = useQuery<SafeAdminUserDetail>({
    queryKey: ['admin', 'users', user?.id, 'detail'],
    queryFn: async () => {
      const res = await fetch(`/api/v1/admin/users/${user?.id}`, { credentials: 'include' })
      if (!res.ok) throw new Error('获取用户详情失败')
      const json = await res.json()
      return json.data?.user
    },
    enabled: !!user?.id && open,
    staleTime: 5 * 60 * 1000,
  })

  // 用户数据加载后初始化表单
  React.useEffect(() => {
    if (user && open) {
      setNickname(user.nickname || '')
      setEmail(user.email || '')
      setPhone(user.phone || '')
      setStatus(user.status || 'active')
    }
  }, [user, open])

  if (!user) return null

  const displayName = user.nickname || user.username || '未设置'

  const handleSave = async () => {
    if (!user.id) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nickname: nickname || undefined,
          email: email || undefined,
          phone: phone || undefined,
          status: status as 'active' | 'disabled',
        }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: { message: '保存失败' } }))
        throw new Error(error.error?.message || '保存失败')
      }

      toast({ title: '用户信息已更新' })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: '保存失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetPassword = () => {
    toast({ title: '功能开发中', description: '重置密码功能正在开发中' })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] max-w-[90vw] p-0 flex flex-col" style={{ borderRadius: '16px 0 0 16px' }}>
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <SheetTitle className="text-base font-semibold text-[var(--fg,#26251E)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            编辑用户
          </SheetTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface)] transition-colors"
          >
            <X className="h-4 w-4 text-[var(--fg-faint,#9C9A91)]" />
          </button>
        </div>

        {/* 表单内容 */}
        <ScrollArea className="flex-1">
          <div className="p-6 flex flex-col gap-6">
            {/* 头像编辑区 */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--ds-accent,#F54E00)]/20 to-[var(--ds-accent,#F54E00)]/10 flex items-center justify-center text-xl font-semibold text-[var(--ds-accent,#F54E00)]">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    displayName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[var(--fg,#26251E)] flex items-center justify-center border-2 border-white">
                  <Camera className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            </div>

            {/* 基本信息 */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-[var(--fg,#26251E)]">基本信息</h3>

              <FormField label="姓名" required>
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="输入用户姓名"
                  className="h-9 rounded-lg text-sm"
                />
              </FormField>

              <FormField label="邮箱" required>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="输入邮箱地址"
                  className="h-9 rounded-lg text-sm"
                />
              </FormField>

              <FormField label="手机号">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="输入手机号"
                  className="h-9 rounded-lg text-sm"
                />
              </FormField>

              <FormField label="账户状态">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--fg,#26251E)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent,#F54E00)]/20"
                >
                  <option value="active">活跃</option>
                  <option value="disabled">禁用</option>
                </select>
              </FormField>
            </div>

            {/* 安全设置 */}
            <div className="flex flex-col gap-4 pt-4 border-t border-[var(--border)]">
              <h3 className="text-sm font-semibold text-[var(--fg,#26251E)]">安全设置</h3>

              {/* 重置密码 */}
              <div className="flex items-center justify-between py-2">
                <div className="flex flex-col">
                  <span className="text-sm text-[var(--fg,#26251E)]">重置密码</span>
                  <span className="text-xs text-[var(--fg-faint,#9C9A91)]">发送密码重置邮件到用户邮箱</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetPassword}
                  className="h-8 rounded-lg text-xs"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  发送
                </Button>
              </div>

              {/* 两步验证 */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[var(--teal,#1F8A65)]" />
                  <div className="flex flex-col">
                    <span className="text-sm text-[var(--fg,#26251E)]">两步验证</span>
                    <span className="text-xs text-[var(--fg-faint,#9C9A91)]">
                      {userDetail?.mfaEnabled ? '已开启' : '未开启'}
                    </span>
                  </div>
                </div>
                <Switch
                  checked={userDetail?.mfaEnabled ?? false}
                  disabled // 管理员不应直接切换，应通过专门流程
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* 底部操作 */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-[var(--border)]">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-10 rounded-lg text-sm"
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 h-10 rounded-lg bg-[var(--ds-accent,#F54E00)] hover:bg-[var(--ds-accent-hover,#D94400)] text-white font-medium text-sm"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            保存修改
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/**
 * 表单字段组件
 */
function FormField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[var(--fg-muted,#6B6960)]">
        {label}
        {required && <span className="text-[var(--rose,#CF2D56)] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
