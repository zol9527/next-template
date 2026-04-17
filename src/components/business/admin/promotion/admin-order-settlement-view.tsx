'use client'

import * as React from 'react'
import { Loader2, Search, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { DataTable } from '@/components/ui/data-table/index'
import { Select, SelectTrigger, SelectValue, SelectGroup, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { AdminOrderSettlementViewListResponse, AdminOrderSettlementViewItem } from '@/plugins/ecommerce/contracts/order-settlement-view.dto'
import { getOrderSettlementColumns } from './admin-order-settlement-columns'
import { AdminSettlementConfirmDialog, type CommissionDetail } from './admin-settlement-confirm-dialog'
import type { PaginationConfig } from '@/components/ui/data-table/pagination'

async function readApiErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as ApiResponse<unknown>
    if (!json.success) return json.error.message
  } catch {
    // ignore
  }
  return res.statusText || '请求失败'
}

// 佣金状态筛选选项
const COMMISSION_STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'frozen', label: '冻结' },
  { value: 'payable', label: '可结算' },
  { value: 'settling', label: '结算中' },
  { value: 'settled', label: '已结算' },
  { value: 'failed', label: '失败' },
  { value: 'voided', label: '已作废' },
]

interface AdminOrderSettlementViewProps {
  refreshKey: number
  onSuccess?: () => void
}

/**
 * Function: AdminOrderSettlementView
 *
 * Description: 结算管理视图组件：订单视图 + 批量结算功能
 *
 * Parameters:
 * 	refreshKey(number): 外部刷新触发器变化时重新拉取列表
 * 	onSuccess(function): 结算成功后回调
 *
 * Returns:
 * 	element(React.ReactElement): 结算管理视图 UI
 */
