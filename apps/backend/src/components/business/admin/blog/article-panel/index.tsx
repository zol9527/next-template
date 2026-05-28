'use client'

/**
 * File: index.tsx
 * Description: 文章面板主组件，整合状态筛选标签组 + 数据表格 + 批量操作
 * 替代旧版 AdminBlogArticleList 和 AdminBlogArticleColumns，适配新的双栏布局面板
 *
 * 功能：
 *   - 状态筛选标签组（全部 / 已发布 / 草稿 / 已归档），内部管理状态并与外部 filters 合并
 *   - 游标分页的数据表格
 *   - 批量操作（批量发布、批量下线、批量删除）
 *   - 文章详情抽屉（查看、编辑、发布/下线、归档）
 */

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Eye, FileText, Pencil, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BatchActionBar } from '@/components/ui/data-table/batch-action-bar'
import { DataTable } from '@/components/ui/data-table/index'
import type { PaginationConfig } from '@/components/ui/data-table/pagination'
import { TableSkeleton } from '@/components/ui/data-table/table-skeleton'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { buildBatchOperationToast } from '@/lib/utils/batch-operation-toast'
import type { AdminArticle } from '@/contracts/dtos/admin/blog/articles.dto'
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
import type { BlogStats } from '../blog-main-layout'
import { parseApiResponse } from '@/lib/api/parse-response'
import { getArticleColumns } from './article-columns'
import { ArticleDetailDrawer } from './article-detail-drawer'

// ============================================
// 类型定义（Type Definitions）
// ============================================

/** 文章面板组件 props */
interface ArticlePanelProps {
  /** 文章状态统计（用于筛选栏中的状态药丸） */
  stats?: BlogStats
  /** 外部筛选条件（关键字、状态、分类 ID） */
  filters: {
    keyword?: string
    status?: string
    categoryId?: string
  }
  /** 查看文章详情回调（由父组件处理导航或其他逻辑） */
  onView: (articleId: string) => void
  /** 编辑文章回调（由父组件处理跳转到编辑页） */
  onEdit: (articleId: string) => void
}

/** 状态筛选选项 */
type StatusFilter = 'all' | 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'

/** 状态筛选配置 */
const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: '全部', icon: <FileText className="h-3.5 w-3.5" /> },
  { value: 'PUBLISHED', label: '已发布', icon: <Send className="h-3.5 w-3.5" /> },
  { value: 'DRAFT', label: '草稿', icon: <Pencil className="h-3.5 w-3.5" /> },
  { value: 'ARCHIVED', label: '已归档', icon: <Archive className="h-3.5 w-3.5" /> },
]

// ============================================
// 组件实现（Component Implementation）
// ============================================

/**
 * Function: ArticlePanel
 *
 * Description: 文章管理面板主组件，包含：
 *   1. 状态筛选标签组（全部/已发布/草稿/已归档）
 *   2. 数据表格（带分页）
 *   3. 批量操作栏（发布/下线/删除）
 *   4. 文章详情抽屉
 *
 * Parameters:
 *   filters(object): 外部筛选条件
 *   onView(function): 查看文章回调
 *   onEdit(function): 编辑文章回调
 *
 * Returns:
 *   element(React.ReactElement): 文章面板 UI
 */
