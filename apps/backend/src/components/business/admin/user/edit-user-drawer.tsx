'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Camera, Loader2, Send, Shield, Pencil } from 'lucide-react'
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
      <SheetContent className="w-[480px] max-w-[90vw] p-0 flex flex-col" style={{ boxShadow: 'rgba(38,37,30,0.1) -4px 0px 24px' }}>
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 h-[60px] border-b border-[var(--border)]">
          <SheetTitle className="text-[15px] font-semibold text-[var(--fg,#26251E)] flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <Pencil className="h-[18px] w-[18px]" style={{ color: '#F54E00' }} />
            编辑用户信息
          </SheetTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="w-[34px] h-[34px] rounded-lg flex items-center justify-center hover:bg-[var(--surface)] transition-colors"
          >
            <X className="h-[18px] w-[18px]" style={{ color: '#6B6960' }} />
          </button>
        </div>

        {/* 表单内容 */}
        <ScrollArea className="flex-1">
          <div className="p-6 flex flex-col gap-6">
            {/* 头像编辑区 */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--ds-accent,#F54E00)]/20 to-[var(--ds-accent,#F54E00)]/10 flex items-center justify-center text-base font-semibold text-[var(--ds-accent,#F54E00)]">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    displayName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <button className="absolute bottom-0 right-0 w-[22px] h-[22px] rounded-full flex items-center justify-center border-2 border-white" style={{ backgroundColor: '#F54E00' }}>
                  <Camera className="h-[11px] w-[11px] text-white" />
                </button>
              </div>
              <span className="text-[11px]" style={{ fontFamily: 'DM Sans, sans-serif', color: '#9C9A91' }}>点击头像更换照片</span>
            </div>

            {/* 基本信息 */}
            <div className="flex flex-col gap-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--fg-muted,#9C9A91)] pb-2">基本信息</h3>

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

              <FormField label="部门">
                <select
                  className="h-9 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--fg,#26251E)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent,#F54E00)]/20"
                >
                  <option value="">选择部门</option>
                  <option value="engineering">工程部</option>
                  <option value="marketing">市场部</option>
                  <option value="operations">运营部</option>
                  <option value="finance">财务部</option>
                </select>
              </FormField>

              <FormField label="账户状态">
                <div className="relative">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-white pl-3 pr-8 text-sm text-[var(--fg,#26251E)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent,#F54E00)]/20 appearance-none"
                  >
                    <option value="active">
                      {status === 'active' ? '🟢 ' : ''}活跃
                    </option>
                    <option value="disabled">
                      禁用
                    </option>
                  </select>
                  {status === 'active' && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full bg-[var(--teal,#1F8A65)] pointer-events-none" style={{ marginLeft: '0px', marginTop: '-1px' }} />
                  )}
                </div>
              </FormField>
            </div>

            {/* 安全设置 */}
            <div className="flex flex-col gap-4 pt-4 border-t border-[var(--border)]">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--fg-muted,#9C9A91)] pb-2">安全设置</h3>

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
                  className="h-[30px] rounded-lg text-[12px]"
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
        <div className="flex items-center gap-2 px-6 py-4 border-t border-[var(--border)]">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-9 rounded-lg text-sm"
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 h-9 rounded-lg bg-[var(--ds-accent,#F54E00)] hover:bg-[var(--ds-accent-hover,#D94400)] text-white font-medium text-sm"
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
      <label className="text-[12px] font-medium text-[var(--fg,#26251E)]">
        {label}
        {required && <span className="text-[var(--rose,#CF2D56)] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
