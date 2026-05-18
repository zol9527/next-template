'use client'

/**
 * File: media-library.tsx
 * Description: 媒体库主容器 — 替换 AdminMediaUploader，全宽单列布局
 */

import * as React from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

import { Search, LayoutGrid, List, Upload } from 'lucide-react'
import { useAdminMediaAssetsPaginated } from '@/components/context/admin-media-assets-context'
import { useToast } from '@/components/ui/toast'
import { AdminPageHeader } from '@/components/ui/admin-page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AdminMediaAsset } from '@/contracts/dtos/admin/media-assets.dto'
import type { AdminMediaAssetType } from '@/contracts/dtos/admin/media-assets.dto'
import type { StorageUsage } from '@/components/context/admin-media-assets-context'
import type { ViewMode } from './media-toolbar'
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

  // 注入到 AdminShell CardHeader 的操作区：搜索框 + 视图切换 + 上传按钮
  const headerActions = (
    <div className="flex items-center shrink-0" style={{ gap: '8px' }}>
      {/* 搜索框 — pill 圆角, bg 背景 */}
      <div className="relative" style={{ width: '220px' }}>
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2"
          style={{ width: '16px', height: '16px', color: 'var(--fg-muted)' }}
        />
        <Input
          placeholder="搜索文件..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-8 h-[33px] border-0 shadow-none"
          style={{
            borderRadius: 'var(--radius-pill, 9999px)',
            backgroundColor: 'var(--bg, #f2f1ed)',
            color: 'var(--fg)',
            fontSize: '12px',
          }}
        />
      </div>

      {/* 视图切换 — bg 色底, active 白色+阴影 */}
      <div
        className="flex items-center gap-0.5 p-0.5"
        style={{
          borderRadius: 'var(--radius-sm, 8px)',
          backgroundColor: 'var(--bg, #f2f1ed)',
        }}
      >
        <button
          onClick={() => handleViewModeChange('grid')}
          className="flex items-center justify-center transition-all"
          style={{
            width: '32px',
            height: '30px',
            borderRadius: '6px',
            backgroundColor: viewMode === 'grid' ? 'var(--surface, #ffffff)' : 'transparent',
            color: viewMode === 'grid' ? 'var(--fg)' : 'var(--fg-muted, #9c9a91)',
            boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(38,37,30,0.08)' : 'none',
          }}
        >
          <LayoutGrid style={{ width: '18px', height: '18px' }} />
        </button>
        <button
          onClick={() => handleViewModeChange('list')}
          className="flex items-center justify-center transition-all"
          style={{
            width: '32px',
            height: '30px',
            borderRadius: '6px',
            backgroundColor: viewMode === 'list' ? 'var(--surface, #ffffff)' : 'transparent',
            color: viewMode === 'list' ? 'var(--fg)' : 'var(--fg-muted, #9c9a91)',
            boxShadow: viewMode === 'list' ? '0 1px 3px rgba(38,37,30,0.08)' : 'none',
          }}
        >
          <List style={{ width: '18px', height: '18px' }} />
        </button>
      </div>

      {/* 上传按钮 */}
      <Button
        onClick={() => setIsUploadDialogOpen(true)}
        className="text-white text-sm font-medium flex items-center gap-1.5"
        style={{
          backgroundColor: 'var(--ds-accent)',
          borderRadius: 'var(--radius-sm, 8px)',
          height: '31px',
          width: '102px',
        }}
      >
        <Upload style={{ width: '16px', height: '16px' }} />
        上传文件
      </Button>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 通过 context 注入标题、面包屑、操作和筛选栏到 CardHeader */}
      <AdminPageHeader
        title="媒体库"
        breadcrumbs={[{ label: '内容管理' }, { label: '媒体库' }]}
        actions={headerActions}
        filterBar={
          <MediaFilterBar
            activeFilter={typeFilter}
            onFilterChange={handleFilterChange}
            totalCount={pagination?.totalCount ?? 0}
            storageUsage={storageUsage}
          />
        }
      />

      {/* 内容区 */}
      <div className="flex-1" style={{ padding: '24px 28px' }}>
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