export function AdminOrderSettlementView({ refreshKey, onSuccess }: AdminOrderSettlementViewProps) {
  const { toast } = useToast()

  // 数据状态
  const [items, setItems] = React.useState<AdminOrderSettlementViewItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [keyword, setKeyword] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [nextCursor, setNextCursor] = React.useState<string | null>(null)
  const [prevCursors, setPrevCursors] = React.useState<string[]>([])
  const [pageSize, setPageSize] = React.useState(20)
  const [totalCount, setTotalCount] = React.useState(0)

  // 批量操作状态
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false)
  const [confirmCommissions, setConfirmCommissions] = React.useState<CommissionDetail[]>([])
  const [confirmCommissionIds, setConfirmCommissionIds] = React.useState<string[]>([])

  // 判断是否可结算
  const canSettle = React.useCallback((item: AdminOrderSettlementViewItem) => {
    return item.commissionStatus === 'payable' && !item.settlementId
  }, [])

  // 加载数据
  const load = React.useCallback(
    async (cursor: string | null = null) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ limit: String(pageSize) })
        if (keyword) params.set('keyword', keyword)
        if (statusFilter !== 'all') params.set('status', statusFilter)
        if (cursor) params.set('cursor', cursor)

        const res = await fetch(`/api/v1/admin/settlements/order-view?${params}`, {
          credentials: 'include',
        })
        if (!res.ok) {
          toast({ title: '加载失败', description: await readApiErrorMessage(res), variant: 'destructive' })
          return
        }

        const json = (await res.json()) as ApiResponse<AdminOrderSettlementViewListResponse>
        if (!json.success) {
          toast({ title: '加载失败', description: json.error.message, variant: 'destructive' })
          return
        }

        setItems(json.data.items)
        setNextCursor(json.data.nextCursor)
        setTotalCount(json.data.totalCount)
      } catch {
        toast({ title: '加载失败', description: '网络错误，请稍后再试', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    },
    [keyword, statusFilter, pageSize, toast]
  )

  // 初始加载和刷新触发
  React.useEffect(() => {
    setPrevCursors([])
    setNextCursor(null)
    setSelectedIds([])
    void load(null)
  }, [load, refreshKey])

  // 搜索/筛选/每页条数变化时重置分页
  React.useEffect(() => {
    setPrevCursors([])
    setNextCursor(null)
    setSelectedIds([])
    void load(null)
  }, [keyword, statusFilter, pageSize, load])

  // 翻页处理
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

  // 单个结算
  const handleSingleSettle = React.useCallback(
    (commissionId: string) => {
      const item = items.find((item) => item.commissionId === commissionId)
      if (!item) return
      setConfirmCommissions([
        {
          id: item.commissionId,
          orderNo: item.orderNo,
          orderId: item.orderId,
          promoterUsername: item.promoterUsername,
          commissionAmount: item.commissionAmount,
        },
      ])
      setConfirmCommissionIds([item.commissionId])
      setConfirmDialogOpen(true)
    },
    [items]
  )

  // 批量结算
  const handleBatchSettle = React.useCallback(() => {
    if (selectedIds.length === 0) return
    const selectedItems = items.filter((item) => selectedIds.includes(item.commissionId) && canSettle(item))
    setConfirmCommissions(
      selectedItems.map((item) => ({
        id: item.commissionId,
        orderNo: item.orderNo,
        orderId: item.orderId,
        promoterUsername: item.promoterUsername,
        commissionAmount: item.commissionAmount,
      }))
    )
    setConfirmCommissionIds(selectedItems.map((item) => item.commissionId))
    setConfirmDialogOpen(true)
  }, [selectedIds, items, canSettle])

  // 结算成功处理
  const handleSettleSuccess = React.useCallback(() => {
    setConfirmDialogOpen(false)
    setConfirmCommissions([])
    setConfirmCommissionIds([])
    setSelectedIds([])
    onSuccess?.()
    // 重新加载数据
    setPrevCursors([])
    setNextCursor(null)
    void load(null)
  }, [onSuccess, load])

  // 列定义
  const columns = React.useMemo(
    () =>
      getOrderSettlementColumns({
        onSettle: handleSingleSettle,
        canSettle,
      }),
    [handleSingleSettle, canSettle]
  )

  // 服务端分页配置
  const pagination = React.useMemo<PaginationConfig>(
    () => ({
      nextCursor,
      prevCursors,
      isLoading: loading,
      onNextPage: handleNextPage,
      onPrevPage: handlePrevPage,
      onPageSizeChange: (size: number) => setPageSize(size),
      pageSize,
      totalCount: items.length,
      totalRecords: totalCount,
    }),
    [nextCursor, prevCursors, loading, handleNextPage, handlePrevPage, pageSize, items.length, totalCount]
  )

  // 选中的可结算佣金数量
  const selectedPayableCount = React.useMemo(() => {
    return items.filter((item) => selectedIds.includes(item.commissionId) && canSettle(item)).length
  }, [items, selectedIds, canSettle])

  // 选中的佣金总金额
  const selectedTotalAmount = React.useMemo(() => {
    return items
      .filter((item) => selectedIds.includes(item.commissionId))
      .reduce((sum, item) => sum + Number(item.commissionAmount), 0)
  }, [items, selectedIds])

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-row items-center justify-between gap-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold">结算管理</h2>
            <p className="text-xs text-foreground/50 mt-0.5">查看佣金记录，执行批量结算</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/50" />
              <Input
                type="text"
                placeholder="搜索订单号或推广员..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9 h-9 w-48 bg-background/50"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
              <SelectTrigger className="w-36 h-9 bg-background/50">
                <SelectValue placeholder="所有状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {COMMISSION_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => void load()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '刷新'}
            </Button>
          </div>
        </div>

        {/* 批量操作提示栏 */}
        {selectedIds.length > 0 && (
          <div className="px-6 py-3 bg-muted/30 border-b">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                已选择 <span className="font-bold">{selectedIds.length}</span> 笔
                {selectedPayableCount > 0 && (
                  <>
                    ，其中可结算 <span className="font-bold text-success">{selectedPayableCount}</span> 笔
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">
                  金额: <span className="font-bold">¥{selectedTotalAmount.toFixed(2)}</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={selectedPayableCount === 0}
                  onClick={handleBatchSettle}
                  className="gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  完成结算
                  {selectedPayableCount > 0 && ` (${selectedPayableCount})`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            加载中...
          </div>
        ) : (
          <DataTable columns={columns} data={items} pagination={pagination} />
        )}
      </div>

      {/* 结算确认对话框 */}
      <AdminSettlementConfirmDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        commissions={confirmCommissions}
        commissionIds={confirmCommissionIds}
        onSuccess={handleSettleSuccess}
      />
    </>
  )
}
