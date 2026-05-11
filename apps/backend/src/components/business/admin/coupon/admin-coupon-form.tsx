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
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Zap,
  Sparkles,
  Timer,
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

  // 抖动动画字段追踪（验证失败时触发抖动动画，吸引注意力）
  const [shakingFields, setShakingFields] = React.useState<Set<string>>(new Set())

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

        // 触发错误字段的抖动动画
        const errorKeys = Object.keys(errorObj)
        setShakingFields(new Set(errorKeys))
        setTimeout(() => setShakingFields(new Set()), 600)

        // 自动滚动到第一个有错误的字段
        // 使用 errorKeys 顺序查找，确保只滚动到真正有错误的字段
        requestAnimationFrame(() => {
          for (const key of errorKeys) {
            const errorEl = document.querySelector(`[data-error-field="${key}"]`) as HTMLElement
            if (errorEl) {
              // 在 ScrollArea 内使用 scrollIntoView，避免滚动整个页面
              errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
              break
            }
          }
        })

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

  // ==================== 新增的 UI 辅助状态与函数 ====================

  // 使用限制区域的展开/收起状态（新建时默认收起，编辑/查看时默认展开）
  const [usageLimitsExpanded, setUsageLimitsExpanded] = React.useState(editing || viewing)

  // 字段名中文映射（用于错误提示）
  const fieldNameMap: Record<string, string> = {
    name: '优惠券名称',
    type: '优惠券类型',
    discountPercent: '折扣百分比',
    discountAmount: '固定减免金额',
    thresholdAmount: '满减门槛金额',
    thresholdDiscount: '满减优惠金额',
    giftProductId: '赠品商品 ID',
    validFrom: '开始时间',
    validTo: '结束时间',
    minOrderAmount: '最低订单金额',
    maxDiscountAmount: '最大折扣金额',
    perUserLimit: '每人限用次数',
    usageLimit: '总使用次数限制',
  }

  // 格式化日期时间为本地 datetime-local 字符串
  const formatDateTimeLocal = (date: Date, time: string = '00:00'): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}T${time}`
  }

  // 快速设置有效期
  const applyDatePreset = (preset: 'today' | 'week' | 'month' | 'forever') => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let from = ''
    let to = ''

    switch (preset) {
      case 'today':
        from = formatDateTimeLocal(today, '00:00')
        to = formatDateTimeLocal(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), '23:59')
        break
      case 'week':
        from = formatDateTimeLocal(today, '00:00')
        to = formatDateTimeLocal(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), '23:59')
        break
      case 'month':
        from = formatDateTimeLocal(today, '00:00')
        to = formatDateTimeLocal(new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()), '23:59')
        break
      case 'forever':
        from = formatDateTimeLocal(today, '00:00')
        to = formatDateTimeLocal(new Date(today.getFullYear() + 10, today.getMonth(), today.getDate()), '23:59')
        break
    }

    setValidFrom(from)
    setValidTo(to)
  }

  // 快速应用优惠券预设
  const applyCouponPreset = (preset: 'discount85' | 'threshold10020' | 'gift') => {
    switch (preset) {
      case 'discount85':
        setCouponType('discount')
        setDiscountPercent('85')
        break
      case 'threshold10020':
        setCouponType('threshold')
        setThresholdAmount('100')
        setThresholdDiscount('20')
        break
      case 'gift':
        setCouponType('gift')
        setGiftProductId('')
        break
    }
  }

  // 人类可读的日期格式
  const formatDateReadable = (datetime: string): string => {
    if (!datetime) return '未设置'
    const [date, time] = datetime.split('T')
    const [year, month, day] = date.split('-')
    return `${year}年${month}月${day}日 ${time || '00:00'}`
  }

  // 渲染类型相关字段
  const renderTypeSpecificFields = () => {
    switch (couponType) {
      case 'discount':
        return (
          <div className="space-y-2" data-error-field="discountPercent">
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
                  errors.discountPercent ? 'border-destructive focus-visible:ring-destructive' : '',
                  shakingFields.has('discountPercent') ? 'animate-form-shake' : ''
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
          <div className="space-y-2" data-error-field="discountAmount">
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
                  errors.discountAmount ? 'border-destructive focus-visible:ring-destructive' : '',
                  shakingFields.has('discountAmount') ? 'animate-form-shake' : ''
                )}
              />
            </div>
            {errors.discountAmount && <p className="text-xs text-destructive">{errors.discountAmount}</p>}
          </div>
        )

      case 'threshold':
        return (
          <>
            <div className="space-y-2" data-error-field="thresholdAmount">
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
                    errors.thresholdAmount ? 'border-destructive focus-visible:ring-destructive' : '',
                    shakingFields.has('thresholdAmount') ? 'animate-form-shake' : ''
                  )}
                />
              </div>
              {errors.thresholdAmount && <p className="text-xs text-destructive">{errors.thresholdAmount}</p>}
            </div>

            <div className="space-y-2" data-error-field="thresholdDiscount">
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
                    errors.thresholdDiscount ? 'border-destructive focus-visible:ring-destructive' : '',
                    shakingFields.has('thresholdDiscount') ? 'animate-form-shake' : ''
                  )}
                />
              </div>
              {errors.thresholdDiscount && <p className="text-xs text-destructive">{errors.thresholdDiscount}</p>}
            </div>
          </>
        )

      case 'gift':
        return (
          <div className="space-y-2" data-error-field="giftProductId">
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
                errors.giftProductId ? 'border-destructive focus-visible:ring-destructive' : '',
                shakingFields.has('giftProductId') ? 'animate-form-shake' : ''
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
            <form onSubmit={onSubmit} className="space-y-6">
              {/* 全局错误提示横幅 */}
              {Object.keys(errors).length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3 animate-in slide-in-from-top-2 fade-in duration-300">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-destructive">表单校验失败，请修正以下问题：</p>
                    <ul className="mt-2 space-y-1">
                      {Object.entries(errors).map(([field, message]) => (
                        <li key={field} className="text-sm text-destructive/80 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-destructive/60 shrink-0 mt-1.5" />
                          <span>
                            <span className="font-medium">{fieldNameMap[field] || field}：</span>
                            {message}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* 快速预设（仅新建模式） */}
              {!viewing && mode === 'create' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground font-medium mr-1">快速预设：</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyCouponPreset('discount85')}
                    className="h-8 gap-1.5 text-xs border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-colors"
                  >
                    <Zap className="h-3.5 w-3.5 text-primary" /> 85折优惠
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyCouponPreset('threshold10020')}
                    className="h-8 gap-1.5 text-xs border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> 满100减20
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyCouponPreset('gift')}
                    className="h-8 gap-1.5 text-xs border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-colors"
                  >
                    <Gift className="h-3.5 w-3.5 text-primary" /> 新品赠送
                  </Button>
                </div>
              )}

              {/* 基本信息与折扣设置 */}
              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" /> 基本信息与折扣设置
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* 基本信息 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2 md:col-span-2" data-error-field="name">
                      <Label className="text-sm font-semibold text-foreground/70">
                        优惠券名称 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="请输入优惠券名称..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={viewing}
                        className={cn(
                          'h-11 bg-muted/5 border-border/10 focus:border-primary/50 transition-all',
                          errors.name ? 'border-destructive focus-visible:ring-destructive' : '',
                          shakingFields.has('name') ? 'animate-form-shake' : ''
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
                        className="h-11"
                      />
                    </div>

                    <div className="flex flex-col gap-2" data-error-field="type">
                      <Label className="text-sm font-semibold text-foreground/70">
                        优惠券类型 <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={couponType}
                        onValueChange={(value) => setCouponType(value as CouponType)}
                        disabled={editing || viewing}
                      >
                        <SelectTrigger className={cn('h-11', errors.type ? 'border-destructive' : '')}>
                          <SelectValue placeholder="选择优惠券类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="discount">折扣券</SelectItem>
                          <SelectItem value="fixed_amount">固定金额券</SelectItem>
                          <SelectItem value="threshold">满减券</SelectItem>
                          <SelectItem value="gift">赠品券</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
                    </div>

                    {editing && (
                      <div className="flex flex-col gap-2">
                        <Label className="text-sm font-semibold text-foreground/70">优惠券状态</Label>
                        <Select
                          value={status || ''}
                          onValueChange={(value) => setStatus(value as CouponStatus)}
                          disabled={viewing}
                        >
                          <SelectTrigger className="h-11">
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

                  {/* 分隔线 */}
                  <div className="border-t" />

                  {/* 折扣设置 */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground/70 mb-4 flex items-center gap-2">
                      {couponType === 'discount' && <Percent className="h-4 w-4 text-primary" />}
                      {couponType === 'fixed_amount' && <DollarSign className="h-4 w-4 text-primary" />}
                      {couponType === 'threshold' && <Tag className="h-4 w-4 text-primary" />}
                      {couponType === 'gift' && <Gift className="h-4 w-4 text-primary" />}
                      {couponType === 'discount' && '折扣比例设置'}
                      {couponType === 'fixed_amount' && '固定金额减免设置'}
                      {couponType === 'threshold' && '满减规则设置'}
                      {couponType === 'gift' && '赠品设置'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {renderTypeSpecificFields()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 使用限制（可折叠） */}
              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle
                    className="text-lg font-semibold flex items-center justify-between cursor-pointer select-none"
                    onClick={() => !viewing && setUsageLimitsExpanded(!usageLimitsExpanded)}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" /> 使用限制
                    </div>
                    {!viewing && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation()
                          setUsageLimitsExpanded(!usageLimitsExpanded)
                        }}
                      >
                        {usageLimitsExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                {usageLimitsExpanded && (
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-foreground/70">最低订单金额</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">¥</span>
                          <Input
                            placeholder="例如：50.00"
                            value={minOrderAmount}
                            onChange={(e) => setMinOrderAmount(e.target.value)}
                            disabled={viewing}
                            className="pl-8 h-11 bg-muted/5 border-border/10 focus:border-primary/50 transition-all"
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
                            className="pl-8 h-11 bg-muted/5 border-border/10 focus:border-primary/50 transition-all"
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
                          className="h-11 bg-muted/5 border-border/10 focus:border-primary/50 transition-all"
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
                          className="h-11 bg-muted/5 border-border/10 focus:border-primary/50 transition-all"
                        />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* 有效期 */}
              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" /> 有效期
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* 快速设置 */}
                  {!viewing && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground font-medium mr-1">快速设置：</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyDatePreset('today')}
                        className="h-8 text-xs gap-1.5 border-border/20 hover:bg-primary/5 hover:border-primary/30 transition-colors"
                      >
                        <Timer className="h-3.5 w-3.5" /> 今天开始
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyDatePreset('week')}
                        className="h-8 text-xs gap-1.5 border-border/20 hover:bg-primary/5 hover:border-primary/30 transition-colors"
                      >
                        <Calendar className="h-3.5 w-3.5" /> 1周内
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyDatePreset('month')}
                        className="h-8 text-xs gap-1.5 border-border/20 hover:bg-primary/5 hover:border-primary/30 transition-colors"
                      >
                        <Calendar className="h-3.5 w-3.5" /> 1个月内
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyDatePreset('forever')}
                        className="h-8 text-xs gap-1.5 border-border/20 hover:bg-primary/5 hover:border-primary/30 transition-colors"
                      >
                        <Clock className="h-3.5 w-3.5" /> 永久有效
                      </Button>
                    </div>
                  )}

                  {/* 日期预览 */}
                  {(validFrom || validTo) && (
                    <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary shrink-0" />
                      <p className="text-sm text-primary/80 font-medium">
                        {validFrom && validTo
                          ? `${formatDateReadable(validFrom)} 至 ${formatDateReadable(validTo)}`
                          : validFrom
                          ? `自 ${formatDateReadable(validFrom)} 开始`
                          : `至 ${formatDateReadable(validTo)} 结束`}
                      </p>
                    </div>
                  )}

                  {/* 日期时间输入 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2" data-error-field="validFrom">
                      <Label className="text-sm font-semibold text-foreground/70">
                        开始时间 <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={validFrom ? validFrom.split('T')[0] : ''}
                          onChange={(e) => {
                            const date = e.target.value
                            const time = validFrom ? validFrom.split('T')[1] || '00:00' : '00:00'
                            setValidFrom(date ? `${date}T${time}` : '')
                          }}
                          disabled={viewing}
                          className={cn(
                            'h-11 bg-muted/5 border-border/10 focus:border-primary/50 transition-all flex-1',
                            errors.validFrom ? 'border-destructive focus-visible:ring-destructive' : '',
                            shakingFields.has('validFrom') ? 'animate-form-shake' : ''
                          )}
                        />
                        <Select
                          value={validFrom ? validFrom.split('T')[1] || '00:00' : '00:00'}
                          onValueChange={(time) => {
                            const date = validFrom ? validFrom.split('T')[0] : ''
                            setValidFrom(date ? `${date}T${time}` : '')
                          }}
                          disabled={viewing}
                        >
                          <SelectTrigger className={cn('h-11 w-[110px]', errors.validFrom ? 'border-destructive' : '')}>
                            <Clock className="h-4 w-4 text-muted-foreground mr-1" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => {
                              const hour = String(i).padStart(2, '0')
                              return (
                                <SelectItem key={hour} value={`${hour}:00`}>{`${hour}:00`}</SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      {errors.validFrom && <p className="text-xs text-destructive">{errors.validFrom}</p>}
                    </div>

                    <div className="space-y-2" data-error-field="validTo">
                      <Label className="text-sm font-semibold text-foreground/70">
                        结束时间 <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={validTo ? validTo.split('T')[0] : ''}
                          onChange={(e) => {
                            const date = e.target.value
                            const time = validTo ? validTo.split('T')[1] || '23:59' : '23:59'
                            setValidTo(date ? `${date}T${time}` : '')
                          }}
                          disabled={viewing}
                          className={cn(
                            'h-11 bg-muted/5 border-border/10 focus:border-primary/50 transition-all flex-1',
                            errors.validTo ? 'border-destructive focus-visible:ring-destructive' : '',
                            shakingFields.has('validTo') ? 'animate-form-shake' : ''
                          )}
                        />
                        <Select
                          value={validTo ? validTo.split('T')[1] || '23:59' : '23:59'}
                          onValueChange={(time) => {
                            const date = validTo ? validTo.split('T')[0] : ''
                            setValidTo(date ? `${date}T${time}` : '')
                          }}
                          disabled={viewing}
                        >
                          <SelectTrigger className={cn('h-11 w-[110px]', errors.validTo ? 'border-destructive' : '')}>
                            <Clock className="h-4 w-4 text-muted-foreground mr-1" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => {
                              const hour = String(i).padStart(2, '0')
                              return (
                                <SelectItem key={hour} value={`${hour}:00`}>{`${hour}:00`}</SelectItem>
                              )
                            })}
                            {/* 当天最后一刻，常用于结束时间 */}
                            <SelectItem value="23:59">23:59</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
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
