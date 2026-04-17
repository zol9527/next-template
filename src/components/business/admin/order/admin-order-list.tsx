'use client'

import * as React from 'react'
import { Loader2, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { DataTable } from '@/components/ui/data-table/index'
import type { PaginationConfig } from '@/components/ui/data-table/pagination'
import { useToast } from '@/components/ui/toast'
import { AdminOrderDetailForm } from './admin-order-detail-form'
import { getOrderColumns } from './admin-order-columns'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { AdminOrder, AdminOrderListResponse } from '@/plugins/ecommerce/contracts/admin-orders.dto'

async function readApiErrorMessage(_res: Response): Promise<string> {
  return '请求失败'
}

interface AdminOrderListProps {
  refreshKey: number
}

/**
Function: AdminOrderList

Description: 后台订单列表组件：支持加载订单列表、游标分页、多条件搜索、订单详情查看、确认完成、退款操作

Parameters:
    refreshKey(number): 外部刷新触发器变化时重新拉取列表

Returns:
    element(React.ReactElement): 订单列表 UI
*/
export function AdminOrderList({ refreshKey }: AdminOrderListProps) {
  const { toast } = useToast()

  const [items, setItems] = React.useState<AdminOrder[]>([])
  const [loading, setLoading] = React.useState(false)

  const [keyword, setKeyword] = React.useState('')
  const [userUsername, setUserUsername] = React.useState('')
  const [userPhone, setUserPhone] = React.useState('')
  const [orderId, setOrderId] = React.useState('')

  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null)

  const [nextCursor, setNextCursor] = React.useState<string | null>(null)
  const [prevCursors, setPrevCursors] = React.useState<string[]>([])
  const [pageSize, setPageSize] = React.useState(20)

  const load = React.useCallback(async (cursor: string | null = null) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(pageSize) })
      if (keyword) params.set('orderNo', keyword)
      if (userUsername) params.set('userUsername', userUsername)
      if (userPhone) params.set('userPhone', userPhone)
      if (orderId) params.set('orderId', orderId)
      if (cursor) params.set('cursor', cursor)

      const res = await fetch(`/api/v1/admin/orders?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) {
        toast({ title: '加载失败', description: await readApiErrorMessage(res), variant: 'destructive' })
        return
      }

      const json = (await res.json()) as ApiResponse<AdminOrderListResponse>
      if (!json.success) {
        toast({ title: '加载失败', description: json.error.message, variant: 'destructive' })
        return
      }

      setItems(json.data.items)
      setNextCursor(json.data.nextCursor)
    } catch {
      toast({ title: '加载失败', description: '网络错误，请稍后再试', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [keyword, userUsername, userPhone, orderId, pageSize, toast])

  React.useEffect(() => {
    setPrevCursors([])
    void load(null)
  }, [load, refreshKey])

  React.useEffect(() => {
    setPrevCursors([])
    void load(null)
  }, [keyword, userUsername, userPhone, orderId, pageSize, load])

  const handleNextPage = React.useCallback(() => {
    if (nextCursor && !loading) {
      setPrevCursors((prev) => [...prev, nextCursor])
      void load(nextCursor)
    }
  }, [nextCursor, loading, load])

  const handlePrevPage = React.useCallback(() => {
    if (prevCursors.length > 0 && !loading) {
      const newPrevCursors = prevCursors.slice(0, -1)
      const prevCursor = newPrevCursors.length > 0 ? newPrevCursors[newPrevCursors.length - 1] : null
      setPrevCursors(newPrevCursors)
      void load(prevCursor)
    }
  }, [prevCursors, loading, load])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  const handleCloseDetail = React.useCallback(() => {
    setSelectedOrderId(null)
  }, [])

  const handlePromoterBindSuccess = React.useCallback(() => {
    void load(prevCursors.length > 0 ? prevCursors[prevCursors.length - 1] : null)
  }, [load, prevCursors])

  const completeOrder = React.useCallback(async (targetOrderId: string) => {
    try {
      const res = await fetch(`/api/v1/admin/orders/${targetOrderId}/complete`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!res.ok) {
        toast({ title: '确认完成失败', description: await readApiErrorMessage(res), variant: 'destructive' })
        return
      }

      const json = (await res.json()) as ApiResponse<unknown>
      if (!json.success) {
        toast({ title: '确认完成失败', description: json.error.message, variant: 'destructive' })
        return
      }

      toast({ title: '操作成功', description: '订单已确认完成', variant: 'default' })
      await load(prevCursors.length > 0 ? prevCursors[prevCursors.length - 1] : null)
    } catch {
      toast({ title: '确认完成失败', description: '网络错误，请稍后再试', variant: 'destructive' })
    }
  }, [load, prevCursors, toast])

  const refundOrder = React.useCallback(async (targetOrderId: string, maxAmount: string, status: string) => {
    if (status === 'completed') {
      if (!window.confirm('警告：该订单已完成，佣金可能正在结算中。退款可能会导致佣金数据异常。是否继续？')) {
        return
      }
    }
    const amount = window.prompt(`请输入退款金额 (最大 ${maxAmount}):`, maxAmount)
    if (amount === null) return

    const reason = window.prompt('请输入退款原因 (可选):') || ''

    try {
      const res = await fetch(`/api/v1/admin/orders/${targetOrderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refundAmount: amount, reason }),
        credentials: 'include',
      })

      if (!res.ok) {
        toast({ title: '退款失败', description: await readApiErrorMessage(res), variant: 'destructive' })
        return
      }

      const json = (await res.json()) as ApiResponse<unknown>
      if (!json.success) {
        toast({ title: '退款失败', description: json.error.message, variant: 'destructive' })
        return
      }

      toast({ title: '操作成功', description: '退款已发起', variant: 'default' })
      await load(prevCursors.length > 0 ? prevCursors[prevCursors.length - 1] : null)
    } catch {
      toast({ title: '退款失败', description: '网络错误，请稍后再试', variant: 'destructive' })
    }
  }, [load, prevCursors, toast])

  const columns = React.useMemo(
    () => getOrderColumns({
      onViewDetail: setSelectedOrderId,
      onCompleteOrder: (id) => void completeOrder(id),
      onRefundOrder: (id, max, status) => void refundOrder(id, max, status),
    }),
    [completeOrder, refundOrder],
  )

  const pagination = React.useMemo<PaginationConfig>(
    () => ({
      nextCursor,
      prevCursors,
      isLoading: loading,
      onNextPage: handleNextPage,
      onPrevPage: handlePrevPage,
      onPageSizeChange: setPageSize,
      pageSize,
      totalCount: items.length,
      totalRecords: items.length,
    }),
    [nextCursor, prevCursors, loading, handleNextPage, handlePrevPage, pageSize, items.length],
  )

  const toolbar = React.useMemo(
    () => (
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="订单号"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-9 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="用户名"
              value={userUsername}
              onChange={(e) => setUserUsername(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="手机号"
              value={userPhone}
              onChange={(e) => setUserPhone(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="订单ID (UUID)"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
      </form>
    ),
    [keyword, userUsername, userPhone, orderId],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">订单列表</h2>
            <p className="text-xs text-foreground/60 mt-0.5">支持分页浏览</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => void load(prevCursors.length > 0 ? prevCursors[prevCursors.length - 1] : null)}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>

        <div className="mt-4">{toolbar}</div>
      </div>

      <div className="flex-1 min-h-0">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-foreground/50">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            加载中...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={items}
            pagination={pagination}
          />
        )}
      </div>

      {selectedOrderId && (
        <AdminOrderDetailForm
          orderId={selectedOrderId}
          onCloseAction={handleCloseDetail}
          onSuccess={handlePromoterBindSuccess}
        />
      )}
    </div>
  )
}
