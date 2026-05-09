'use client'

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getArticleColumns } from './admin-blog-article-columns'
import { BatchActionBar } from '@/components/ui/data-table/batch-action-bar'
import { DataTable } from '@/components/ui/data-table/index'
import type { PaginationConfig } from '@/components/ui/data-table/pagination'
import { TableSkeleton } from '@/components/ui/data-table/table-skeleton'
import { useToast } from '@/components/ui/toast'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type {
  AdminArticleListResponse,
  AdminBatchUpdateArticleStatusResponse,
  BatchDeleteArticlesResponse,
} from '@/contracts/dtos/admin/blog/articles.dto'
import {
  AdminArticleListResponseSchema,
  AdminBatchUpdateArticleStatusResponseSchema,
  BatchDeleteArticlesResponseSchema,
} from '@/contracts/dtos/admin/blog/articles.dto'
import { buildBatchOperationToast } from '@/lib/utils/batch-operation-toast'

interface AdminBlogArticleListProps {
  onSelect: (articleId: string) => void
  onView: (articleId: string) => void
  filters?: {
    keyword?: string
    status?: string
    categoryId?: string
  }
}

/**
 * Function: parseApiResponse
 *
 * Description: 解析统一 API 响应并使用 Zod 校验 data 字段
 *
 * Parameters:
 *   response(Response): fetch 返回对象
 *   schema(z.ZodType<T>): 用于校验响应数据的 schema
 *
 * Returns:
 *   data(T): 校验通过后的响应数据
 */
async function parseApiResponse<T>(
  response: Response,
  schema?: { safeParse: (input: unknown) => { success: true; data: T } | { success: false } }
) {
  const json = (await response.json()) as ApiResponse<unknown>

  if (!response.ok) {
    throw new Error(json.success === false ? json.error.message : response.statusText)
  }

  if (!json.success) {
    throw new Error(json.error.message)
  }

  if (!schema) {
    return json.data as T
  }

  const parsed = schema.safeParse(json.data)
  if (!parsed.success) {
    throw new Error('响应数据格式不符合预期')
  }

  return parsed.data
}

/**
 * Function: AdminBlogArticleList
 *
 * Description: 管理后台博客文章列表组件，支持游标分页、查看、编辑、发布、下线、归档与批量操作
 *
 * Parameters:
 *   onSelect(function): 选择某篇文章进入编辑
 *   onView(function): 选择某篇文章进入查看
 *   filters(object): 列表筛选条件
 *
 * Returns:
 *   element(React.ReactElement): 文章列表 UI
 */
