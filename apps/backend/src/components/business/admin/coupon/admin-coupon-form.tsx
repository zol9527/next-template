'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  DollarSign,
  Calendar,
  Users,
  Gift,
  Percent,
  Trash2,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { Coupon, CouponType, CouponStatus } from '@/plugins/ecommerce/contracts/coupons.dto'
import {
  CreateCouponRequestSchema,
  UpdateCouponRequestSchema,
} from '@/plugins/ecommerce/contracts/admin-coupons.dto'

async function readApiErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as ApiResponse<unknown>
    if (!json.success) return json.error.message
  } catch {
    // ignore
  }
  return res.statusText || '请求失败'
}

interface AdminCouponFormProps {
  couponId: string | null
  mode: 'create' | 'edit' | 'view'
  onSaved: () => void
  onCancel: () => void
}

/**
Function: AdminCouponForm

Description: 管理后台优惠券表单组件：支持创建和编辑优惠券，包含根据类型动态显示的字段。

Parameters:
	couponId(string | null): 编辑模式下的优惠券 ID；为空时为新建模式
	mode(string): 表单模式，'create'=新建，'edit'=编辑，'view'=查看
	onSaved(function): 保存成功后的回调
	onCancel(function): 取消编辑/新建的回调

Returns:
	element(React.ReactElement): 优惠券表单 UI
*/
export function AdminCouponForm({
  couponId,
  mode = 'edit',
  onSaved,
  onCancel,
}: AdminCouponFormProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const editing = mode === 'edit'
  const viewing = mode === 'view'

  // 表单状态
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [couponType, setCouponType] = React.useState<CouponType>('discount')
  const [status, setStatus] = React.useState<CouponStatus | null>(null)

  // 折扣信息（根据类型）
  const [discountPercent, setDiscountPercent] = React.useState('')
  const [discountAmount, setDiscountAmount] = React.useState('')
  const [thresholdAmount, setThresholdAmount] = React.useState('')
  const [thresholdDiscount, setThresholdDiscount] = React.useState('')
  const [giftProductId, setGiftProductId] = React.useState('')

  // 使用限制
  const [minOrderAmount, setMinOrderAmount] = React.useState('')
  const [maxDiscountAmount, setMaxDiscountAmount] = React.useState('')
  const [perUserLimit, setPerUserLimit] = React.useState<number | null>(null)
  const [usageLimit, setUsageLimit] = React.useState<number | null>(null)

  // 有效期
  const [validFrom, setValidFrom] = React.useState('')
  const [validTo, setValidTo] = React.useState('')

  // 错误状态
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // 使用 useQuery 获取优惠券详情（仅编辑/查看模式）
  const { data: couponData, isLoading: loading } = useQuery<Coupon>({
    queryKey: ['admin', 'coupons', couponId],
    queryFn: async () => {
      if (!couponId) throw new Error('Coupon ID is required')

      const res = await fetch(`/api/v1/admin/coupons/${couponId}`, { credentials: 'include' })
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res))
      }

      const json = await res.json() as ApiResponse<Coupon>
      if (!json.success) {
        throw new Error(json.error.message)
      }

      return json.data
    },
    enabled: !!couponId && (editing || viewing),
  })

  // 当优惠券详情加载成功后，初始化表单状态
  React.useEffect(() => {
    if (couponData) {
      setName(couponData.name)
      setDescription(couponData.description ?? '')
      setCouponType(couponData.type)
      setStatus(couponData.status)

      // 折扣信息
      setDiscountPercent(couponData.discountPercent ?? '')
      setDiscountAmount(couponData.discountAmount ?? '')
      setThresholdAmount(couponData.thresholdAmount ?? '')
      setThresholdDiscount(couponData.thresholdDiscount ?? '')
      setGiftProductId(couponData.giftProductId ?? '')

      // 使用限制
      setMinOrderAmount(couponData.minOrderAmount ?? '')
      setMaxDiscountAmount(couponData.maxDiscountAmount ?? '')
      setPerUserLimit(couponData.perUserLimit ?? null)
      setUsageLimit(couponData.usageLimit ?? null)

      // 有效期
      setValidFrom(couponData.validFrom ? couponData.validFrom.slice(0, 16) : '')
      setValidTo(couponData.validTo ? couponData.validTo.slice(0, 16) : '')
    }
  }, [couponData])

  // 保存优惠券的 mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // 构建基础 payload
      const basePayload = {
        name,
        description: description.trim() === '' ? undefined : description,
        type: couponType,
        // 折扣信息
        discountPercent: couponType === 'discount' ? discountPercent : undefined,
        discountAmount: couponType === 'fixed_amount' ? discountAmount : undefined,
        thresholdAmount: couponType === 'threshold' ? thresholdAmount : undefined,
        thresholdDiscount: couponType === 'threshold' ? thresholdDiscount : undefined,
        giftProductId: couponType === 'gift' ? giftProductId : undefined,
        // 使用限制
        minOrderAmount: minOrderAmount.trim() === '' ? undefined : minOrderAmount,
        maxDiscountAmount: maxDiscountAmount.trim() === '' ? undefined : maxDiscountAmount,
        perUserLimit: perUserLimit,
        usageLimit: usageLimit,
        // 有效期
        validFrom: validFrom,
        validTo: validTo,
      }

      // 如果是编辑模式，添加状态字段
      const payload = editing
        ? { ...basePayload, status }
        : basePayload

      const validator = editing ? UpdateCouponRequestSchema : CreateCouponRequestSchema
      const parsed = validator.safeParse(payload)

      if (!parsed.success) {
        const newErrors: Record<string, string> = {}
        parsed.error.issues.forEach(issue => {
          if (issue.path.length > 0) {
            newErrors[issue.path.join('.')] = issue.message
          }
        })
        throw new Error(JSON.stringify(newErrors))
      }

      const url = editing ? `/api/v1/admin/coupons/${couponId}` : '/api/v1/admin/coupons'
      const method = editing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(parsed.data),
      })

      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res))
      }

      return parsed.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] })
      if (couponId) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'coupons', couponId] })
      }
      toast({ title: '保存成功', variant: 'default' })
      onSaved()
    },
    onError: (error) => {
      // 检查是否是验证错误
      try {
        const errorObj = JSON.parse(error.message)
        setErrors(errorObj)
        toast({ title: '校验失败', description: '请检查表单中标记为红色的字段', variant: 'destructive' })
      } catch {
        toast({ title: '保存失败', description: error.message, variant: 'destructive' })
      }
    },
  })

  // 删除优惠券的 mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!couponId) throw new Error('Coupon ID is required')

      const res = await fetch(`/api/v1/admin/coupons/${couponId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res))
      }
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] })
      toast({ title: '删除成功', variant: 'default' })
      onSaved()
    },
    onError: (error) => {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' })
    },
  })

  // 表单提交处理
  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    setErrors({})
    saveMutation.mutate()
  }

  // 删除处理
  const onDelete = () => {
    if (!couponId || !confirm('确定要删除这个优惠券吗？此操作不可撤销。')) return
    deleteMutation.mutate()
  }

  // 计算提交状态
  const isSubmitting = saveMutation.isPending || deleteMutation.isPending

  // 渲染类型相关字段
  const renderTypeSpecificFields = () => {
    switch (couponType) {
      case 'discount':
        return (
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground/70">
              折扣百分比 <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                placeholder="例如：85 表示 85 折"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                disabled={viewing}
                className={cn(
                  'h-11 bg-muted/5 border-border/10 focus:border-primary/50 transition-all pr-8',
                  errors.discountPercent ? 'border-destructive focus-visible:ring-destructive' : ''
                )}
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">填写 1-100 之间的数字，表示折扣比例</p>
            {errors.discountPercent && <p className="text-xs text-destructive">{errors.discountPercent}</p>}
          </div>
        )

      case 'fixed_amount':
        return (
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground/70">
              固定减免金额 <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">¥</span>
              <Input
                placeholder="例如：10.00"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                disabled={viewing}
                className={cn(
                  'pl-8 h-11 bg-muted/5 border-border/10 focus:border-primary/50 transition-all',
                  errors.discountAmount ? 'border-destructive focus-visible:ring-destructive' : ''
                )}
              />
            </div>
            {errors.discountAmount && <p className="text-xs text-destructive">{errors.discountAmount}</p>}
          </div>
        )

      case 'threshold':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground/70">
                满减门槛金额 <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">¥</span>
                <Input
                  placeholder="例如：100.00"
                  value={thresholdAmount}
                  onChange={(e) => setThresholdAmount(e.target.value)}
                  disabled={viewing}
                  className={cn(
                    'pl-8 h-11 bg-muted/5 border-border/10 focus:border-primary/50 transition-all',
                    errors.thresholdAmount ? 'border-destructive focus-visible:ring-destructive' : ''
                  )}
                />
              </div>
              {errors.thresholdAmount && <p className="text-xs text-destructive">{errors.thresholdAmount}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground/70">
                满减优惠金额 <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">¥</span>
                <Input
                  placeholder="例如：20.00"
                  value={thresholdDiscount}
                  onChange={(e) => setThresholdDiscount(e.target.value)}
                  disabled={viewing}
                  className={cn(
                    'pl-8 h-11 bg-muted/5 border-border/10 focus:border-primary/50 transition-all',
                    errors.thresholdDiscount ? 'border-destructive focus-visible:ring-destructive' : ''
                  )}
                />
              </div>
              {errors.thresholdDiscount && <p className="text-xs text-destructive">{errors.thresholdDiscount}</p>}
            </div>
          </>
        )

      case 'gift':
        return (
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground/70">
              赠品商品 ID <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="请输入赠品商品 ID"
              value={giftProductId}
              onChange={(e) => setGiftProductId(e.target.value)}
              disabled={viewing}
              className={cn(
                'h-11 bg-muted/5 border-border/10 focus:border-primary/50 transition-all',
                errors.giftProductId ? 'border-destructive focus-visible:ring-destructive' : ''
              )}
            />
            <p className="text-xs text-muted-foreground">选择要赠送的商品 ID</p>
            {errors.giftProductId && <p className="text-xs text-destructive">{errors.giftProductId}</p>}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-5xl w-full h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl"
        onEscapeKeyDown={(e: KeyboardEvent) => e.preventDefault()}
      >
        {/* 标题部分 */}
        <DialogHeader className="flex flex-row items-center justify-between border-b space-y-0 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-primary/20 text-primary p-3 shadow-lg ring-1 ring-primary/30">
              <Tag className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                {viewing ? '优惠券详情' : editing ? '编辑优惠券' : '创建新优惠券'}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {viewing ? '查看优惠券的完整信息' : '请填写优惠券的核心信息，确保内容准确无误'}
                </span>
                {couponId && (
                  <code className="text-[10px] bg-muted/5 px-1.5 py-0.5 rounded text-muted-foreground">
                    ID: {couponId}
                  </code>
                )}
              </div>
            </div>
          </div>
          {editing && (
            <div className="flex items-center gap-2">
              {status && (
                <span className={cn(
                  'px-3 py-1 text-xs font-medium rounded-full',
                  status === 'active' ? 'bg-success/20 text-success-foreground' :
                  status === 'draft' ? 'bg-muted text-muted-foreground' :
                  status === 'scheduled' ? 'bg-info/20 text-info-foreground' :
                  status === 'paused' ? 'bg-warning/20 text-warning-foreground' :
                  status === 'expired' ? 'bg-destructive/20 text-destructive-foreground' :
                  'bg-muted text-muted-foreground'
                )}>
                  {status === 'active' ? '生效中' :
                   status === 'draft' ? '草稿' :
                   status === 'scheduled' ? '待生效' :
                   status === 'paused' ? '已暂停' :
                   status === 'expired' ? '已过期' : '已禁用'}
                </span>
              )}
            </div>
          )}
        </DialogHeader>

        {/* 内容部分 */}
        <ScrollArea className="flex-1 min-h-0 bg-transparent">
          <div className="p-8">
            <form onSubmit={onSubmit} className="space-y-8">
              {/* 基本信息 */}
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" /> 基本信息
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-sm font-semibold text-foreground/70">
                        优惠券名称 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="请输入优惠券名称..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={viewing}
                        className={cn(
                          'h-12 bg-muted/5 border-border/10 focus:border-primary/50 transition-all',
                          errors.name ? 'border-destructive focus-visible:ring-destructive' : ''
                        )}
                      />
                      {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-sm font-semibold text-foreground/70">优惠券描述</Label>
                      <Input
                        placeholder="简单描述优惠券的用途..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={viewing}
                        className="h-12"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-semibold text-foreground/70">
                        优惠券类型 <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={couponType}
                        onValueChange={(value) => setCouponType(value as CouponType)}
                        disabled={editing || viewing}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择优惠券类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="discount">折扣券</SelectItem>
                          <SelectItem value="fixed_amount">固定金额券</SelectItem>
                          <SelectItem value="threshold">满减券</SelectItem>
                          <SelectItem value="gift">赠品券</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {editing && (
                      <div className="flex flex-col gap-2">
                        <Label className="text-sm font-semibold text-foreground/70">优惠券状态</Label>
                        <Select
                          value={status || ''}
                          onValueChange={(value) => setStatus(value as CouponStatus)}
                          disabled={viewing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择状态" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">草稿</SelectItem>
                            <SelectItem value="active">生效中</SelectItem>
                            <SelectItem value="paused">已暂停</SelectItem>
                            <SelectItem value="disabled">已禁用</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 类型特定信息 */}
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    {couponType === 'discount' && <Percent className="h-5 w-5 text-primary" />}
                    {couponType === 'fixed_amount' && <DollarSign className="h-5 w-5 text-primary" />}
                    {couponType === 'threshold' && <Gift className="h-5 w-5 text-primary" />}
                    {couponType === 'gift' && <Gift className="h-5 w-5 text-primary" />}
                    折扣设置
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderTypeSpecificFields()}
                  </div>
                </CardContent>
              </Card>

              {/* 使用限制 */}
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> 使用限制
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground/70">最低订单金额</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">¥</span>
                        <Input
                          placeholder="例如：50.00"
                          value={minOrderAmount}
                          onChange={(e) => setMinOrderAmount(e.target.value)}
                          disabled={viewing}
                          className="pl-8 h-11"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">订单金额达到此门槛才可使用</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground/70">最大折扣金额</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">¥</span>
                        <Input
                          placeholder="例如：100.00"
                          value={maxDiscountAmount}
                          onChange={(e) => setMaxDiscountAmount(e.target.value)}
                          disabled={viewing}
                          className="pl-8 h-11"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">折扣金额的上限（防止过度优惠）</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground/70">每人限用次数</Label>
                      <Input
                        type="number"
                        placeholder="留空表示不限制"
                        value={perUserLimit === null ? '' : perUserLimit}
                        onChange={(e) => setPerUserLimit(e.target.value === '' ? null : Number(e.target.value))}
                        disabled={viewing}
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground/70">总使用次数限制</Label>
                      <Input
                        type="number"
                        placeholder="留空表示不限制"
                        value={usageLimit === null ? '' : usageLimit}
                        onChange={(e) => setUsageLimit(e.target.value === '' ? null : Number(e.target.value))}
                        disabled={viewing}
                        className="h-11"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 有效期 */}
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" /> 有效期
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground/70">
                        开始时间 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="datetime-local"
                        value={validFrom}
                        onChange={(e) => setValidFrom(e.target.value)}
                        disabled={viewing}
                        className={cn(
                          'h-11 bg-muted/5 border-border/10 focus:border-primary/50 transition-all',
                          errors.validFrom ? 'border-destructive focus-visible:ring-destructive' : ''
                        )}
                      />
                      {errors.validFrom && <p className="text-xs text-destructive">{errors.validFrom}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground/70">
                        结束时间 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="datetime-local"
                        value={validTo}
                        onChange={(e) => setValidTo(e.target.value)}
                        disabled={viewing}
                        className={cn(
                          'h-11 bg-muted/5 border-border/10 focus:border-primary/50 transition-all',
                          errors.validTo ? 'border-destructive focus-visible:ring-destructive' : ''
                        )}
                      />
                      {errors.validTo && <p className="text-xs text-destructive">{errors.validTo}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>
        </ScrollArea>

        {/* 底部操作栏 */}
        <div className="px-8 py-6 border-t flex flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            {editing && !viewing && (
              <Button
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-2 h-12 px-6 transition-all"
                onClick={onDelete}
                disabled={isSubmitting}
              >
                <Trash2 className="h-4 w-4" /> 删除优惠券
              </Button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="h-12 px-8 font-medium bg-muted/5 border-border/10 hover:bg-muted/10"
            >
              {viewing ? '关闭' : '取消'}
            </Button>
            {!viewing && (
              <Button
                onClick={() => onSubmit()}
                disabled={isSubmitting || loading}
                className="h-12 px-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl shadow-primary/40 gap-2 font-bold transition-all active:scale-95"
              >
                {isSubmitting ? '正在保存...' : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    {editing ? '保存更改' : '创建优惠券'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
