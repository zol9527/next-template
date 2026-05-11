'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Gift, Tag, CheckCircle } from 'lucide-react'
import { AdminTabs, AdminTabsList, AdminTabsTrigger, AdminTabsContent } from '@/components/ui/admin-tabs'
import { AdminCouponForm } from '@/components/business/admin/coupon/admin-coupon-form'
import { AdminCouponIssueForm } from '@/components/business/admin/coupon/admin-coupon-issue-form'
import { AdminCouponList } from '@/components/business/admin/coupon/admin-coupon-list'
import { AdminRedemptionList } from '@/components/business/admin/coupon/admin-redemption-list'
import { AdminFilterBar } from '@/components/ui/admin-filter-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDebounce } from '@/hooks/use-debounce'
import { useQueryClient } from '@tanstack/react-query'
import { Separator } from '@/components/ui/separator'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { Coupon } from '@/plugins/ecommerce/contracts/coupons.dto'
import type { ListCouponsResponse } from '@/plugins/ecommerce/contracts/admin-coupons.dto'
import { ListCouponsResponseSchema, ListRedemptionsResponseSchema } from '@/plugins/ecommerce/contracts/admin-coupons.dto'
import { cn } from '@/lib/utils'
import { AdminPageLayout } from '@/components/ui/admin-page-layout'
import { AdminPageHeader } from '@/components/ui/admin-page-header'

