'use client'

import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Loader2, RefreshCw, Hash, DollarSign, Calendar, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table/index'
import type { PaginationConfig } from '@/components/ui/data-table/pagination'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils/date'
import { CopyCell } from '@/components/business/admin/shared/copy-cell'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { AdminSettlement, AdminSettlementListResponse } from '@/plugins/promotion/contracts/settlements.dto'

async function readApiErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as ApiResponse<unknown>
    if (!json.success) return json.error.message
  } catch {
    // ignore
  }
  return res.statusText || '请求失败'
}

function getSettlementStatusBadge(status: string) {
  const config: Record<string, { label: string; status: 'pending' | 'settled' | 'failed' }> = {
    pending: { label: '处理中', status: 'pending' },
    processed: { label: '已结算', status: 'settled' },
    failed: { label: '失败', status: 'failed' },
  }
  const item = config[status] || { label: status, status: 'pending' as const }
  return <Badge status={item.status}>{item.label}</Badge>
}

interface AdminSettlementListProps {
  refreshKey: number
  filters: {
    status?: string | null
    settlementId?: string | null
  }
  onViewDetail?: (settlementId: string) => void
}

/**
 * Function: AdminSettlementList
 *
 * Description: 后台结算列表组件：支持筛选、搜索、游标分页
 *
 * Parameters:
 *     refreshKey(number): 外部刷新触发器变化时重新拉取列表
 *     filters(SettlementFilters): 筛选条件（状态、结算ID）
 *     onViewDetail(function): 查看详情回调函数
 *
 * Returns:
 *     element(React.ReactElement): 结算列表 UI
 */
export function AdminSettlementList(props: AdminSettlementListProps) {
  const { toast } = useToast()

  const [items, setItems] = React.useState<AdminSettlement[]>([])
  const [loading, setLoading] = React.useState(false)
  const [nextCursor, setNextCursor] = React.useState<string | null>(null)
  const [prevCursors, setPrevCursors] = React.useState<string[]>([])
  const [totalCount, setTotalCount] = React.useState(0)
  const [pageSize] = React.useState(20)

  const load = React.useCallback(
    async (cursor: string | null = null, isLoadMore: boolean = false) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ limit: '20' })
        if (props.filters.status) params.set('status', props.filters.status)
        if (props.filters.settlementId) params.set('settlementId', props.filters.settlementId)
        if (cursor) params.set('cursor', cursor)

        const res = await fetch(`/api/v1/admin/settlements?${params}`, { credentials: 'include' })
        if (!res.ok) {
          toast({ title: '加载失败', description: await readApiErrorMessage(res), variant: 'destructive' })
          return
        }

        const json = (await res.json()) as ApiResponse<AdminSettlementListResponse>
        if (!json.success) {
          toast({ title: '加载失败', description: json.error.message, variant: 'destructive' })
          return
        }

        const newItems = json.data.items
        if (isLoadMore) {
          setItems((prev) => [...prev, ...newItems])
        } else {
          setItems(newItems)
        }
        setNextCursor(json.data.nextCursor)
        setTotalCount((prev) => (isLoadMore ? prev + newItems.length : newItems.length))
      } catch {
        toast({ title: '加载失败', description: '网络错误，请稍后再试', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    },
    [props.filters, toast],
  )

  React.useEffect(() => {
    setPrevCursors([])
    void load(null, false)
  }, [load, props.refreshKey])

  const handleNextPage = React.useCallback(() => {
    if (nextCursor && !loading) {
      setPrevCursors((prev) => [...prev, nextCursor])
      void load(nextCursor, true)
    }
  }, [nextCursor, loading, load])

  const handlePrevPage = React.useCallback(() => {
    if (prevCursors.length > 0 && !loading) {
      const newPrev = prevCursors.slice(0, -1)
      setPrevCursors(newPrev)
      const prevCursor = newPrev.length > 0 ? newPrev[newPrev.length - 1] : null
      void load(prevCursor, false)
    }
  }, [prevCursors, loading, load])

  const handleRefresh = React.useCallback(() => {
    setPrevCursors([])
    void load(null, false)
  }, [load])

  // 列定义
  const columns = React.useMemo<ColumnDef<AdminSettlement>[]>(
    () => [
      {
        id: 'id',
        header: () => (
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            结算 ID
          </div>
        ),
        size: 256,
        cell: ({ row }) => <CopyCell value={row.original.id} label="结算 ID" />,
      },
      {
        id: 'amount',
        header: () => (
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            金额
          </div>
        ),
        size: 128,
        cell: ({ row }) => (
          <div>
            <div className="font-mono font-semibold text-success">
              ¥{Number(row.original.totalAmount).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">{row.original.currencyCode}</div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: '状态',
        size: 112,
        cell: ({ row }) => getSettlementStatusBadge(row.original.status),
      },
      {
        id: 'createdBy',
        header: '创建人',
        size: 192,
        cell: ({ row }) => <CopyCell value={row.original.createdBy} label="创建人 ID" />,
      },
      {
        id: 'createdAt',
        header: () => (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            创建时间
          </div>
        ),
        size: 160,
        cell: ({ row }) => <span className="text-sm">{formatDateTime(row.original.createdAt)}</span>,
      },
      {
        id: 'processedAt',
        header: () => (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            处理时间
          </div>
        ),
        size: 160,
        cell: ({ row }) => (
          <span className="text-sm">{row.original.processedAt ? formatDateTime(row.original.processedAt) : '-'}</span>
        ),
      },
      {
        id: 'actions',
        header: () => null,
        size: 96,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => props.onViewDetail?.(row.original.id)}
              className="h-8 w-8 p-0"
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [props.onViewDetail],
  )

  // 分页配置
  const pagination = React.useMemo<PaginationConfig>(
    () => ({
      nextCursor,
      prevCursors,
      isLoading: loading,
      onNextPage: handleNextPage,
      onPrevPage: handlePrevPage,
      onPageSizeChange: () => {},
      pageSize,
      totalCount: items.length,
      totalRecords: totalCount,
    }),
    [nextCursor, prevCursors, loading, handleNextPage, handlePrevPage, pageSize, items.length, totalCount],
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 flex-shrink-0">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            结算记录
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">管理所有结算记录</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={handleRefresh}
          className="gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          {loading ? '刷新中…' : '刷新'}
        </Button>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          加载中...
        </div>
      ) : (
        <DataTable columns={columns} data={items} pagination={pagination} />
      )}
    </div>
  )
}
