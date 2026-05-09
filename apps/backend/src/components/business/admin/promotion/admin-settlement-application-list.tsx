'use client'

import * as React from 'react'
import { Loader2, Search, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectGroup, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DataTable } from '@/components/ui/data-table/index'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { AdminSettlementApplication, AdminSettlementApplicationListResponse } from '@/plugins/promotion/contracts/settlement-applications.dto'
import type { PaginationConfig } from '@/components/ui/data-table/pagination'
import { getAdminSettlementApplicationColumns } from './admin-settlement-application-columns'

const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'paid', label: '已打款' },
  { value: 'rejected', label: '已拒绝' },
]

interface AdminSettlementApplicationListProps {
  refreshKey: number
  onRefresh: () => void
}

/**
 * Function: AdminSettlementApplicationList
 *
 * Description: 提现申请审核列表组件，提供筛选、分页和审核功能
 *
 * Parameters:
 * 	refreshKey(number): 外部刷新触发器
 * 	onRefresh(function): 刷新回调
 *
 * Returns:
 * 	JSX.Element: 提现申请列表 UI
 */
export function AdminSettlementApplicationList({ refreshKey, onRefresh }: AdminSettlementApplicationListProps) {
  const [items, setItems] = React.useState<AdminSettlementApplication[]>([])
  const [loading, setLoading] = React.useState(false)
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [keyword, setKeyword] = React.useState('')

  const [nextCursor, setNextCursor] = React.useState<string | null>(null)
  const [prevCursors, setPrevCursors] = React.useState<string[]>([])
  const [pageSize, setPageSize] = React.useState(20)
  const [totalCount, setTotalCount] = React.useState(0)

  const load = React.useCallback(async (cursor: string | null = null) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(pageSize) })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (keyword) params.set('keyword', keyword)
      if (cursor) params.set('cursor', cursor)

      const res = await fetch(`/api/v1/admin/settlement-applications?${params}`, { credentials: 'include' })
      const json = (await res.json()) as ApiResponse<AdminSettlementApplicationListResponse>
      if (json.success) {
        setItems(json.data.items)
        setNextCursor(json.data.nextCursor)
        setTotalCount(json.data.totalCount)
      } else {
        toast.error('加载失败', { description: json.error.message })
      }
    } catch {
      toast.error('加载失败', { description: '网络错误' })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, keyword, pageSize])

  React.useEffect(() => {
    setPrevCursors([])
    setNextCursor(null)
    void load(null)
  }, [load, refreshKey])

  React.useEffect(() => {
    setPrevCursors([])
    setNextCursor(null)
    void load(null)
  }, [keyword, statusFilter, pageSize, load])

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

  // 审核确认对话框状态
  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false)
  const [reviewingItem, setReviewingItem] = React.useState<AdminSettlementApplication | null>(null)
  const [rejectReason, setRejectReason] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  const handleRejectSubmit = async () => {
    if (!reviewingItem) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/v1/admin/settlement-applications/${reviewingItem.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejectionReason: rejectReason,
        }),
        credentials: 'include',
      })
      const json = (await res.json()) as ApiResponse<unknown>
      if (json.success) {
        toast.success('审核成功', { description: '已拒绝该申请' })
        setReviewDialogOpen(false)
        onRefresh()
      } else {
        toast.error('审核失败', { description: json.error.message })
      }
    } catch {
      toast.error('审核失败', { description: '网络错误' })
    } finally {
      setSubmitting(false)
    }
  }

  const review = React.useCallback(async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/v1/admin/settlement-applications/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: status === 'approved' ? 'approve' : 'reject',
        }),
        credentials: 'include',
      })
      const json = (await res.json()) as ApiResponse<unknown>
      if (json.success) {
        toast.success('审核成功')
        onRefresh()
      } else {
        toast.error('审核失败', { description: json.error.message })
      }
    } catch {
      toast.error('审核失败', { description: '网络错误' })
    }
  }, [onRefresh])

  const handleReviewClick = React.useCallback((item: AdminSettlementApplication, status: 'approved' | 'rejected') => {
    if (status === 'approved') {
      void review(item.id, 'approved')
    } else {
      setReviewingItem(item)
      setRejectReason('')
      setReviewDialogOpen(true)
    }
  }, [review])

  const filteredItems = React.useMemo(() => {
    if (statusFilter === 'all') return items
    return items.filter((item) => item.status === statusFilter)
  }, [items, statusFilter])

  const columns = React.useMemo(
    () => getAdminSettlementApplicationColumns({
      onApprove: (item) => handleReviewClick(item, 'approved'),
      onReject: (item) => handleReviewClick(item, 'rejected'),
    }),
    [handleReviewClick]
  )

  const pagination = React.useMemo<PaginationConfig>(
    () => ({
      nextCursor,
      prevCursors,
      isLoading: loading,
      onNextPage: handleNextPage,
      onPrevPage: handlePrevPage,
      onPageSizeChange: (size) => setPageSize(size),
      pageSize,
      totalCount: filteredItems.length,
      totalRecords: totalCount,
    }),
    [nextCursor, prevCursors, loading, handleNextPage, handlePrevPage, pageSize, filteredItems.length, totalCount]
  )

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">提现申请</h2>
              <p className="text-xs text-foreground/50 mt-0.5">审核推广员的提现申请</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/50" />
                <Input
                  type="text"
                  placeholder="搜索推广员ID..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-9 h-9 w-48 bg-background/50"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-9 bg-background/50">
                  <SelectValue placeholder="所有状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {STATUS_OPTIONS.map((opt) => (
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
        </div>
        <DataTable
          columns={columns}
          data={filteredItems}
          pagination={pagination}
        />
      </div>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-destructive" />
              拒绝提现申请
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">请输入拒绝原因</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请详细说明拒绝该申请的原因..."
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>申请人: {reviewingItem?.promoterUserId}</span>
              <span>金额: ¥{Number(reviewingItem?.amount || 0).toFixed(2)}</span>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={!rejectReason.trim() || submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              确认拒绝
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
