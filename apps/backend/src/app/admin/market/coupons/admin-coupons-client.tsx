'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Gift, Tag, CheckCircle, Ticket, ClipboardList } from 'lucide-react'
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
import { ListCouponsResponseSchema } from '@/plugins/ecommerce/contracts/admin-coupons.dto'
import { cn } from '@/lib/utils'
import { ShopMainCard, ShopTabBar } from '@/components/business/admin/shop/shop-main-card'
import { AdminPageHeader } from '@/components/ui/admin-page-header'
import { ShopSearchInput } from '@/components/business/admin/shop/shop-search-input'
import { ShopKPICards, type KPICard } from '@/components/business/admin/shop/shop-kpi-cards'
import { ShopStatusFilter, type FilterItem } from '@/components/business/admin/shop/shop-status-filter'

/**
 * Function: AdminCouponsClient
 *
 * Description: 优惠券管理页面，使用 ShopMainCard 统一容器
 *
 * 设计规范:
 *   - TabBar 右侧: 搜索框 (220px) + 「创建优惠券」按钮
 *   - 内容区:
 *     1. KPI 卡片行(4个): 优惠券总数、进行中、已过期、总使用次数
 *     2. 内容区 Tab 切换: 列表 / 核销记录
 *     3. 列表 Tab: 筛选行 + 优惠券列表
 *     4. 核销记录 Tab: RedemptionTabContent
 */
