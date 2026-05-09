'use client'

import * as React from 'react'
import { LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminRedemptionList } from '@/components/business/admin/coupon/admin-redemption-list'
import { useDebounce } from '@/hooks/use-debounce'

/**
Function: AdminRedemptionsClient

Description: 核销记录页面的客户端组件

Parameters:

Returns:
	element(React.ReactElement): 核销记录页面
*/
export function AdminRedemptionsClient() {
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

  // 检查是否有筛选条件
  const hasFilters = React.useMemo(() => {
    return !!(couponId || userId || orderId || startDate || endDate)
  }, [couponId, userId, orderId, startDate, endDate])

  // 重置筛选
  const resetFilters = () => {
    setCouponId('')
    setUserId('')
    setOrderId('')
    setStartDate('')
    setEndDate('')
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
          <h1 className="text-3xl font-bold tracking-tight">核销记录</h1>
          <p className="text-sm text-foreground/50 mt-1">查看所有优惠券的核销记录，包括使用用户、订单信息和优惠金额。</p>
        </div>
      </div>

      {/* 搜索与筛选工具栏 */}
      <div className="flex flex-wrap items-center gap-4 bg-muted/10 p-3 border border-border/30">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 flex-1">
          {/* 优惠券 ID 筛选 */}
          <div className="relative">
            <Input
              placeholder="优惠券 ID"
              value={couponId}
              onChange={(e) => setCouponId(e.target.value)}
              className="h-10 bg-muted/5 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          {/* 用户 ID 筛选 */}
          <div className="relative">
            <Input
              placeholder="用户 ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="h-10 bg-muted/5 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          {/* 订单 ID 筛选 */}
          <div className="relative">
            <Input
              placeholder="订单 ID"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="h-10 bg-muted/5 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          {/* 开始日期筛选 */}
          <div className="relative">
            <Input
              type="date"
              placeholder="开始日期"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 bg-muted/5 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          {/* 结束日期筛选 */}
          <div className="relative">
            <Input
              type="date"
              placeholder="结束日期"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 bg-muted/5 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>
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
      </div>

      {/* 列表区域 */}
      <AdminRedemptionList filters={filters} />
    </div>
  )
}
