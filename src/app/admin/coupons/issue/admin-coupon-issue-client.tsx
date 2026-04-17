'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { LayoutDashboard, Gift, Tag, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminCouponIssueForm } from '@/components/business/admin/coupon/admin-coupon-issue-form'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { Coupon } from '@/plugins/ecommerce/contracts/coupons.dto'
import type { ListCouponsResponse } from '@/plugins/ecommerce/contracts/admin-coupons.dto'
import { ListCouponsResponseSchema } from '@/plugins/ecommerce/contracts/admin-coupons.dto'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'

/**
Function: AdminCouponIssueClient

Description: 优惠券发放页面的客户端组件

Parameters:

Returns:
	element(React.ReactElement): 优惠券发放页面
*/
export function AdminCouponIssueClient() {
  // 弹窗状态
  const [issueMode, setIssueMode] = React.useState<'idle' | 'issue'>('idle')
  const [selectedCouponId, setSelectedCouponId] = React.useState<string | null>(null)
  const [selectedCouponName, setSelectedCouponName] = React.useState<string>('')

  // 搜索状态
  const [searchKeyword, setSearchKeyword] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState<string>('all')

  const debouncedKeyword = useDebounce(searchKeyword, 500)

  // 获取优惠券列表
  const { data: couponsData, isLoading } = useQuery<ListCouponsResponse>({
    queryKey: ['admin', 'coupons', { keyword: debouncedKeyword, type: typeFilter }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (debouncedKeyword) params.set('name', debouncedKeyword)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      params.set('limit', '50') // 获取更多用于选择

      const res = await fetch(`/api/v1/admin/coupons?${params.toString()}`, { credentials: 'include' })
      const json = (await res.json()) as ApiResponse<unknown>

      if (!res.ok) {
        throw new Error(json.success === false ? json.error.message : res.statusText)
      }

      if (!json.success) {
        throw new Error(json.error.message)
      }

      const parsed = ListCouponsResponseSchema.safeParse(json.data)
      if (!parsed.success) {
        throw new Error('响应数据格式不符合预期')
      }

      return parsed.data
    },
  })

  const coupons = couponsData?.coupons ?? []

  // 处理发放点击
  const handleIssue = (coupon: Coupon) => {
    setSelectedCouponId(coupon.id)
    setSelectedCouponName(coupon.name)
    setIssueMode('issue')
  }

  // 优惠券类型标签
  const getTypeBadge = (type: string) => {
    const config: Record<string, { label: string; className: string }> = {
      discount: { label: '折扣券', className: 'bg-primary/10 text-primary' },
      fixed_amount: { label: '固定金额', className: 'bg-success/10 text-success' },
      threshold: { label: '满减券', className: 'bg-primary/10 text-primary' },
      gift: { label: '赠品', className: 'bg-warning/10 text-warning' },
    }
    const item = config[type] || { label: type, className: 'bg-muted text-muted-foreground' }
    return (
      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', item.className)}>
        {item.label}
      </span>
    )
  }

  // 优惠券状态标签
  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      draft: { label: '草稿', className: 'bg-muted text-muted-foreground' },
      scheduled: { label: '待生效', className: 'bg-info/10 text-info' },
      active: { label: '生效中', className: 'bg-success/10 text-success' },
      paused: { label: '已暂停', className: 'bg-warning/10 text-warning' },
      expired: { label: '已过期', className: 'bg-destructive/10 text-destructive' },
      disabled: { label: '已禁用', className: 'bg-muted text-muted-foreground' },
    }
    const item = config[status] || { label: status, className: 'bg-muted text-muted-foreground' }
    return (
      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', item.className)}>
        {item.label}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">

      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground/60">后台管理 / 运营中心</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">发放优惠券</h1>
          <p className="text-sm text-foreground/50 mt-1">选择优惠券模板并发放给指定用户或按角色批量发放。</p>
        </div>
      </div>

      {/* 搜索与筛选 */}
      <div className="flex flex-wrap items-center gap-4 bg-muted/10 p-3 border border-border/30">
        <div className="relative flex-1 min-w-60 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
          <Input
            placeholder="搜索优惠券..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="pl-10 h-10 bg-muted/5 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/30"
          />
        </div>

        <Select
          value={typeFilter}
          onValueChange={setTypeFilter}
        >
          <SelectTrigger className="w-30 h-10 bg-muted/10 border-none">
            <SelectValue placeholder="所有类型" />
          </SelectTrigger>
          <SelectContent className="bg-card">
            <SelectItem value="all">所有类型</SelectItem>
            <SelectItem value="discount">折扣券</SelectItem>
            <SelectItem value="fixed_amount">固定金额券</SelectItem>
            <SelectItem value="threshold">满减券</SelectItem>
            <SelectItem value="gift">赠品券</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 优惠券列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          加载中...
        </div>
      ) : coupons.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Gift className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">暂无可发放的优惠券</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.href = '/admin/coupons'}
            >
              去创建优惠券
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((coupon) => (
            <Card key={coupon.id} className="hover:border-primary/30 transition-colors">
              <CardHeader className="border-b">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg font-semibold truncate max-w-40">
                      {coupon.name}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    {getTypeBadge(coupon.type)}
                    {getStatusBadge(coupon.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {coupon.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {coupon.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    已使用 {coupon.usedCount}
                    {coupon.usageLimit ? `/${coupon.usageLimit}` : ''}
                  </span>
                  <span className="text-muted-foreground">
                    {coupon.validTo ? new Date(coupon.validTo).toLocaleDateString() : '无期限'}
                  </span>
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={() => handleIssue(coupon)}
                  disabled={coupon.status !== 'active'}
                >
                  <Gift className="h-4 w-4" />
                  发放优惠券
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 发放弹窗 */}
      {issueMode === 'issue' && selectedCouponId && (
        <AdminCouponIssueForm
          couponId={selectedCouponId}
          couponName={selectedCouponName}
          onSaved={() => {
            setIssueMode('idle')
            setSelectedCouponId(null)
            setSelectedCouponName('')
          }}
          onCancel={() => {
            setIssueMode('idle')
            setSelectedCouponId(null)
            setSelectedCouponName('')
          }}
        />
      )}
    </div>
  )
}
