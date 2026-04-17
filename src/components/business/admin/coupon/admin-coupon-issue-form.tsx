'use client'

import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tag,
  Users,
  UserPlus,
  Gift,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import type { ApiResponse } from '@/contracts/api-response.schema'
import { IssueCouponRequestSchema, type IssueCouponResponse } from '@/plugins/ecommerce/contracts/admin-coupons.dto'

async function readApiErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as ApiResponse<unknown>
    if (!json.success) return json.error.message
  } catch {
    // ignore
  }
  return res.statusText || '请求失败'
}

interface AdminCouponIssueFormProps {
  couponId: string
  couponName: string
  onSaved: () => void
  onCancel: () => void
}

/**
Function: AdminCouponIssueForm

Description: 管理后台发放优惠券表单组件：支持指定用户发放和按角色批量发放两种方式。

Parameters:
	couponId(string): 要发放的优惠券模板 ID
	couponName(string): 优惠券名称（用于显示）
	onSaved(function): 发放成功后的回调
	onCancel(function): 取消发放的回调

Returns:
	element(React.ReactElement): 发放优惠券表单 UI
*/
export function AdminCouponIssueForm({
  couponId,
  couponName,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSaved,
  onCancel,
}: AdminCouponIssueFormProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // 发放方式：'users' = 指定用户，'role' = 按角色
  const [issueType, setIssueType] = React.useState<'users' | 'role'>('users')

  // 指定用户模式
  const [userIds, setUserIds] = React.useState('')

  // 按角色模式
  const [userRole, setUserRole] = React.useState<string>('')

  // 自定义过期时间
  const [customExpiresAt, setCustomExpiresAt] = React.useState('')

  // 发放结果
  const [result, setResult] = React.useState<IssueCouponResponse | null>(null)

  // 发放优惠券的 mutation
  const issueMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        couponId,
      }

      if (issueType === 'users') {
        const ids = userIds.split(',').map(id => id.trim()).filter(Boolean)
        if (ids.length === 0) {
          throw new Error(JSON.stringify({ userIds: '请输入至少一个用户 ID' }))
        }
        payload.userIds = ids
      } else {
        if (!userRole) {
          throw new Error(JSON.stringify({ userRole: '请选择用户角色' }))
        }
        payload.userRole = userRole
      }

      if (customExpiresAt) {
        payload.expiresAt = customExpiresAt
      }

      const parsed = IssueCouponRequestSchema.safeParse(payload)
      if (!parsed.success) {
        const newErrors: Record<string, string> = {}
        parsed.error.issues.forEach(issue => {
          if (issue.path.length > 0) {
            newErrors[issue.path.join('.')] = issue.message
          }
        })
        throw new Error(JSON.stringify(newErrors))
      }

      const res = await fetch('/api/v1/admin/coupons/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(parsed.data),
      })

      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res))
      }

      const json = await res.json() as ApiResponse<IssueCouponResponse>
      if (!json.success) {
        throw new Error(json.error.message)
      }

      return json.data
    },
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-coupons'] })
      toast({
        title: '发放成功',
        description: `成功发放 ${data.issued} 张优惠券`,
        variant: 'default',
      })
    },
    onError: (error) => {
      // 检查是否是验证错误
      try {
        const errorObj = JSON.parse(error.message)
        Object.values(errorObj).forEach((msg) => {
          toast({
            title: '校验失败',
            description: msg as string,
            variant: 'destructive',
          })
        })
      } catch {
        toast({
          title: '发放失败',
          description: error.message,
          variant: 'destructive',
        })
      }
    },
  })

  // 表单提交处理
  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    issueMutation.mutate()
  }

  // 是否正在提交
  const isSubmitting = issueMutation.isPending

  // 重置表单
  const resetForm = () => {
    setUserIds('')
    setUserRole('')
    setCustomExpiresAt('')
    setResult(null)
  }

  // 关闭弹窗
  const handleClose = () => {
    resetForm()
    onCancel()
  }

  return (
    <Dialog open onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[98vw] w-full xl:max-w-lg h-auto flex flex-col p-0 overflow-hidden border-none shadow-2xl"
        onEscapeKeyDown={(e: KeyboardEvent) => e.preventDefault()}
      >
        {/* 标题部分 */}
        <DialogHeader className="flex flex-row items-center justify-between border-b space-y-0 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-primary/20 text-primary p-3 shadow-lg ring-1 ring-primary/30">
              <Gift className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight">发放优惠券</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  将优惠券发放给指定用户或按角色批量发放
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* 内容部分 */}
        <div className="flex-1 min-h-0 bg-transparent overflow-auto">
          <div className="p-8">
            {result ? (
              // 发放结果展示
              <div className="space-y-6">
                <Card>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                      <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center">
                        <CheckCircle2 className="h-8 w-8 text-success" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">发放完成</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          已成功发放 {result.issued} 张优惠券
                        </p>
                      </div>
                      {result.failed > 0 && (
                        <div className="flex items-center gap-2 text-warning text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>{result.failed} 张发放失败</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {result.failures && result.failures.length > 0 && (
                  <Card>
                    <CardHeader className="border-b">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-warning" /> 失败详情
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-48 overflow-auto">
                        {result.failures.map((failure, index) => (
                          <div key={index} className="flex items-center justify-between text-sm p-2 rounded bg-muted/5">
                            <code className="text-xs">{failure.userId}</code>
                            <span className="text-destructive text-xs">{failure.reason}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-center">
                  <Button
                    onClick={handleClose}
                    className="px-8 h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    完成
                  </Button>
                </div>
              </div>
            ) : (
              // 发放表单
              <form onSubmit={onSubmit} className="space-y-6">
                {/* 优惠券信息 */}
                <Card>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-primary/20 flex items-center justify-center">
                        <Tag className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">发放的优惠券</p>
                        <p className="font-semibold">{couponName}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 发放方式 */}
                <Card>
                  <CardHeader className="border-b">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" /> 发放方式
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setIssueType('users')}
                        className={cn(
                          'flex-1 p-4 border-2 transition-all',
                          issueType === 'users'
                            ? 'border-primary bg-primary/10'
                            : 'border-border/20 bg-muted/5 hover:border-border/30'
                        )}
                      >
                        <UserPlus className={cn(
                          'h-6 w-6 mb-2',
                          issueType === 'users' ? 'text-primary' : 'text-muted-foreground'
                        )} />
                        <p className={cn(
                          'font-medium',
                          issueType === 'users' ? 'text-primary' : 'text-foreground'
                        )}>指定用户</p>
                        <p className="text-xs text-muted-foreground mt-1">输入用户 ID 列表发放</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIssueType('role')}
                        className={cn(
                          'flex-1 p-4 border-2 transition-all',
                          issueType === 'role'
                            ? 'border-primary bg-primary/10'
                            : 'border-border/20 bg-muted/5 hover:border-border/30'
                        )}
                      >
                        <Users className={cn(
                          'h-6 w-6 mb-2',
                          issueType === 'role' ? 'text-primary' : 'text-muted-foreground'
                        )} />
                        <p className={cn(
                          'font-medium',
                          issueType === 'role' ? 'text-primary' : 'text-foreground'
                        )}>按角色发放</p>
                        <p className="text-xs text-muted-foreground mt-1">向所有指定角色用户发放</p>
                      </button>
                    </div>

                    {/* 指定用户表单 */}
                    {issueType === 'users' && (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-foreground/70">
                          用户 ID 列表 <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          placeholder="用逗号分隔多个用户 ID，例如：uuid1,uuid2,uuid3"
                          value={userIds}
                          onChange={(e) => setUserIds(e.target.value)}
                          className="h-11"
                        />
                        <p className="text-xs text-muted-foreground">请输入完整的 UUID 格式用户 ID，用英文逗号分隔</p>
                      </div>
                    )}

                    {/* 按角色发放表单 */}
                    {issueType === 'role' && (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-foreground/70">
                          用户角色 <span className="text-destructive">*</span>
                        </Label>
                        <Select value={userRole} onValueChange={setUserRole}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择用户角色" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">普通用户</SelectItem>
                            <SelectItem value="promoter">推广员</SelectItem>
                            <SelectItem value="admin">管理员</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">向所有指定角色的用户发放优惠券</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 自定义过期时间 */}
                <Card>
                  <CardHeader className="border-b">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Gift className="h-5 w-5 text-primary" /> 发放配置
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground/70">自定义过期时间</Label>
                      <Input
                        type="datetime-local"
                        value={customExpiresAt}
                        onChange={(e) => setCustomExpiresAt(e.target.value)}
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">可选，留空则使用优惠券本身的过期时间</p>
                    </div>
                  </CardContent>
                </Card>
              </form>
            )}
          </div>
        </div>

        {/* 底部操作栏 */}
        {!result && (
          <div className="px-8 py-6 border-t flex flex-row items-center justify-end gap-4 shrink-0">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-12 px-8 font-medium"
            >
              取消
            </Button>
            <Button
              onClick={() => onSubmit()}
              disabled={isSubmitting}
              className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl shadow-primary/40 gap-2 font-bold transition-all active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  正在发放...
                </>
              ) : (
                <>
                  <Gift className="h-5 w-5" />
                  确认发放
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