/**
Function: AdminCouponsClient

Description: 优惠券管理页面的客户端组件

Parameters:

Returns:
	element(React.ReactElement): 优惠券管理页面
*/
export function AdminCouponsClient() {
  const queryClient = useQueryClient()

  // 弹窗状态
  const [activeCouponId, setActiveCouponId] = React.useState<string | null>(null)
  const [formMode, setFormMode] = React.useState<'idle' | 'create' | 'edit' | 'view'>('idle')
  const [issueMode, setIssueMode] = React.useState<'idle' | 'issue'>('idle')
  const [issueCouponName, setIssueCouponName] = React.useState<string>('')

  // 筛选状态（优惠券列表）
  const [keyword, setKeyword] = React.useState('')
  const [status, setStatus] = React.useState<string>('all')
  const [couponType, setCouponType] = React.useState<string>('all')

  // Select 打开状态
  const [statusSelectOpen, setStatusSelectOpen] = React.useState(false)
  const [typeSelectOpen, setTypeSelectOpen] = React.useState(false)

  // 标记是否正在选择（用于防止 onOpenChange 关闭）
  const isSelectingRef = React.useRef(false)

  const debouncedKeyword = useDebounce(keyword, 500)

  const filters = React.useMemo(() => ({
    keyword: debouncedKeyword || undefined,
    status: status === 'all' ? undefined : status,
    type: couponType === 'all' ? undefined : couponType,
  }), [debouncedKeyword, status, couponType])

  const { data: couponsData } = useQuery<ListCouponsResponse>({
    queryKey: ['admin', 'coupons', { limit: 50 }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' })
      const res = await fetch(`/api/v1/admin/coupons?${params.toString()}`, { credentials: 'include' })
      const json = (await res.json()) as ApiResponse<unknown>
      if (!json.success) throw new Error(json.error.message)
      const parsed = ListCouponsResponseSchema.safeParse(json.data)
      if (!parsed.success) throw new Error('响应数据格式不符合预期')
      return parsed.data
    },
    staleTime: 30000,
  })

  const coupons = React.useMemo(() => couponsData?.coupons ?? [], [couponsData])

  const filteredCoupons = React.useMemo(() => {
    if (!filters.keyword && !filters.status && !filters.type) {
      return coupons
    }
    return coupons.filter(coupon => {
      if (filters.keyword && !coupon.name.includes(filters.keyword)) return false
      if (filters.status && coupon.status !== filters.status) return false
      if (filters.type && coupon.type !== filters.type) return false
      return true
    })
  }, [coupons, filters])

  function refreshList() {
    queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] })
  }

  // 处理发放按钮点击
  const handleIssueClick = (coupon: Coupon) => {
    setActiveCouponId(coupon.id)
    setIssueCouponName(coupon.name)
    setIssueMode('issue')
  }

  return (
    <AdminPageLayout>

      {/* 页面头部 */}
      <AdminPageHeader
        description="管理应用内的优惠券模板，包括创建、编辑、发放和核销记录。"
        actions={
          <div className="flex items-center gap-3 tabs-new-button">
            <Button
              type="button"
              className="shadow-lg shadow-primary/20 gap-2 motion-safe:hover:scale-[1.02] motion-safe:transition-transform motion-safe:duration-200"
              onClick={() => {
                setActiveCouponId(null)
                setFormMode('create')
              }}
              aria-label="创建新优惠券"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              新建优惠券
            </Button>
          </div>
        }
      />

      {/* Tabs 切换 */}
      <AdminTabs defaultValue="list" className="w-full">
        <AdminTabsList className="bg-muted/5 p-1 h-12" role="tablist" aria-label="优惠券管理标签页">
          <AdminTabsTrigger
            value="list"
            className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground motion-safe:transition-all motion-safe:duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="查看优惠券列表"
          >
            <Tag className="h-4 w-4 mr-2" aria-hidden="true" />
            优惠券列表
          </AdminTabsTrigger>
          <AdminTabsTrigger
            value="issue"
            className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground motion-safe:transition-all motion-safe:duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="发放优惠券给用户"
          >
            <Gift className="h-4 w-4 mr-2" aria-hidden="true" />
            发放优惠券
          </AdminTabsTrigger>
          <AdminTabsTrigger
            value="redemptions"
            className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground motion-safe:transition-all motion-safe:duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="查看优惠券核销记录"
            onMouseEnter={() => {
              // 鼠标悬停时预加载核销记录数据，减少点击后的等待时间
              queryClient.prefetchQuery({
                queryKey: ['admin', 'redemptions', { filters: '', pageSize: 20, cursor: null }],
                queryFn: async () => {
                  const res = await fetch('/api/v1/admin/coupons/redemptions?limit=20', { credentials: 'include' })
                  const json = (await res.json()) as ApiResponse<unknown>
                  if (!json.success) throw new Error(json.error.message)
                  const parsed = ListRedemptionsResponseSchema.safeParse(json.data)
                  if (!parsed.success) throw new Error('响应数据格式不符合预期')
                  return parsed.data
                },
                staleTime: 30_000,
              })
            }}
          >
            <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
            核销记录
          </AdminTabsTrigger>
        </AdminTabsList>

        {/* Tab 1: 优惠券列表 */}
        <AdminTabsContent value="list" className="mt-6 space-y-6" role="tabpanel" aria-labelledby="tab-list">
          {/* 搜索与筛选工具栏 */}
          <AdminFilterBar aria-label="搜索与筛选">
            <div className="relative flex-1 min-w-60 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" aria-hidden="true" />
              <Input
                placeholder="搜索优惠券名称…"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-10 h-10 bg-muted/5 border-none shadow-none"
                aria-label="搜索优惠券名称"
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* 优惠券状态 */}
              <Select
                value={status}
                onValueChange={(value) => {
                  isSelectingRef.current = true
                  setStatus(value)
                  setStatusSelectOpen(true)
                  setTimeout(() => { isSelectingRef.current = false }, 0)
                }}
                open={statusSelectOpen}
                onOpenChange={(open) => {
                  if (!open && isSelectingRef.current) return
                  setStatusSelectOpen(open)
                }}
              >
                <SelectTrigger
                  className="w-[140px] h-10 bg-muted/10 border-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-safe:transition-all motion-safe:duration-200"
                  aria-label="选择优惠券状态"
                >
                  <SelectValue placeholder="所有状态" />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectGroup>
                    <SelectLabel>状态</SelectLabel>
                    <Separator className='my-1' />
                    <SelectItem value="all">所有状态</SelectItem>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="scheduled">待生效</SelectItem>
                    <SelectItem value="active">生效中</SelectItem>
                    <SelectItem value="paused">已暂停</SelectItem>
                    <SelectItem value="expired">已过期</SelectItem>
                    <SelectItem value="disabled">已禁用</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              {/* 优惠券类型 */}
              <Select
                value={couponType}
                onValueChange={(value) => {
                  isSelectingRef.current = true
                  setCouponType(value)
                  setTypeSelectOpen(true)
                  setTimeout(() => { isSelectingRef.current = false }, 0)
                }}
                open={typeSelectOpen}
                onOpenChange={(open) => {
                  if (!open && isSelectingRef.current) return
                  setTypeSelectOpen(open)
                }}
              >
                <SelectTrigger
                  className="w-[140px] h-10 bg-muted/10 border-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-safe:transition-all motion-safe:duration-200"
                  aria-label="选择优惠券类型"
                >
                  <SelectValue placeholder="所有类型" />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectGroup>
                    <SelectLabel>类型</SelectLabel>
                    <Separator className='my-1' />
                    <SelectItem value="all">所有类型</SelectItem>
                    <SelectItem value="discount">折扣券</SelectItem>
                    <SelectItem value="fixed_amount">固定金额券</SelectItem>
                    <SelectItem value="threshold">满减券</SelectItem>
                    <SelectItem value="gift">赠品券</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              {(keyword || status !== 'all' || couponType !== 'all') && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setKeyword('')
                    setStatus('all')
                    setCouponType('all')
                  }}
                  className="h-10 text-foreground/40 hover:text-foreground whitespace-nowrap focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-safe:transition-all motion-safe:duration-200"
                >
                  重置
                </Button>
              )}
            </div>
          </AdminFilterBar>

          {/* 列表区域 */}
          <section aria-label="优惠券列表">
            <AdminCouponList
              coupons={filteredCoupons}
              onEdit={(couponId) => {
                setActiveCouponId(couponId)
                setFormMode('edit')
              }}
              onDelete={() => {}}
              onDeleted={() => {
                queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] })
              }}
            />
          </section>
        </AdminTabsContent>

        {/* Tab 2: 发放优惠券 */}
        <AdminTabsContent value="issue" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coupons.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="p-12 text-center">
                  <Gift className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">暂无可发放的优惠券</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      // 切换到列表 Tab
                      const listTab = document.querySelector('[data-value="list"]') as HTMLElement
                      listTab?.click()
                    }}
                  >
                    去创建优惠券
                  </Button>
                </CardContent>
              </Card>
            ) : (
              coupons.map((coupon) => (
                <Card
                  key={coupon.id}
                  className="hover:border-primary/30 motion-safe:transition-all motion-safe:duration-200 hover:shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
                >
                  <CardHeader className="border-b">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"
                          aria-hidden="true"
                        >
                          <Tag className="h-4 w-4 text-primary" />
                        </div>
                        <CardTitle
                          className="text-lg font-semibold truncate max-w-40"
                          title={coupon.name}
                        >
                          {coupon.name}
                        </CardTitle>
                      </div>
                      <div
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium motion-safe:transition-colors motion-safe:duration-200',
                          coupon.status === 'active'
                            ? 'bg-success/10 text-success'
                            : coupon.status === 'draft'
                              ? 'bg-muted text-muted-foreground'
                              : coupon.status === 'scheduled'
                                ? 'bg-info/10 text-info'
                                : coupon.status === 'paused'
                                  ? 'bg-warning/10 text-warning'
                                  : coupon.status === 'expired'
                                    ? 'bg-destructive/10 text-destructive'
                                    : 'bg-muted text-muted-foreground'
                        )}
                        role="status"
                        aria-label={`状态: ${coupon.status === 'active' ? '生效中' : coupon.status === 'draft' ? '草稿' : coupon.status === 'scheduled' ? '待生效' : coupon.status === 'paused' ? '已暂停' : coupon.status === 'expired' ? '已过期' : '已禁用'}`}
                      >
                        {coupon.status === 'active'
                          ? '生效中'
                          : coupon.status === 'draft'
                            ? '草稿'
                            : coupon.status === 'scheduled'
                              ? '待生效'
                              : coupon.status === 'paused'
                                ? '已暂停'
                                : coupon.status === 'expired'
                                  ? '已过期'
                                  : '已禁用'}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {coupon.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2" title={coupon.description}>
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
                      type="button"
                      className="w-full gap-2 motion-safe:transition-all motion-safe:duration-200 motion-safe:hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      onClick={() => handleIssueClick(coupon)}
                      disabled={coupon.status !== 'active'}
                      aria-label={`发放 ${coupon.name} 优惠券`}
                      aria-disabled={coupon.status !== 'active'}
                    >
                      <Gift className="h-4 w-4" aria-hidden="true" />
                      {coupon.status === 'active' ? '发放优惠券' : '优惠券未生效'}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </AdminTabsContent>

        {/* Tab 3: 核销记录 */}
        <AdminTabsContent value="redemptions" className="mt-6">
          <RedemptionTabContent />
        </AdminTabsContent>
      </AdminTabs>

      {/* 表单弹窗（创建/编辑/查看） */}
      {formMode !== 'idle' && (
        <AdminCouponForm
          couponId={activeCouponId}
          mode={formMode}
          onSaved={() => {
            refreshList()
            setFormMode('idle')
            setActiveCouponId(null)
          }}
          onCancel={() => {
            setFormMode('idle')
            setActiveCouponId(null)
          }}
        />
      )}

      {/* 发放弹窗 */}
      {issueMode === 'issue' && (
        <AdminCouponIssueForm
          couponId={activeCouponId!}
          couponName={issueCouponName}
          onSaved={() => {
            refreshList()
            setIssueMode('idle')
            setActiveCouponId(null)
            setIssueCouponName('')
          }}
          onCancel={() => {
            setIssueMode('idle')
            setActiveCouponId(null)
            setIssueCouponName('')
          }}
        />
      )}
    </AdminPageLayout>
  )
}

