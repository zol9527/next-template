'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ChevronRight, ArrowLeft } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import type { ApiResponse } from '@/contracts/api-response.schema'
import { cn } from '@/lib/utils'

/**
 * 创建优惠券请求载荷类型
 *
 * 定义严格的字段类型，避免 Record<string, unknown> 导致的未知字段提交
 */
interface CreateCouponPayload {
  name: string
  type: 'fixed_amount' | 'discount' | 'threshold'
  description?: string
  amount?: number
  discountPercent?: number
  minSpend?: number
  perUserLimit?: number
  validFrom?: string
  validTo?: string
  validDays?: number
  usageLimit?: number
}

/** 验证错误字段 */
type ValidationField = 'name' | 'amount' | 'validFrom' | 'validTo' | 'validDays'

/**
 * 创建优惠券全页面表单
 *
 * 设计规范:
 *   - 不显示 TabBar，显示面包屑：优惠券管理 > 创建优惠券
 *   - 右上角：取消(描边) + 保存并发布(橙色实心)
 *   - 分段表单：
 *     1. 基本信息：优惠券名称(*)、优惠券类型(满减/折扣/固定金额下拉)
 *     2. 使用规则：优惠金额/折扣率(*)、最低消费、每人限领次数
 *     3. 其他设置：有效期(固定日期/领取后N天)、总发行量
 */