export function AdminBlogArticleList(props: AdminBlogArticleListProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [currentCursor, setCurrentCursor] = React.useState<string | null>(null)
  const [nextCursor, setNextCursor] = React.useState<string | null>(null)
  const [prevCursors, setPrevCursors] = React.useState<string[]>([])
  const [pageSize, setPageSize] = React.useState(20)

  const handleSelectionChange = React.useCallback((ids: string[]) => {
    setSelectedIds(ids)
  }, [])

  const { data, isLoading } = useQuery<AdminArticleListResponse>({
    queryKey: ['admin', 'blog-articles', { filters: props.filters, pageSize, cursor: currentCursor }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(pageSize) })

      if (props.filters?.keyword) {
        params.set('keyword', props.filters.keyword)
      }
      if (props.filters?.status) {
        params.set('status', props.filters.status)
      }
      if (props.filters?.categoryId) {
        params.set('categoryId', props.filters.categoryId)
      }
      if (currentCursor) {
        params.set('cursor', currentCursor)
      }

      const response = await fetch(`/api/v1/admin/blog/articles?${params.toString()}`, {
        credentials: 'include',
      })

      return parseApiResponse(response, AdminArticleListResponseSchema)
    },
    placeholderData: (previousData) => previousData,
  })

  React.useEffect(() => {
    setNextCursor(data?.nextCursor ?? null)
  }, [data?.nextCursor])

  React.useEffect(() => {
    setSelectedIds([])
    setCurrentCursor(null)
    setNextCursor(null)
    setPrevCursors([])
  }, [props.filters, pageSize])

  const handleNextPage = React.useCallback(() => {
    if (!nextCursor || isLoading) {
      return
    }

    setPrevCursors((previous) => [...previous, currentCursor ?? ''])
    setCurrentCursor(nextCursor)
  }, [currentCursor, isLoading, nextCursor])

  const handlePrevPage = React.useCallback(() => {
    if (prevCursors.length === 0 || isLoading) {
      return
    }

    const previousCursor = prevCursors[prevCursors.length - 1]
    setPrevCursors((previous) => previous.slice(0, -1))
    setCurrentCursor(previousCursor || null)
  }, [isLoading, prevCursors])

  const publishMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const response = await fetch(`/api/v1/admin/blog/articles/${articleId}/publish`, {
        method: 'POST',
        credentials: 'include',
      })

      return parseApiResponse(response)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-articles'] })
      toast({
        title: '操作成功',
        description: '文章已发布',
        variant: 'default',
      })
    },
    onError: (error) => {
      toast({
        title: '发布失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  const unpublishMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const response = await fetch(`/api/v1/admin/blog/articles/${articleId}/unpublish`, {
        method: 'POST',
        credentials: 'include',
      })

      return parseApiResponse(response)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-articles'] })
      toast({
        title: '操作成功',
        description: '文章已下线',
        variant: 'default',
      })
    },
    onError: (error) => {
      toast({
        title: '下线失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  const batchStatusMutation = useMutation({
    mutationFn: async (params: { articleIds: string[]; status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED' }): Promise<AdminBatchUpdateArticleStatusResponse> => {
      const response = await fetch('/api/v1/admin/blog/articles/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      })

      return parseApiResponse(response, AdminBatchUpdateArticleStatusResponseSchema)
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-articles'] })

      if (variables.articleIds.length > 1) {
        setSelectedIds([])
        const actionLabelMap = {
          PUBLISHED: { titlePrefix: '批量发布', actionLabel: '发布' },
          DRAFT: { titlePrefix: '批量下线', actionLabel: '下线' },
          ARCHIVED: { titlePrefix: '批量归档', actionLabel: '归档' },
        } satisfies Record<'PUBLISHED' | 'DRAFT' | 'ARCHIVED', { titlePrefix: string; actionLabel: string }>

        const actionMeta = actionLabelMap[variables.status]
        toast(buildBatchOperationToast({
          titlePrefix: actionMeta.titlePrefix,
          actionLabel: actionMeta.actionLabel,
          successCount: result.updatedCount,
          failedCount: result.failedIds.length,
        }))
        return
      }

      const singleActionMap = {
        PUBLISHED: '文章已发布',
        DRAFT: '文章已下线',
        ARCHIVED: '文章已归档',
      } satisfies Record<'PUBLISHED' | 'DRAFT' | 'ARCHIVED', string>

      toast({
        title: '操作成功',
        description: singleActionMap[variables.status],
        variant: 'default',
      })
    },
    onError: (error, variables) => {
      const errorTitleMap = {
        PUBLISHED: variables.articleIds.length > 1 ? '批量发布失败' : '发布失败',
        DRAFT: variables.articleIds.length > 1 ? '批量下线失败' : '下线失败',
        ARCHIVED: variables.articleIds.length > 1 ? '批量归档失败' : '归档失败',
      } satisfies Record<'PUBLISHED' | 'DRAFT' | 'ARCHIVED', string>

      toast({
        title: errorTitleMap[variables.status],
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  const batchDeleteMutation = useMutation({
    mutationFn: async (articleIds: string[]): Promise<BatchDeleteArticlesResponse> => {
      const response = await fetch('/api/v1/admin/blog/articles/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ articleIds }),
      })

      return parseApiResponse(response, BatchDeleteArticlesResponseSchema)
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-articles'] })
      setSelectedIds([])
      toast(buildBatchOperationToast({
        titlePrefix: '批量删除',
        actionLabel: '删除',
        successCount: result.deletedCount,
        failedCount: result.failedIds.length,
      }))
    },
    onError: (error) => {
      toast({
        title: '批量删除失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  const handleBatchPublish = React.useCallback(() => {
    if (selectedIds.length === 0) {
      return
    }

    batchStatusMutation.mutate({ articleIds: selectedIds, status: 'PUBLISHED' })
  }, [batchStatusMutation, selectedIds])

  const handleBatchUnpublish = React.useCallback(() => {
    if (selectedIds.length === 0) {
      return
    }

    batchStatusMutation.mutate({ articleIds: selectedIds, status: 'DRAFT' })
  }, [batchStatusMutation, selectedIds])

  const handleBatchDelete = React.useCallback(() => {
    if (selectedIds.length === 0) {
      return
    }

    if (!confirm(`确定要删除选中的 ${selectedIds.length} 篇文章吗？此操作不可恢复。`)) {
      return
    }

    batchDeleteMutation.mutate(selectedIds)
  }, [batchDeleteMutation, selectedIds])

  const handleClearSelection = React.useCallback(() => {
    setSelectedIds([])
  }, [])

  const columns = React.useMemo(
    () => getArticleColumns({
      onSelect: props.onSelect,
      onView: props.onView,
      onPublish: (id) => publishMutation.mutate(id),
      onUnpublish: (id) => unpublishMutation.mutate(id),
      onArchive: (id) => batchStatusMutation.mutate({ articleIds: [id], status: 'ARCHIVED' }),
    }),
    [batchStatusMutation, props.onSelect, props.onView, publishMutation, unpublishMutation]
  )

  const pagination = React.useMemo<PaginationConfig>(
    () => ({
      nextCursor,
      prevCursors,
      isLoading,
      onNextPage: handleNextPage,
      onPrevPage: handlePrevPage,
      onPageSizeChange: (size: number) => setPageSize(size),
      pageSize,
      totalCount: data?.items.length ?? 0,
      totalRecords: data?.totalCount ?? 0,
    }),
    [data?.items.length, data?.totalCount, handleNextPage, handlePrevPage, isLoading, nextCursor, pageSize, prevCursors]
  )

  return (
    <div>
      <BatchActionBar
        selectedCount={selectedIds.length}
        onPublish={handleBatchPublish}
        onUnpublish={handleBatchUnpublish}
        onDelete={handleBatchDelete}
        onClearSelection={handleClearSelection}
        isLoading={
          publishMutation.isPending ||
          unpublishMutation.isPending ||
          batchStatusMutation.isPending ||
          batchDeleteMutation.isPending
        }
      />

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
