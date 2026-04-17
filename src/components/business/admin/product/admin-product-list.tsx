'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DataTable } from '@/components/ui/data-table/index'
import { TableSkeleton } from '@/components/ui/data-table/table-skeleton'
import { BatchActionBar } from '@/components/ui/data-table/batch-action-bar'
import { getProductColumns } from './admin-product-columns'
import type { PaginationConfig } from '@/components/ui/data-table/pagination'
import { useToast } from '@/components/ui/toast'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { AdminProductListResponse } from '@/plugins/ecommerce/contracts/admin-products.dto'
import { AdminProductListResponseSchema } from '@/plugins/ecommerce/contracts/admin-products.dto'
import type {
  BatchUpdateProductStatusResponse,
  BatchDeleteProductsResponse,
} from '@/plugins/ecommerce/contracts/admin-products.dto'
import { buildBatchOperationToast } from '@/lib/utils/batch-operation-toast'

interface AdminProductListProps {
  onSelect: (productId: string) => void
  onView: (productId: string) => void
  filters?: {
    keyword?: string
    status?: string
    kind?: string
    categoryIds?: string[]
  }
}

/**
Function: AdminProductList

Description: 管理后台商品列表组件：使用 DataTable 实现游标分页，支持搜索、筛选、查看、编辑、上架/下架操作。使用 TanStack Query 管理数据获取和更新。支持批量操作。

Parameters:
	onSelect(function): 选择某个商品进入编辑
	onView(function): 选择某个商品进入查看
	filters(object): 筛选条件对象

Returns:
	element(React.ReactElement): 商品列表 UI
*/
export function AdminProductList(props: AdminProductListProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // 批量选择状态 - 使用 useCallback 避免无限循环
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])

  const handleSelectionChange = React.useCallback((ids: string[]) => {
    setSelectedIds(ids)
  }, [])

  // 服务端分页状态（游标分页）
  const [nextCursor, setNextCursor] = React.useState<string | null>(null)
  const [prevCursors, setPrevCursors] = React.useState<string[]>([])
  const [pageSize, setPageSize] = React.useState(20)

  // 使用 useQuery 获取商品列表
  const { data, isLoading } = useQuery<AdminProductListResponse>({
    queryKey: ['admin', 'products', { filters: props.filters, pageSize, cursor: nextCursor }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(pageSize) })
      if (props.filters?.keyword) params.set('keyword', props.filters.keyword)
      if (props.filters?.status) params.set('status', props.filters.status)
      if (props.filters?.kind) params.set('kind', props.filters.kind)
      if (props.filters?.categoryIds && props.filters.categoryIds.length > 0) {
        props.filters.categoryIds.forEach(id => params.append('categoryIds', id))
      }
      if (nextCursor) params.set('cursor', nextCursor)

      const res = await fetch(`/api/v1/admin/products?${params.toString()}`, { credentials: 'include' })
      const json = (await res.json()) as ApiResponse<unknown>

      if (!res.ok) {
        throw new Error(json.success === false ? json.error.message : res.statusText)
      }

      if (!json.success) {
        throw new Error(json.error.message)
      }

      const parsed = AdminProductListResponseSchema.safeParse(json.data)
      if (!parsed.success) {
        throw new Error('响应数据格式不符合预期')
      }

      return parsed.data
    },
    placeholderData: (prev) => prev,
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
    setNextCursor(null)
  }, [props.filters, pageSize])

  // 翻页处理函数
  const handleNextPage = React.useCallback(() => {
    if (nextCursor && !isLoading) {
      setPrevCursors((prev) => [...prev, nextCursor])
      setNextCursor(null)  // 重置，在 queryFn 中会从响应获取新值
    }
  }, [nextCursor, isLoading])

  const handlePrevPage = React.useCallback(() => {
    if (prevCursors.length > 0 && !isLoading) {
      const newPrevCursors = prevCursors.slice(0, -1)
      const prevCursor = newPrevCursors.length > 0 ? newPrevCursors[newPrevCursors.length - 1] : null
      setPrevCursors(newPrevCursors)
      setNextCursor(prevCursor)
    }
  }, [prevCursors, isLoading])

  // 上架/下架操作 mutation
  const publishMutation = useMutation({
    mutationFn: async (params: { id: string; action: 'publish' | 'unpublish' }) => {
      const res = await fetch(`/api/v1/admin/products/${params.id}/${params.action}`, {
        method: 'POST',
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      toast({
        title: '操作成功',
        description: variables.action === 'publish' ? '商品已上架' : '商品已下架',
        variant: 'default',
      })
    },
    onError: (error, variables) => {
      toast({
        title: variables.action === 'publish' ? '上架失败' : '下架失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  // 批量发布 mutation
  const batchPublishMutation = useMutation({
    mutationFn: async (productIds: string[]): Promise<BatchUpdateProductStatusResponse> => {
      const res = await fetch('/api/v1/admin/products/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productIds, status: 'published' }),
      })

      if (!res.ok) {
        const json = (await res.json()) as ApiResponse<unknown>
        throw new Error(json.success === false ? json.error.message : res.statusText)
      }

      const json = (await res.json()) as ApiResponse<BatchUpdateProductStatusResponse>
      if (!json.success) {
        throw new Error(json.error.message)
      }

      return json.data
    },
    onSuccess: (data: BatchUpdateProductStatusResponse) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      setSelectedIds([])
      const toastParams = buildBatchOperationToast({
        titlePrefix: '批量上架',
        actionLabel: '上架',
        successCount: data.updatedCount,
        failedCount: data.failedIds.length,
      })
      toast(toastParams)
    },
    onError: (error) => {
      toast({
        title: '批量上架失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  // 批量下架 mutation
  const batchUnpublishMutation = useMutation({
    mutationFn: async (productIds: string[]): Promise<BatchUpdateProductStatusResponse> => {
      const res = await fetch('/api/v1/admin/products/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productIds, status: 'unpublished' }),
      })

      if (!res.ok) {
        const json = (await res.json()) as ApiResponse<unknown>
        throw new Error(json.success === false ? json.error.message : res.statusText)
      }

      const json = (await res.json()) as ApiResponse<BatchUpdateProductStatusResponse>
      if (!json.success) {
        throw new Error(json.error.message)
      }

      return json.data
    },
    onSuccess: (data: BatchUpdateProductStatusResponse) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      setSelectedIds([])
      const toastParams = buildBatchOperationToast({
        titlePrefix: '批量下架',
        actionLabel: '下架',
        successCount: data.updatedCount,
        failedCount: data.failedIds.length,
      })
      toast(toastParams)
    },
    onError: (error) => {
      toast({
        title: '批量下架失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  // 批量删除 mutation
  const batchDeleteMutation = useMutation({
    mutationFn: async (productIds: string[]): Promise<BatchDeleteProductsResponse> => {
      const res = await fetch('/api/v1/admin/products/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productIds }),
      })

      if (!res.ok) {
        const json = (await res.json()) as ApiResponse<unknown>
        throw new Error(json.success === false ? json.error.message : res.statusText)
      }

      const json = (await res.json()) as ApiResponse<BatchDeleteProductsResponse>
      if (!json.success) {
        throw new Error(json.error.message)
      }

      return json.data
    },
    onSuccess: (data: BatchDeleteProductsResponse) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      setSelectedIds([])
      const toastParams = buildBatchOperationToast({
        titlePrefix: '批量删除',
        actionLabel: '删除',
        successCount: data.deletedCount,
        failedCount: data.failedIds.length,
      })
      toast(toastParams)
    },
    onError: (error) => {
      toast({
        title: '批量删除失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  // 批量操作处理函数
  const handleBatchPublish = () => {
    if (selectedIds.length === 0) {
      return
    }
    batchPublishMutation.mutate(selectedIds)
  }

  const handleBatchUnpublish = () => {
    if (selectedIds.length === 0) {
      return
    }
    batchUnpublishMutation.mutate(selectedIds)
  }

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) {
      return
    }
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 个商品吗？此操作不可恢复。`)) {
      return
    }
    batchDeleteMutation.mutate(selectedIds)
  }

  const handleClearSelection = () => {
    setSelectedIds([])
  }

  // 列定义
  const columns = React.useMemo(
    () => getProductColumns({
      onSelect: props.onSelect,
      onView: props.onView,
      onPublish: (id) => publishMutation.mutate({ id, action: 'publish' }),
      onUnpublish: (id) => publishMutation.mutate({ id, action: 'unpublish' }),
    }),
    [props.onSelect, props.onView, publishMutation]
  )

  // 服务端分页配置
  const pagination = React.useMemo<PaginationConfig>(
    () => ({
      nextCursor,
      prevCursors,
      isLoading,
      onNextPage: handleNextPage,
      onPrevPage: handlePrevPage,
      onPageSizeChange: (size: number) => setPageSize(size),
      pageSize,
      totalCount: data?.items?.length ?? 0,
      totalRecords: data?.totalCount ?? 0,
    }),
    [nextCursor, prevCursors, isLoading, handleNextPage, handlePrevPage, pageSize, data?.items?.length, data?.totalCount]
  )

  return (
    <div>
      {/* 批量操作栏 */}
      <BatchActionBar
        selectedCount={selectedIds.length}
        onPublish={handleBatchPublish}
        onUnpublish={handleBatchUnpublish}
        onDelete={handleBatchDelete}
        onClearSelection={handleClearSelection}
        isLoading={
          batchPublishMutation.isPending ||
          batchUnpublishMutation.isPending ||
          batchDeleteMutation.isPending
        }
      />

      {/* 表格 */}
      {isLoading && !data ? (
        <TableSkeleton rowCount={10} columnCount={8} />
      ) : (
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          pagination={pagination}
          onSelectionChange={handleSelectionChange}
        />
      )}
    </div>
  )
}