export function CreateCouponPage() {
  const router = useRouter()
  const { toast } = useToast()

  // 基本信息表单
  const [name, setName] = React.useState('')
  const [couponType, setCouponType] = React.useState<'fixed_amount' | 'discount' | 'threshold'>('fixed_amount')
  const [description, setDescription] = React.useState('')

  // 使用规则
  const [amount, setAmount] = React.useState('')
  const [minSpend, setMinSpend] = React.useState('')
  const [perUserLimit, setPerUserLimit] = React.useState('')

  // 其他设置
  const [validityType, setValidityType] = React.useState<'fixed' | 'relative'>('fixed')
  const [validFrom, setValidFrom] = React.useState('')
  const [validTo, setValidTo] = React.useState('')
  const [validDays, setValidDays] = React.useState('30')
  const [totalLimit, setTotalLimit] = React.useState('')

  // 创建 mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateCouponPayload) => {
      const res = await fetch('/api/v1/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        let errorMessage = res.statusText || '创建失败'
        try {
          const json = (await res.json()) as ApiResponse<unknown>
          if (!json.success) errorMessage = json.error?.message || '创建失败'
        } catch { /* ignore */ }
        throw new Error(errorMessage)
      }
      const json = (await res.json()) as ApiResponse<unknown>
      if (!json.success) throw new Error(json.error.message)
      return json.data
    },
    onSuccess: () => {
      toast({ title: '创建成功', description: '优惠券已创建' })
      router.push('/admin/coupons')
    },
    onError: (error) => {
      toast({
        title: '创建失败',
        description: error instanceof Error ? error.message : '网络错误',
        variant: 'destructive',
      })
    },
  })

  /**
   * 验证表单字段
   * 返回第一个错误消息，或 null 表示验证通过
   */
  function validate(): string | null {
    if (!name.trim()) return '请输入优惠券名称'
    if (name.trim().length > 100) return '优惠券名称不能超过 100 个字符'

    // 金额/折扣率验证
    const amountNum = Number(amount)
    if (amount && !Number.isFinite(amountNum)) return '优惠金额必须是有效数字'
    if (couponType === 'discount' && amount && (amountNum < 1 || amountNum > 99)) {
      return '折扣率必须在 1-99 之间'
    }
    if (couponType !== 'discount' && amount && amountNum <= 0) {
      return '优惠金额必须大于 0'
    }

    // 最低消费验证
    const minSpendNum = Number(minSpend)
    if (minSpend && (!Number.isFinite(minSpendNum) || minSpendNum < 0)) {
      return '最低消费必须为非负数字'
    }

    // 每人限领验证
    const perUserLimitNum = Number(perUserLimit)
    if (perUserLimit && (!Number.isFinite(perUserLimitNum) || perUserLimitNum < 0 || !Number.isInteger(perUserLimitNum))) {
      return '每人限领次数必须为非负整数'
    }

    // 有效期验证
    if (validityType === 'fixed') {
      if (validFrom && validTo && new Date(validFrom) >= new Date(validTo)) {
        return '结束日期必须晚于开始日期'
      }
    } else {
      const validDaysNum = Number(validDays)
      if (!Number.isFinite(validDaysNum) || validDaysNum <= 0 || !Number.isInteger(validDaysNum)) {
        return '有效天数必须为正整数'
      }
    }

    // 发行量验证
    const totalLimitNum = Number(totalLimit)
    if (totalLimit && (!Number.isFinite(totalLimitNum) || totalLimitNum <= 0 || !Number.isInteger(totalLimitNum))) {
      return '总发行量必须为正整数'
    }

    return null
  }

  function handleSubmit() {
    const validationError = validate()
    if (validationError) {
      toast({ title: '参数错误', description: validationError, variant: 'destructive' })
      return
    }

    const data: CreateCouponPayload = {
      name: name.trim(),
      type: couponType,
      description: description.trim() || undefined,
    }

    // 使用规则
    if (amount) {
      if (couponType === 'discount') {
        data.discountPercent = Number(amount)
      } else {
        data.amount = Number(amount)
      }
    }
    if (minSpend) data.minSpend = Number(minSpend)
    if (perUserLimit) data.perUserLimit = Number(perUserLimit)

    // 有效期
    if (validityType === 'fixed') {
      if (validFrom) data.validFrom = new Date(validFrom).toISOString()
      if (validTo) data.validTo = new Date(validTo).toISOString()
    } else {
      data.validDays = Number(validDays) || 30
    }

    // 发行量
    if (totalLimit) data.usageLimit = Number(totalLimit)

    createMutation.mutate(data)
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* 面包屑 + 操作按钮 */}
      <div className="flex items-center justify-between">
        {/* 面包屑导航 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/admin/coupons')}
            className="flex items-center gap-1.5 text-body-sm text-fg-muted hover:text-fg motion-safe:transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            优惠券管理
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-fg-muted" />
          <span className="text-body-sm text-fg font-medium">创建优惠券</span>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/coupons')}
            className="rounded-lg border-border-default"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="shadow-lg shadow-primary/20"
          >
            {createMutation.isPending ? '保存中...' : '保存并发布'}
          </Button>
        </div>
      </div>

      {/* 分段表单容器 */}
      <div className="max-w-[680px] flex flex-col gap-8">

        {/* 第一段：基本信息 */}
        <section>
          <h3 className="heading-2 mb-4">基本信息</h3>
          <div className="space-y-4">
            {/* 优惠券名称 */}
            <div className="space-y-2">
              <Label htmlFor="coupon-name" className="text-body-sm font-medium">
                优惠券名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="coupon-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：新人专享 8 折券"
              />
            </div>

            {/* 优惠券类型 */}
            <div className="space-y-2">
              <Label htmlFor="coupon-type" className="text-body-sm font-medium">
                优惠券类型
              </Label>
              <Select value={couponType} onValueChange={(v) => setCouponType(v as typeof couponType)}>
                <SelectTrigger id="coupon-type" className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="fixed_amount">固定金额（满减）</SelectItem>
                  <SelectItem value="discount">折扣率</SelectItem>
                  <SelectItem value="threshold">阶梯满减</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 描述 */}
            <div className="space-y-2">
              <Label htmlFor="coupon-desc" className="text-body-sm font-medium">
                描述（可选）
              </Label>
              <Textarea
                id="coupon-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="优惠券使用说明..."
                rows={3}
              />
            </div>
          </div>
        </section>

        {/* 第二段：使用规则 */}
        <section className="pt-6 border-t border-border-default">
          <h3 className="heading-2 mb-4">使用规则</h3>
          <div className="space-y-4">
            {/* 优惠金额/折扣率 */}
            <div className="space-y-2">
              <Label htmlFor="coupon-amount" className="text-body-sm font-medium">
                {couponType === 'discount' ? '折扣率 (%)' : '优惠金额 (元)'}
                {' '}<span className="text-destructive">*</span>
              </Label>
              <Input
                id="coupon-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={couponType === 'discount' ? '例如：80 表示 8 折' : '例如：10'}
              />
            </div>

            {/* 最低消费 */}
            <div className="space-y-2">
              <Label htmlFor="min-spend" className="text-body-sm font-medium">
                最低消费 (元)
              </Label>
              <Input
                id="min-spend"
                type="number"
                value={minSpend}
                onChange={(e) => setMinSpend(e.target.value)}
                placeholder="0 表示无门槛"
              />
            </div>

            {/* 每人限领次数 */}
            <div className="space-y-2">
              <Label htmlFor="per-user-limit" className="text-body-sm font-medium">
                每人限领次数
              </Label>
              <Input
                id="per-user-limit"
                type="number"
                value={perUserLimit}
                onChange={(e) => setPerUserLimit(e.target.value)}
                placeholder="0 表示不限"
              />
            </div>
          </div>
        </section>

        {/* 第三段：其他设置 */}
        <section className="pt-6 border-t border-border-default">
          <h3 className="heading-2 mb-4">其他设置</h3>
          <div className="space-y-4">
            {/* 有效期类型 */}
            <div className="space-y-2">
              <Label className="text-body-sm font-medium">有效期</Label>
              <div className="flex items-center gap-3">
                <button
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-body-sm motion-safe:transition-colors',
                    validityType === 'fixed'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface border border-border-default text-fg-secondary hover:border-border-medium'
                  )}
                  onClick={() => setValidityType('fixed')}
                >
                  固定日期
                </button>
                <button
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-body-sm motion-safe:transition-colors',
                    validityType === 'relative'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface border border-border-default text-fg-secondary hover:border-border-medium'
                  )}
                  onClick={() => setValidityType('relative')}
                >
                  领取后 N 天
                </button>
              </div>
            </div>

            {/* 有效期输入 */}
            {validityType === 'fixed' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valid-from" className="text-body-sm font-medium">开始日期</Label>
                  <Input
                    id="valid-from"
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valid-to" className="text-body-sm font-medium">结束日期</Label>
                  <Input
                    id="valid-to"
                    type="date"
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="valid-days" className="text-body-sm font-medium">
                  领取后有效天数
                </Label>
                <Input
                  id="valid-days"
                  type="number"
                  value={validDays}
                  onChange={(e) => setValidDays(e.target.value)}
                  placeholder="30"
                />
              </div>
            )}

            {/* 总发行量 */}
            <div className="space-y-2">
              <Label htmlFor="total-limit" className="text-body-sm font-medium">
                总发行量
              </Label>
              <Input
                id="total-limit"
                type="number"
                value={totalLimit}
                onChange={(e) => setTotalLimit(e.target.value)}
                placeholder="0 表示不限量"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
