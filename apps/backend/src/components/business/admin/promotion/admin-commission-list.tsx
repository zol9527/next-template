'use client'

import * as React from 'react'
import { Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectGroup, SelectContent, SelectItem } from '@/components/ui/select'
import { DataTable } from '@/components/ui/data-table/index'
import { getCommissionColumns } from './admin-commission-columns'
import type { PaginationConfig } from '@/components/ui/data-table/pagination'
import { useToast } from '@/components/ui/toast'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { AdminCommissionListResponse, AdminCommissionRecord } from '@/plugins/promotion/contracts/commissions.dto'
import { useDebounce } from '@/hooks/use-debounce'

async function readApiErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as ApiResponse<unknown>
    if (!json.success) return json.error.message
  } catch {
  }
  return res.statusText || '请求失败'
}

const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'frozen', label: '冻结' },
  { value: 'payable', label: '可结算' },
  { value: 'settling', label: '结算中' },
  { value: 'settled', label: '已结算' },
]

interface AdminCommissionListProps {
  refreshKey: number
  onSelectForSettlement?: (commissionIds: string[]) => void
  selectedIds?: string[]
}

/**
 * Function: AdminCommissionList
 *
 * Description: 佣金记录列表组件，提供搜索、筛选、分页功能
 *
 * Parameters:
 * 	refreshKey(number): 外部刷新触发器
 * 	onSelectForSettlement(function): 选择佣金进行结算的回调
 * 	selectedIds(array): 已选中的佣金 ID 列表
 *
 * Returns:
 * 	JSX.Element: 佣金记录列表 UI
 */
export function AdminCommissionList({ refreshKey, onSelectForSettlement, selectedIds = [] }: AdminCommissionListProps) {
  const { toast } = useToast()

  const [items, setItems] = React.useState<AdminCommissionRecord[]>([])
  const [loading, setLoading] = React.useState(false)
  const [keyword, setKeyword] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const prevSelectedIdsRef = React.useRef<string[]>(selectedIds)

  const debouncedKeyword = useDebounce(keyword, 500)

  const [nextCursor, setNextCursor] = React.useState<string | null>(null)
  const [prevCursors, setPrevCursors] = React.useState<string[]>([])
  const [pageSize, setPageSize] = React.useState(20)
  const [totalCount, setTotalCount] = React.useState(0)

  React.useEffect(() => {
    const prevIds = prevSelectedIdsRef.current
    const nextIds = selectedIds
    if (prevIds.length !== nextIds.length || prevIds.some((id, i) => id !== nextIds[i])) {
      prevSelectedIdsRef.current = nextIds
    }
  }, [selectedIds])

  const load = React.useCallback(async (cursor: string | null = null) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(pageSize) })
      if (debouncedKeyword) params.set('keyword', debouncedKeyword)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (cursor) params.set('cursor', cursor)

      const res = await fetch(`/api/v1/admin/commissions?${params}`, { credentials: 'include' })
      if (!res.ok) {
        toast({ title: '加载失败', description: await readApiErrorMessage(res), variant: 'destructive' })
        return
      }

      const json = (await res.json()) as ApiResponse<AdminCommissionListResponse>
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
  }, [debouncedKeyword, statusFilter, pageSize, toast])

  React.useEffect(() => {
    setPrevCursors([])
    setNextCursor(null)
    void load(null)
  }, [load, refreshKey])

  React.useEffect(() => {
    setPrevCursors([])
    setNextCursor(null)
    void load(null)
  }, [debouncedKeyword, statusFilter, pageSize, load])

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

  const canSelect = React.useCallback((item: AdminCommissionRecord) => {
    return item.status === 'payable' && !item.settlementId
  }, [])

  const handleSelectionChange = React.useCallback((selectedIds: string[]) => {
    onSelectForSettlement?.(selectedIds)
  }, [onSelectForSettlement])

  const columns = React.useMemo(
    () => getCommissionColumns({
      onSelectForSettlement: handleSelectionChange,
      canSelect,
    }),
    [handleSelectionChange, canSelect]
  )

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold">佣金记录</h2>
          <p className="text-xs text-foreground/50 mt-0.5">查看所有佣金记录</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/50" />
            <Input
              type="text"
              placeholder="搜索推广员或订单号..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pl-9 h-9 w-48 bg-background-50"
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
      <DataTable
        columns={columns}
        data={items}
        pagination={pagination}
      />
    </div>
  )
}
