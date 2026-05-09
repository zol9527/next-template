'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table/index'
import { getRedemptionColumns } from './admin-redemption-columns'
import type { PaginationConfig } from '@/components/ui/data-table/pagination'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { ListRedemptionsResponse } from '@/plugins/ecommerce/contracts/admin-coupons.dto'
import { ListRedemptionsResponseSchema } from '@/plugins/ecommerce/contracts/admin-coupons.dto'

interface AdminRedemptionListProps {
  filters?: {
    couponId?: string
    userId?: string
    orderId?: string
    startDate?: string
    endDate?: string
  }
}

/**
Function: AdminRedemptionList

Description: 管理后台核销记录列表组件：使用 DataTable 实现游标分页，支持多维度筛选。

Parameters:
	filters(object): 筛选条件对象

Returns:
	element(React.ReactElement): 核销记录列表 UI
*/
export function AdminRedemptionList(props: AdminRedemptionListProps) {
  // 服务端分页状态（游标分页）
  const [nextCursor, setNextCursor] = React.useState<string | null>(null)
  const [prevCursors, setPrevCursors] = React.useState<string[]>([])
  const [currentCursor, setCurrentCursor] = React.useState<string | null>(null)
  const [pageSize, setPageSize] = React.useState(20)

  // 序列化 filters 为稳定字符串，用于 queryKey
  const filtersKey = React.useMemo(() => {
    return props.filters ? JSON.stringify(props.filters) : ''
  }, [props.filters])

  // 使用 useQuery 获取核销记录列表
  // 优化：添加 staleTime 和 gcTime 配置，减少不必要的重新请求
  const { data, isLoading } = useQuery<ListRedemptionsResponse>({
    queryKey: ['admin', 'redemptions', { filters: filtersKey, pageSize, cursor: currentCursor }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(pageSize) })
      if (props.filters?.couponId) params.set('couponId', props.filters.couponId)
      if (props.filters?.userId) params.set('userId', props.filters.userId)
      if (props.filters?.orderId) params.set('orderId', props.filters.orderId)
      if (props.filters?.startDate) params.set('startDate', props.filters.startDate)
      if (props.filters?.endDate) params.set('endDate', props.filters.endDate)
      if (currentCursor) params.set('cursor', currentCursor)

      const res = await fetch(`/api/v1/admin/coupons/redemptions?${params.toString()}`, { credentials: 'include' })
      const json = (await res.json()) as ApiResponse<unknown>

      if (!res.ok) {
        throw new Error(json.success === false ? json.error.message : res.statusText)
      }

      if (!json.success) {
        throw new Error(json.error.message)
      }

      const parsed = ListRedemptionsResponseSchema.safeParse(json.data)
      if (!parsed.success) {
        throw new Error('响应数据格式不符合预期')
      }

      return parsed.data
    },
    // 优化：配置缓存策略，减少不必要的重新请求
    staleTime: 30 * 1000, // 30 秒内数据视为新鲜，不重新请求
    gcTime: 5 * 60 * 1000, // 缓存 5 分钟
    placeholderData: (prev) => prev, // 保持旧数据显示，减少闪烁
  })

  // 更新游标状态
  React.useEffect(() => {
    if (data?.nextCursor !== undefined) {
      setNextCursor(data.nextCursor)
    }
  }, [data])

  // 当筛选条件或页面大小时重置分页到第一页
  React.useEffect(() => {
    setPrevCursors([])
    setCurrentCursor(null)
  }, [props.filters, pageSize])

  // 翻页处理函数
  const handleNextPage = React.useCallback(() => {
    if (nextCursor && !isLoading) {
      setPrevCursors((prev) => [...prev, nextCursor])
      setCurrentCursor(nextCursor)
    }
  }, [nextCursor, isLoading])

  const handlePrevPage = React.useCallback(() => {
    if (prevCursors.length > 0 && !isLoading) {
      const newPrevCursors = prevCursors.slice(0, -1)
      const prevCursor = newPrevCursors.length > 0 ? newPrevCursors[newPrevCursors.length - 1] : null
      setPrevCursors(newPrevCursors)
      setCurrentCursor(prevCursor)
    }
  }, [prevCursors, isLoading])

  // 列定义
  const columns = React.useMemo(
    () => getRedemptionColumns(),
    []
  )

  // 服务端分页配置
  const pagination = React.useMemo<PaginationConfig>(
    () => ({
      nextCursor,
      prevCursors,
      isLoading: isLoading, // 仅使用初始加载状态
      onNextPage: handleNextPage,
      onPrevPage: handlePrevPage,
      onPageSizeChange: (size: number) => setPageSize(size),
      pageSize,
      totalCount: data?.redemptions?.length ?? 0,
      totalRecords: data?.redemptions?.length ?? 0,
    }),
    [nextCursor, prevCursors, isLoading, handleNextPage, handlePrevPage, pageSize, data?.redemptions?.length]
  )

  return (
    <div>
      {isLoading && !data ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          加载中...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data?.redemptions ?? []}
          pagination={pagination}
        />
      )}
    </div>
  )
}
