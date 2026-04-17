'use client'

import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table/index'
import { getCouponColumns } from './admin-coupon-columns'
import type { PaginationConfig } from '@/components/ui/data-table/pagination'
import { useToast } from '@/components/ui/toast'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { Coupon } from '@/plugins/ecommerce/contracts/coupons.dto'

interface AdminCouponListProps {
  coupons?: Coupon[]
  filters?: {
    status?: string
    type?: string
    keyword?: string
  }
  onEdit: (couponId: string) => void
  onDelete: (couponId: string) => void
  onDeleted?: () => void
}

/**
Function: AdminCouponList

Description: 管理后台优惠券列表组件：使用 DataTable 实现游标分页，支持搜索、筛选、编辑、删除操作。使用 TanStack Query 管理数据获取和更新。

Parameters:
	filters(object): 筛选条件对象
	onEdit(function): 选择某个优惠券进入编辑
	onDelete(function): 删除某个优惠券

Returns:
	element(React.ReactElement): 优惠券列表 UI
*/
export function AdminCouponList(props: AdminCouponListProps) {
  const { toast } = useToast()
  const { coupons = [] } = props

  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(20)

  const { paginatedCoupons, totalPages, totalCount } = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginated = coupons.slice(startIndex, endIndex)
    return {
      paginatedCoupons: paginated,
      totalPages: Math.ceil(coupons.length / pageSize),
      totalCount: coupons.length,
    }
  }, [coupons, currentPage, pageSize])

  const data = {
    coupons: paginatedCoupons,
    nextCursor: null,
  }

  const isLoading = false

  const nextPage = React.useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1)
    }
  }, [currentPage, totalPages])

  const prevPage = React.useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1)
    }
  }, [currentPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [props.filters, pageSize])

  // 删除操作 mutation
  const deleteMutation = useMutation({
    mutationFn: async (couponId: string) => {
      const res = await fetch(`/api/v1/admin/coupons/${couponId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        const json = (await res.json()) as ApiResponse<unknown>
        throw new Error(json.success === false ? json.error.message : res.statusText)
      }

      const json = (await res.json()) as ApiResponse<unknown>
      if (!json.success) {
        throw new Error(json.error.message)
      }

      return json.data
    },
    onSuccess: () => {
      props.onDeleted?.()
      toast({
        title: '删除成功',
        description: '优惠券已删除',
        variant: 'default',
      })
    },
    onError: (error) => {
      toast({
        title: '删除失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  // 列定义
  const columns = React.useMemo(
    () => getCouponColumns({
      onEdit: props.onEdit,
      onDelete: (id) => {
        if (confirm('确定要删除这个优惠券吗？此操作不可撤销。')) {
          deleteMutation.mutate(id)
        }
      },
    }),
    [props.onEdit, deleteMutation]
  )

  // 服务端分页配置
  const pagination = React.useMemo<PaginationConfig>(
    () => ({
      nextCursor: null,
      prevCursors: [],
      isLoading,
      onNextPage: nextPage,
      onPrevPage: prevPage,
      onPageSizeChange: (size: number) => setPageSize(size),
      pageSize,
      totalCount,
      totalRecords: totalCount,
    }),
    [isLoading, nextPage, prevPage, pageSize, totalCount]
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
          data={data?.coupons ?? []}
          pagination={pagination}
        />
      )}
    </div>
  )
}
