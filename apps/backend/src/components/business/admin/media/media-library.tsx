'use client'

/**
 * File: media-library.tsx
 * Description: 媒体库主容器 — 替换 AdminMediaUploader，全宽单列布局
 */

import * as React from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

import { useAdminMediaAssetsPaginated } from '@/components/context/admin-media-assets-context'
import { useToast } from '@/components/ui/toast'
import type { AdminMediaAsset } from '@/contracts/dtos/admin/media-assets.dto'
import type { AdminMediaAssetType } from '@/contracts/dtos/admin/media-assets.dto'
import type { StorageUsage } from '@/components/context/admin-media-assets-context'
import { MediaToolbar, type ViewMode } from './media-toolbar'
import { MediaFilterBar, type TypeFilter } from './media-filter-bar'
import { MediaGridView } from './media-grid-view'
import { MediaListView } from './media-list-view'
import { MediaPagination } from './media-pagination'
import { UploadDialog } from './media-upload-dialog'
import { MediaDetailPanel } from './media-detail-panel'
import { DeleteConfirmDialog } from './delete-confirm-dialog'

/**
 * Function: MediaLibrary
 *
 * Description: 媒体库主容器，整合工具栏、筛选、视图和分页
 * 视图切换状态存储在 URL 查询参数中，便于分享和书签
 */
export function MediaLibrary() {
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // 从 URL 读取状态
  const viewMode = (searchParams.get('view') as ViewMode) || 'grid'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
  const searchQuery = searchParams.get('search') || ''
  const typeFilter = (searchParams.get('type') as TypeFilter) || 'all'

  // 将 TypeFilter 转换为 API 需要的 AdminMediaAssetType 数组
  const apiTypeFilter: AdminMediaAssetType[] = React.useMemo(() => {
    if (typeFilter === 'all') return []
    // 目前 API 只支持 image 和 video 类型过滤
    if (typeFilter === 'image' || typeFilter === 'video') return [typeFilter]
    // document 和 audio 暂时通过前端过滤
    return []
  }, [typeFilter])

  // 数据查询
  const {
    listQuery,
    removeAsset,
    invalidateList,
    renameAsset,
    fetchStorageUsage,
  } = useAdminMediaAssetsPaginated({
    page,
    pageSize,
    search: searchQuery,
    type: apiTypeFilter,
    enabled: true,
  })

  // 存储使用情况
  const [storageUsage, setStorageUsage] = React.useState<StorageUsage | null>(null)
  React.useEffect(() => {
    void (async () => {
      try {
        const usage = await fetchStorageUsage()
        setStorageUsage(usage)
      } catch {
        // 静默失败，不影响主流程
      }
    })()
  }, [fetchStorageUsage])

  // 删除相关状态
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [assetToDelete, setAssetToDelete] = React.useState<AdminMediaAsset | null>(null)

  // 详情面板状态
  const [detailAssetId, setDetailAssetId] = React.useState<string | null>(null)

  // 上传弹窗状态
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false)

  const items = listQuery.data?.items ?? []
  const pagination = listQuery.data?.pagination
  const isLoading = listQuery.isLoading

  // 更新 URL 查询参数的辅助函数
  const updateParams = React.useCallback((updates: Record<string, string | number>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === '' || value === 'all' || value === 1) {
        params.delete(key)
      } else {
        params.set(key, String(value))
      }
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  // 事件处理
  const handleSearchChange = React.useCallback((query: string) => {
    updateParams({ search: query, page: 1 })
  }, [updateParams])

  const handleViewModeChange = React.useCallback((mode: ViewMode) => {
    updateParams({ view: mode })
  }, [updateParams])

  const handleFilterChange = React.useCallback((filter: TypeFilter) => {
    updateParams({ type: filter, page: 1 })
  }, [updateParams])

  const handlePageChange = React.useCallback((newPage: number) => {
    updateParams({ page: newPage })
  }, [updateParams])

  const handlePageSizeChange = React.useCallback((newSize: number) => {
    updateParams({ pageSize: newSize, page: 1 })
  }, [updateParams])

  const handleDeleteClick = React.useCallback((assetId: string) => {
    const asset = items.find((a) => a.id === assetId)
    if (asset) {
      setAssetToDelete(asset)
      setDeleteDialogOpen(true)
    }
  }, [items])

  const handleDeleteConfirm = React.useCallback(() => {
    if (!assetToDelete) return
    void (async () => {
      try {
        await removeAsset(assetToDelete.id)
        toast({ title: '删除成功', description: '媒体已删除' })
        setDeleteDialogOpen(false)
        setAssetToDelete(null)
        // 刷新存储使用情况
        try {
          const usage = await fetchStorageUsage()
          setStorageUsage(usage)
        } catch { /* ignore */ }
      } catch (error) {
        toast({
          title: '删除失败',
          description: error instanceof Error ? error.message : '删除媒体失败',
          variant: 'destructive',
        })
      }
    })()
  }, [assetToDelete, removeAsset, toast, fetchStorageUsage])

  // 前端过滤：API 不支持的 document/audio 类型
  const filteredItems = React.useMemo(() => {
    if (typeFilter === 'all' || typeFilter === 'image' || typeFilter === 'video') return items
    return items.filter((item) => {
      const ct = item.contentType
      if (typeFilter === 'document') {
        return !ct.startsWith('image/') && !ct.startsWith('video/') && !ct.startsWith('audio/')
      }
      if (typeFilter === 'audio') return ct.startsWith('audio/')
      return true
    })
  }, [items, typeFilter])

  return (
    // 负边距抵消 AdminShell CardContent 的 py-6 px-7，
    // 让 MediaLibrary 完全接管自己的布局（与 Paper Design MainCard 对齐）
    <div className="flex flex-col flex-1 min-h-0 -mx-7 -my-6">
      {/* 工具栏 — 对应 Paper Design CardHeader 内的面包屑+工具 */}
      <MediaToolbar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onUploadClick={() => setIsUploadDialogOpen(true)}
      />

      {/* 筛选栏 */}
      <MediaFilterBar
        activeFilter={typeFilter}
        onFilterChange={handleFilterChange}
        totalCount={pagination?.totalCount ?? 0}
        storageUsage={storageUsage}
      />

      {/* 内容区 */}
      <div className="flex-1" style={{ padding: 'var(--space-6, 24px) var(--space-7, 28px)' }}>
        {viewMode === 'grid' ? (
          <MediaGridView
            items={filteredItems}
            isLoading={isLoading}
            onDeleteClick={handleDeleteClick}
            onDetailClick={setDetailAssetId}
          />
        ) : (
          <MediaListView
            items={filteredItems}
            isLoading={isLoading}
            onDeleteClick={handleDeleteClick}
            onDetailClick={setDetailAssetId}
          />
        )}
      </div>

      {/* 分页器 */}
      {pagination && (
        <MediaPagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          totalCount={pagination.totalCount}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* 删除确认弹窗 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChangeAction={setDeleteDialogOpen}
        asset={assetToDelete}
        references={[]}
        onConfirmAction={handleDeleteConfirm}
      />

      {/* 上传弹窗 */}
      <UploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
      />

      {/* 详情面板 */}
      <MediaDetailPanel
        open={!!detailAssetId}
        onOpenChange={(open) => { if (!open) setDetailAssetId(null) }}
        asset={detailAssetId ? items.find(a => a.id === detailAssetId) ?? null : null}
        references={[]}
        onDeleteClick={(assetId) => {
          setDetailAssetId(null)
          handleDeleteClick(assetId)
        }}
      />
    </div>
  )
}