export function AdminCouponsClient() {
  const queryClient = useQueryClient()

  // 弹窗状态
  const [activeCouponId, setActiveCouponId] = React.useState<string | null>(null)
  const [formMode, setFormMode] = React.useState<'idle' | 'create' | 'edit' | 'view'>('idle')
  const [issueMode, setIssueMode] = React.useState<'idle' | 'issue'>('idle')
  const [issueCouponName, setIssueCouponName] = React.useState<string>('')

  // 内容区 Tab 切换: list | redemptions
  const [activeTab, setActiveTab] = React.useState<'list' | 'redemptions'>('list')

  // 筛选状态
  const [keyword, setKeyword] = React.useState('')
  const [status, setStatus] = React.useState<string>('all')
  const [couponType, setCouponType] = React.useState<string>('all')

  // Select 打开状态
  const [typeSelectOpen, setTypeSelectOpen] = React.useState(false)
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
    if (!filters.keyword && !filters.status && !filters.type) return coupons
    return coupons.filter(coupon => {
      if (filters.keyword && !coupon.name.includes(filters.keyword)) return false
      if (filters.status && coupon.status !== filters.status) return false
      if (filters.type && coupon.type !== filters.type) return false
      return true
    })
  }, [coupons, filters])

  // 统计数据（从已加载的 coupons 列表计算，非硬编码）
  const stats = React.useMemo(() => {
    const total = coupons.length
    const active = coupons.filter(c => c.status === 'active').length
    const expired = coupons.filter(c => c.status === 'expired').length
    const totalUsed = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0)
    return { total, active, expired, totalUsed }
  }, [coupons])

  function refreshList() {
    queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] })
  }

  const handleIssueClick = (coupon: Coupon) => {
    setActiveCouponId(coupon.id)
    setIssueCouponName(coupon.name)
    setIssueMode('issue')
  }

  // KPI 卡片数据
  const kpiCards: KPICard[] = [
    { label: '优惠券总数', value: stats.total, icon: <Ticket className="h-4 w-4" />, iconBg: 'bg-ds-accent-subtle', iconColor: 'text-primary' },
    { label: '进行中', value: stats.active, icon: <CheckCircle className="h-4 w-4" />, iconBg: 'bg-teal-subtle', iconColor: 'text-teal' },
    { label: '已过期', value: stats.expired, icon: <Tag className="h-4 w-4" />, iconBg: 'bg-rose-subtle', iconColor: 'text-rose' },
    { label: '总使用次数', value: stats.totalUsed.toLocaleString(), icon: <Gift className="h-4 w-4" />, iconBg: 'bg-gold-subtle', iconColor: 'text-gold' },
  ]

  // 状态筛选项
  const statusFilters: FilterItem[] = [
    { label: '全部', count: stats.total, value: 'all' },
    { label: '进行中', count: stats.active, value: 'active', color: 'success' },
    { label: '已过期', count: stats.expired, value: 'expired', color: 'rose' },
    { label: '已暂停', count: coupons.filter(c => c.status === 'paused').length, value: 'paused', color: 'warning' },
  ]

  return (
    <>
      <AdminPageHeader
        title="商城管理"
        tabs={<ShopTabBar activeTab="coupons" />}
        actions={
          <>
            <ShopSearchInput value={keyword} onChange={setKeyword} placeholder="搜索优惠券名称..." />
            <Button
              type="button"
              className="gap-2 shadow-lg shadow-primary/20"
              onClick={() => { setActiveCouponId(null); setFormMode('create') }}
              aria-label="创建新优惠券"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              创建优惠券
            </Button>
          </>
        }
      />
      <ShopMainCard>
      {/* KPI 卡片行 */}
      <ShopKPICards cards={kpiCards} className="mb-6" />

      {/* 内容区 Tab 切换：列表 / 核销记录 */}
      <div className="flex items-center gap-1 mb-4">
        <button
          className={cn(
            'px-3 py-1.5 rounded-lg text-pill motion-safe:transition-colors',
            activeTab === 'list'
              ? 'bg-primary text-primary-foreground'
              : 'bg-surface border border-border-default text-fg-secondary hover:border-border-medium'
          )}
          onClick={() => setActiveTab('list')}
        >
          <Tag className="h-3.5 w-3.5 inline mr-1.5" aria-hidden="true" />
          优惠券列表
        </button>
        <button
          className={cn(
            'px-3 py-1.5 rounded-lg text-pill motion-safe:transition-colors',
            activeTab === 'redemptions'
              ? 'bg-primary text-primary-foreground'
              : 'bg-surface border border-border-default text-fg-secondary hover:border-border-medium'
          )}
          onClick={() => setActiveTab('redemptions')}
        >
          <ClipboardList className="h-3.5 w-3.5 inline mr-1.5" aria-hidden="true" />
          核销记录
        </button>
      </div>

      {/* Tab: 优惠券列表 */}
      {activeTab === 'list' && (
        <>
          {/* 筛选行 */}
          <div className="flex items-center justify-between mb-4">
            <ShopStatusFilter filters={statusFilters} activeFilter={status} onFilterChange={setStatus} />
            <div className="flex items-center gap-2">
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
                <SelectTrigger className="w-[130px] h-8 bg-surface border border-border-default rounded-lg text-body-sm text-fg-secondary hover:border-border-medium focus-visible:ring-1 focus-visible:ring-primary/30">
                  <SelectValue placeholder="所有类型" />
                </SelectTrigger>
                <SelectContent className="bg-surface border border-border-default rounded-lg shadow-lg">
                  <SelectGroup>
                    <SelectLabel className="text-caption text-fg-muted">类型</SelectLabel>
                    <Separator className="my-1" />
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
                  variant="ghost" size="sm"
                  onClick={() => { setKeyword(''); setStatus('all'); setCouponType('all') }}
                  className="h-8 text-fg-muted hover:text-fg hover:bg-surface-alt whitespace-nowrap"
                >
                  重置
                </Button>
              )}
            </div>
          </div>

          <section aria-label="优惠券列表">
            <AdminCouponList
              coupons={filteredCoupons}
              onEdit={(couponId) => { setActiveCouponId(couponId); setFormMode('edit') }}
              onDelete={() => {}}
              onDeleted={() => { queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] }) }}
            />
          </section>
        </>
      )}

      {/* Tab: 核销记录 */}
      {activeTab === 'redemptions' && <RedemptionTabContent />}

      {/* 发放弹窗 */}
      {issueMode === 'issue' && (
        <AdminCouponIssueForm
          couponId={activeCouponId!}
          couponName={issueCouponName}
          onSaved={() => { refreshList(); setIssueMode('idle'); setActiveCouponId(null); setIssueCouponName('') }}
          onCancel={() => { setIssueMode('idle'); setActiveCouponId(null); setIssueCouponName('') }}
        />
      )}

      {/* 表单弹窗 */}
      {formMode !== 'idle' && (
        <AdminCouponForm
          couponId={activeCouponId}
          mode={formMode}
          onSaved={() => { refreshList(); setFormMode('idle'); setActiveCouponId(null) }}
          onCancel={() => { setFormMode('idle'); setActiveCouponId(null) }}
        />
      )}
    </ShopMainCard>
    </>
  )
}

/** 核销记录组件 */
function RedemptionTabContent() {
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

  return (
    <div className="space-y-6">
      <AdminFilterBar>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
          <Input placeholder="优惠券 ID" value={couponId} onChange={(e) => setCouponId(e.target.value)} className="h-10 bg-muted/5 border-none shadow-none" />
          <Input placeholder="用户 ID" value={userId} onChange={(e) => setUserId(e.target.value)} className="h-10 bg-muted/5 border-none shadow-none" />
          <Input placeholder="订单 ID" value={orderId} onChange={(e) => setOrderId(e.target.value)} className="h-10 bg-muted/5 border-none shadow-none" />
          <Input type="date" placeholder="开始日期" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 bg-muted/5 border-none shadow-none" />
          <Input type="date" placeholder="结束日期" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-10 bg-muted/5 border-none shadow-none" />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setCouponId(''); setUserId(''); setOrderId(''); setStartDate(''); setEndDate('') }} className="h-10 text-fg-muted hover:text-fg whitespace-nowrap">
            重置筛选
          </Button>
        )}
      </AdminFilterBar>
      <AdminRedemptionList filters={filters} />
    </div>
  )
}