export function ArticlePanel(props: ArticlePanelProps) {
  const { stats, filters: externalFilters, onView, onEdit } = props
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // ------------------------------------------
  // 内部状态：状态筛选、分页游标、选择
  // ------------------------------------------
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [currentCursor, setCurrentCursor] = React.useState<string | null>(null)
  const [nextCursor, setNextCursor] = React.useState<string | null>(null)
  const [prevCursors, setPrevCursors] = React.useState<string[]>([])
  const [pageSize, setPageSize] = React.useState(20)

  // 详情抽屉状态
  const [drawerArticleId, setDrawerArticleId] = React.useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  // ------------------------------------------
  // 合并筛选条件：内部状态筛选优先于外部 status
  // ------------------------------------------
  const combinedFilters = React.useMemo(() => ({
    ...externalFilters,
    status: statusFilter === 'all' ? externalFilters?.status : statusFilter,
  }), [externalFilters, statusFilter])

  // ------------------------------------------
  // 数据获取：文章列表（游标分页）
  // ------------------------------------------
  const { data, isLoading } = useQuery<AdminArticleListResponse>({
    queryKey: ['admin', 'blog-articles', { filters: combinedFilters, pageSize, cursor: currentCursor }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(pageSize) })

      if (combinedFilters.keyword) {
        params.set('keyword', combinedFilters.keyword)
      }
      if (combinedFilters.status) {
        params.set('status', combinedFilters.status)
      }
      if (combinedFilters.categoryId) {
        params.set('categoryId', combinedFilters.categoryId)
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

  // 更新下一页游标
  React.useEffect(() => {
    setNextCursor(data?.nextCursor ?? null)
  }, [data?.nextCursor])

  // 筛选条件或每页条数变化时重置分页状态
  React.useEffect(() => {
    setSelectedIds([])
    setCurrentCursor(null)
    setNextCursor(null)
    setPrevCursors([])
  }, [combinedFilters, pageSize])

  // ------------------------------------------
  // 分页处理
  // ------------------------------------------
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

  // ------------------------------------------
  // 操作 mutations
  // ------------------------------------------

  // 单篇发布
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-article-detail', drawerArticleId] })
      toast({ title: '操作成功', description: '文章已发布', variant: 'default' })
    },
    onError: (error) => {
      toast({
        title: '发布失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  // 单篇下线
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-article-detail', drawerArticleId] })
      toast({ title: '操作成功', description: '文章已下线', variant: 'default' })
    },
    onError: (error) => {
      toast({
        title: '下线失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  // 批量更新状态（发布/下线/归档）
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

      // 多篇文章：使用批量操作 toast
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

      // 单篇文章：使用简单 toast
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

  // 批量删除
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

  // ------------------------------------------
  // 事件处理函数
  // ------------------------------------------

  /** 打开详情抽屉 */
  const handleView = React.useCallback((articleId: string) => {
    setDrawerArticleId(articleId)
    setDrawerOpen(true)
  }, [])

  /** 编辑文章（通知父组件跳转编辑页） */
  const handleEdit = React.useCallback((articleId: string) => {
    // 关闭详情抽屉（如果打开的话）
    setDrawerOpen(false)
    onEdit(articleId)
  }, [onEdit])

  /** 发布文章 */
  const handlePublish = React.useCallback((articleId: string) => {
    publishMutation.mutate(articleId)
  }, [publishMutation])

  /** 下线文章 */
  const handleUnpublish = React.useCallback((articleId: string) => {
    unpublishMutation.mutate(articleId)
  }, [unpublishMutation])

  /** 归档文章 */
  const handleArchive = React.useCallback((articleId: string) => {
    batchStatusMutation.mutate({ articleIds: [articleId], status: 'ARCHIVED' })
  }, [batchStatusMutation])

  /** 选择变化回调 */
  const handleSelectionChange = React.useCallback((ids: string[]) => {
    setSelectedIds(ids)
  }, [])

  /** 批量发布 */
  const handleBatchPublish = React.useCallback(() => {
    if (selectedIds.length === 0) return
    batchStatusMutation.mutate({ articleIds: selectedIds, status: 'PUBLISHED' })
  }, [batchStatusMutation, selectedIds])

  /** 批量下线 */
  const handleBatchUnpublish = React.useCallback(() => {
    if (selectedIds.length === 0) return
    batchStatusMutation.mutate({ articleIds: selectedIds, status: 'DRAFT' })
  }, [batchStatusMutation, selectedIds])

  /** 批量删除（需确认） */
  const handleBatchDelete = React.useCallback(() => {
    if (selectedIds.length === 0) return
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 篇文章吗？此操作不可恢复。`)) {
      return
    }
    batchDeleteMutation.mutate(selectedIds)
  }, [batchDeleteMutation, selectedIds])

  /** 清除选择 */
  const handleClearSelection = React.useCallback(() => {
    setSelectedIds([])
  }, [])

  /** 详情抽屉编辑按钮回调 */
  const handleDrawerEdit = React.useCallback((articleId: string) => {
    handleEdit(articleId)
  }, [handleEdit])

  // ------------------------------------------
  // 生成列定义
  // ------------------------------------------
  const columns = React.useMemo(
    () => getArticleColumns({
      onView: handleView,
      onEdit: handleEdit,
      onPublish: handlePublish,
      onUnpublish: handleUnpublish,
      onArchive: handleArchive,
    }),
    [handleView, handleEdit, handlePublish, handleUnpublish, handleArchive]
  )

  // ------------------------------------------
  // 分页配置
  // ------------------------------------------
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

  // ------------------------------------------
  // 渲染
  // ------------------------------------------
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 py-5 px-7 [&_[data-radix-scroll-area-viewport]]:max-h-none">
      {/* ======================================
          筛选栏：状态药丸 + 状态筛选标签组
          ====================================== */}
      <div className="flex items-center gap-3">
        {/* 状态统计药丸（由父组件传递的 stats 数据驱动） */}
        {stats && (
          <div className="flex items-center gap-1.5">
            <StatusPill label="已发布" count={stats.publishedCount} variant="published" />
            <StatusPill label="草稿" count={stats.draftCount} variant="draft" />
            <StatusPill label="归档" count={stats.archivedCount} variant="archived" />
          </div>
        )}

        {/* 分隔线 */}
        {stats && <div className="h-4 w-px bg-border-default" />}

        {/* 状态筛选标签组 */}
        <div className="flex items-center gap-2">
          {STATUS_FILTER_OPTIONS.map((option) => {
            const isActive = statusFilter === option.value

            return (
              <Button
                key={option.value}
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'gap-1.5 rounded-full px-3 text-[11.5px] font-medium transition-colors',
                  isActive
                    ? 'bg-ds-accent text-white hover:bg-ds-accent-hover hover:text-white'
                    : 'bg-surface border border-border-default text-fg-secondary hover:text-fg'
                )}
                onClick={() => setStatusFilter(option.value)}
              >
                {option.icon}
                {option.label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* ======================================
          数据表格 + 批量操作栏
          ====================================== */}
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

      {/* 首次加载时显示骨架屏，否则显示数据表格 */}
      {/* 表格区域：flex-1 min-h-0 填充剩余高度 */}
      {/* 内部 DataTable 的 ScrollArea 使用了固定 h-150，通过 [&>div>div]:h-full 让其撑满此容器 */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden [&>div]:flex-1 [&>div]:min-h-0 [&>div]:flex [&>div]:flex-col">
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

      {/* ======================================
          文章详情抽屉
          ====================================== */}
      <ArticleDetailDrawer
        articleId={drawerArticleId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onEdit={handleDrawerEdit}
      />
    </div>
  )
}

// ==================== 辅助组件 ====================

/**
 * 状态药丸组件
 * 用于筛选栏中显示各状态的文章计数
 * 映射到 Badge 的 ColorRole：published → success, draft → warning, archived → neutral
 */
function StatusPill({ label, count, variant }: {
  label: string
  count: number
  variant: 'published' | 'draft' | 'archived'
}) {
  const colorMap: Record<typeof variant, 'success' | 'warning' | 'neutral'> = {
    published: 'success',
    draft: 'warning',
    archived: 'neutral',
  }

  return (
    <Badge variant={colorMap[variant]} className="gap-1 text-xs font-normal">
      {label}
      <span className="font-medium">{count}</span>
    </Badge>
  )
}
