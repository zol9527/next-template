'use client'

import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Shield, UserPlus, Loader2, Trash2, Calendar, User, Mail, FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { DataTable } from '@/components/ui/data-table'
import { cn } from '@/lib/utils'
import type { MfaExemptionDto } from '@/contracts/dtos/admin/mfa-settings.dto'
import type { ApiResponse } from '@/contracts/api-response.schema'

/**
 * Type: MfaExemptionListProps
 *
 * Description: MFA 豁免用户列表组件属性
 *
 * Properties:
 *     exemptions(MfaExemptionDto[]): 豁免用户列表
 */
export interface MfaExemptionListProps {
  exemptions: MfaExemptionDto[]
}

/**
 * Function: MfaExemptionList
 *
 * Description: MFA 豁免用户列表组件，用于管理和显示豁免用户
 *
 * Parameters:
 *     props(MfaExemptionListProps): 组件属性
 *
 * Returns:
 *     component(React.ReactElement): 豁免用户列表组件
 */
export function MfaExemptionList({ exemptions }: MfaExemptionListProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // 搜索/过滤
  const [searchQuery, setSearchQuery] = React.useState('')

  const filteredExemptions = React.useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()
    if (!keyword) return exemptions

    return exemptions.filter((exemption) => {
      const haystacks = [
        exemption.userName,
        exemption.userEmail,
        exemption.userId,
        exemption.reason,
        exemption.createdByName,
        exemption.createdBy,
      ]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase())

      return haystacks.some((s) => s.includes(keyword))
    })
  }, [exemptions, searchQuery])

  // 对话框状态
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [selectedUserId, setSelectedUserId] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [expiresAt, setExpiresAt] = React.useState('')

  // 添加豁免 Mutation
  const addMutation = useMutation({
    mutationFn: async (data: { userId: string; reason: string; expiresAt?: string }) => {
      const res = await fetch('/api/v1/admin/mfa/exemptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      const json = (await res.json()) as ApiResponse<MfaExemptionDto>
      if (!res.ok || !json.success) {
        throw new Error(json.success === false ? json.error.message : res.statusText)
      }

      return json.data
    },
    onSuccess: () => {
      // 刷新数据
      queryClient.invalidateQueries({ queryKey: ['admin', 'mfa', 'settings'] })

      // 重置表单
      setSelectedUserId('')
      setReason('')
      setExpiresAt('')
      setIsAddDialogOpen(false)

      toast({
        title: '添加成功',
        description: '豁免用户已添加',
        variant: 'default',
      })
    },
    onError: (error) => {
      toast({
        title: '添加失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  // 移除豁免 Mutation
  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/v1/admin/mfa/exemptions/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const json = (await res.json()) as ApiResponse<unknown>
      if (!res.ok || !json.success) {
        throw new Error(json.success === false ? json.error.message : res.statusText)
      }

      return json.data
    },
    onSuccess: () => {
      // 刷新数据
      queryClient.invalidateQueries({ queryKey: ['admin', 'mfa', 'settings'] })

      toast({
        title: '移除成功',
        description: '豁免已移除',
        variant: 'default',
      })
    },
    onError: (error) => {
      toast({
        title: '移除失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  // 处理添加豁免
  const handleAddExemption = () => {
    // 验证
    if (!selectedUserId.trim()) {
      toast({
        title: '参数错误',
        description: '请选择用户',
        variant: 'destructive',
      })
      return
    }

    if (!reason.trim()) {
      toast({
        title: '参数错误',
        description: '请输入豁免原因',
        variant: 'destructive',
      })
      return
    }

    addMutation.mutate({
      userId: selectedUserId,
      reason: reason.trim(),
      expiresAt: expiresAt || undefined,
    })
  }

  // 处理移除豁免
  const handleRemoveExemption = (userId: string, userName: string) => {
    if (!confirm(`确定要移除用户 "${userName}" 的 MFA 豁免吗？`)) {
      return
    }

    removeMutation.mutate(userId)
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 检查豁免是否已过期
  const isExpired = (expiresAt: string | undefined) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  // 列定义
  const columns: ColumnDef<MfaExemptionDto>[] = [
    {
      accessorKey: 'userName',
      header: '用户信息',
      size: 180,
      cell: ({ row }) => {
        const exemption = row.original
        const expired = isExpired(exemption.expiresAt)

        return (
          <div className={cn('space-y-1', expired && 'opacity-50')}>
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">
                {exemption.userName || exemption.userId.slice(0, 8)}
              </span>
            </div>
            {exemption.userEmail && (
              <div className="flex items-center gap-2 text-xs text-foreground/50">
                <Mail className="h-3 w-3" />
                <span className="truncate max-w-[150px]">
                  {exemption.userEmail}
                </span>
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'reason',
      header: '豁免原因',
      cell: ({ row }) => {
        const exemption = row.original
        const expired = isExpired(exemption.expiresAt)

        return (
          <div className={cn('flex items-start gap-2', expired && 'opacity-50')}>
            <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-foreground/70 leading-relaxed line-clamp-2">
              {exemption.reason}
            </p>
          </div>
        )
      },
    },
    {
      accessorKey: 'createdByName',
      header: '创建者',
      size: 120,
      cell: ({ row }) => {
        const exemption = row.original
        const expired = isExpired(exemption.expiresAt)

        return (
          <p className={cn('text-xs text-foreground/60', expired && 'opacity-50')}>
            {exemption.createdByName || exemption.createdBy.slice(0, 8)}
          </p>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: '创建时间',
      size: 170,
      cell: ({ row }) => {
        const expired = isExpired(row.original.expiresAt)

        return (
          <p className={cn('text-xs text-foreground/60', expired && 'opacity-50')}>
            {formatDate(row.original.createdAt)}
          </p>
        )
      },
    },
    {
      accessorKey: 'expiresAt',
      header: '过期时间',
      size: 170,
      cell: ({ row }) => {
        const exemption = row.original
        const expired = isExpired(exemption.expiresAt)

        if (exemption.expiresAt) {
          return (
            <div className={cn('flex items-center gap-1.5', expired && 'opacity-50')}>
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span
                className={cn(
                  'text-xs',
                  expired ? 'text-destructive' : 'text-foreground/60'
                )}
              >
                {expired ? '已过期' : formatDate(exemption.expiresAt)}
              </span>
            </div>
          )
        }

        return <span className={cn('text-xs text-foreground/40', expired && 'opacity-50')}>永不过期</span>
      },
    },
    {
      id: 'actions',
      header: '操作',
      size: 100,
      cell: ({ row }) => {
        const exemption = row.original

        return (
          <div className="text-right">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                handleRemoveExemption(
                  exemption.userId,
                  exemption.userName || exemption.userId.slice(0, 8)
                )
              }
              disabled={removeMutation.isPending}
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              {removeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6" data-testid="exemption-list">
      {/* 头部 - 增强间距 */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <h3 className="text-lg font-bold flex items-center gap-2.5">
            <div className="rounded-lg bg-gradient-to-br from-primary to-primary/80 p-1.5 shadow-lg">
              <Shield className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            豁免用户列表
          </h3>
          <p className="text-sm text-foreground/60 max-w-xl">
            管理无需遵守 MFA 策略的特殊用户。请谨慎授予豁免权限
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Input
            data-testid="exemption-search"
            aria-label="搜索豁免用户"
            placeholder="搜索豁免用户..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-[240px]"
          />

          {/* 添加豁免按钮 - 增强样式 */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200">
                <UserPlus className="h-4 w-4" />
                添加豁免
              </Button>
            </DialogTrigger>

          {/* 添加豁免对话框 - 增强间距 */}
          <DialogContent size="md" className="sm:max-w-[520px]">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-lg">添加 MFA 豁免用户</DialogTitle>
              <DialogDescription className="text-sm text-foreground/60">
                为特定用户添加 MFA 豁免权限，该用户将无需遵守 MFA 策略。请谨慎操作。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-5">
              {/* 用户选择 */}
              <div className="space-y-2.5">
                <Label htmlFor="user-id" className="text-sm font-bold flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-gradient-to-b from-primary to-primary/80"></span>
                  用户 ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="user-id"
                  placeholder="请输入用户 UUID..."
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  disabled={addMutation.isPending}
                  className="h-10"
                />
                <p className="text-xs text-foreground/50 pl-3">
                  请输入要豁免的管理员用户的 UUID
                </p>
              </div>

              {/* 豁免原因 */}
              <div className="space-y-2.5">
                <Label htmlFor="reason" className="text-sm font-bold flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-gradient-to-b from-primary to-primary/80"></span>
                  豁免原因 <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="请输入豁免原因（如：测试账号、特殊业务需求等）..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={addMutation.isPending}
                  className="min-h-28 resize-none"
                />
                <p className="text-xs text-foreground/50 pl-3">
                  详细说明豁免原因，便于后续审计和合规检查
                </p>
              </div>

              {/* 过期时间 */}
              <div className="space-y-2.5">
                <Label htmlFor="expires-at" className="text-sm font-bold flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-gradient-to-b from-primary to-primary/80"></span>
                  过期时间
                </Label>
                <Input
                  id="expires-at"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  disabled={addMutation.isPending}
                  className="h-10"
                />
                <p className="text-xs text-foreground/50 pl-3">
                  可选，留空表示永久有效。建议设置过期时间以定期审查
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                disabled={addMutation.isPending}
              >
                取消
              </Button>
              <Button
                onClick={handleAddExemption}
                disabled={addMutation.isPending}
                className="gap-2"
              >
                {addMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    添加中...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    添加豁免
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 豁免用户表格 */}
      <DataTable columns={columns} data={filteredExemptions} />

      {/* 统计信息 */}
      <p className="text-xs text-foreground/50">
        共 {filteredExemptions.length} 个豁免用户
      </p>
    </div>
  )
}