// 核销记录 Tab 内容组件（独立出来避免重复加载）
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function RedemptionTabContent() {
  // 筛选状态
  const [couponId, setCouponId] = React.useState('')
  const [userId, setUserId] = React.useState('')
  const [orderId, setOrderId] = React.useState('')
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')

  const debouncedCouponId = useDebounce(couponId, 500)
  const debouncedUserId = useDebounce(userId, 500)
  const debouncedOrderId = useDebounce(orderId, 500)

  const filters = React.useMemo(() => ({
    couponId: debouncedCouponId || undefined,
    userId: debouncedUserId || undefined,
    orderId: debouncedOrderId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  }), [debouncedCouponId, debouncedUserId, debouncedOrderId, startDate, endDate])

  const hasFilters = !!(couponId || userId || orderId || startDate || endDate)

  const resetFilters = () => {
    setCouponId('')
    setUserId('')
    setOrderId('')
    setStartDate('')
    setEndDate('')
  }

  return (
    <div className="space-y-6">
      {/* 筛选工具栏 */}
      <AdminFilterBar>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
          <Input
            placeholder="优惠券 ID"
            value={couponId}
            onChange={(e) => setCouponId(e.target.value)}
            className="h-10 bg-muted/5 border-none shadow-none"
          />
          <Input
            placeholder="用户 ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="h-10 bg-muted/5 border-none shadow-none"
          />
          <Input
            placeholder="订单 ID"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="h-10 bg-muted/5 border-none shadow-none"
          />
          <Input
            type="date"
            placeholder="开始日期"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-10 bg-muted/5 border-none shadow-none"
          />
          <Input
            type="date"
            placeholder="结束日期"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-10 bg-muted/5 border-none shadow-none"
          />
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-10 text-foreground/40 hover:text-foreground whitespace-nowrap"
          >
            重置筛选
          </Button>
        )}
      </AdminFilterBar>

      {/* 列表 */}
      <AdminRedemptionList filters={filters} />
    </div>
  )
}
