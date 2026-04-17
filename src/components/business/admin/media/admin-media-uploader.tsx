'use client'

/**
 * File: admin-media-uploader.tsx
 * Description: 媒体资产管理主页面，双列布局（左侧上传 + 右侧列表）
 */

import * as React from 'react'
import { RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { MediaUploadPanel } from '@/components/business/admin/media/media-upload-panel'
import { MediaCard } from '@/components/business/admin/media/media-card'
import { DeleteConfirmDialog } from '@/components/business/admin/media/delete-confirm-dialog'
import { DataTablePagination } from '@/components/ui/data-table/pagination'
import { useToast } from '@/components/ui/toast'
import type { AdminMediaAsset } from '@/contracts/dtos/admin/media-assets.dto'
import { cn } from '@/lib/utils'
import { useAdminMediaAssets } from '@/components/context/admin-media-assets-context'

/**
 * Function: AdminMediaUploader
 *
 * Description: 媒体资产管理主页面组件，双列布局展示
 *
 * Returns:
 *    element(React.ReactElement): 媒体管理页面 UI
 */
export function AdminMediaUploader() {
  const { toast } = useToast()

  // 分页状态
  const [pageSize, setPageSize] = React.useState(12)
  const [cursor, setCursor] = React.useState<string | undefined>()
  const [prevCursors, setPrevCursors] = React.useState<string[]>([])

  // 删除确认状态
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [assetToDelete, setAssetToDelete] = React.useState<AdminMediaAsset | null>(null)

  const {
    removeAsset,
    invalidateList,
    listQuery,
    referencesQuery,
  } = useAdminMediaAssets({
    list: {
      cursor: cursor ?? null,
      pageSize,
      enabled: true,
    },
    references: {
      assetId: assetToDelete?.id ?? null,
    },
  })

  // 删除逻辑由 Provider 统一处理（包含 refreshList）

  // 分页处理
  const data = listQuery.data
  const isLoading = listQuery.isLoading
  const isPlaceholderData = listQuery.isPlaceholderData

  const totalRecords = data?.totalRecords ?? 0
  const totalCount = data?.items.length ?? 0

  const handleNextPage = () => {
    if (data?.nextCursor) {
      setPrevCursors((prev) => [...prev, cursor ?? ''])
      setCursor(data.nextCursor)
    }
  }

  const handlePrevPage = () => {
    if (prevCursors.length > 0) {
      const newPrevCursors = [...prevCursors]
      const prevCursor = newPrevCursors.pop()
      setPrevCursors(newPrevCursors)
      setCursor(prevCursor)
    }
  }

  // 删除处理
  const handleDeleteClick = (assetId: string) => {
    const asset = data?.items.find((a) => a.id === assetId)
    if (asset) {
      setAssetToDelete(asset)
      setDeleteDialogOpen(true)
    }
  }

  const handleDeleteConfirm = () => {
    if (!assetToDelete) return

    void (async () => {
      try {
        await removeAsset(assetToDelete.id)
        toast({ title: '删除成功', description: '媒体已删除', variant: 'default' })
        setDeleteDialogOpen(false)
        setAssetToDelete(null)
      } catch (error) {
        toast({
          title: '删除失败',
          description: error instanceof Error ? error.message : '删除媒体失败',
          variant: 'destructive',
        })
      }
    })()
  }

  // 构建引用数量映射（当前为简化实现，暂未使用）
  // TODO: 实现每个媒体资产的引用数量统计
  // const referenceCountMap = React.useMemo(() => {
  //   const map = new Map<string, number>()
  //   referencesData?.references.forEach((_ref) => {
  //     // 由于我们通过产品查询引用，需要反向映射
  //     // 这里简化处理，实际需要从引用数据中提取媒体 ID
  //   })
  //   return map
  // }, [referencesData])

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-stretch">

      {/* 左侧上传区 */}
      <div className="w-full lg:w-100 lg:shrink-0">
        <MediaUploadPanel />
      </div>

      {/* 右侧列表区 */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* 列表头部 */}
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">媒体库</h2>
            <p className="text-sm text-muted-foreground">
              共管理 {totalRecords} 个媒体文件
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={() => {
              setCursor(undefined)
              setPrevCursors([])
              void invalidateList()
            }}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* 空状态 */}
        {!isPlaceholderData && data?.items.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/5 border border-dashed border-border/20">
            <div className="h-20 w-20 rounded-full bg-muted/5 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-muted-foreground">暂无媒体资源，开始上传吧</p>
          </div>
        ) : (
          <>
            {/* 媒体网格 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {data?.items.map((asset) => (
                <MediaCard
                  key={asset.id}
                  asset={asset}
                  onDeleteClickAction={handleDeleteClick}
                  referenceCount={0} // TODO: 实现引用数量统计
                />
              ))}
            </div>

            {/* 分页 */}
            <div className="mt-6">
              <DataTablePagination
                config={{
                  nextCursor: data?.nextCursor ?? null,
                  prevCursors: prevCursors,
                  isLoading,
                  onNextPage: handleNextPage,
                  onPrevPage: handlePrevPage,
                  onPageSizeChange: (size) => {
                    setPageSize(size)
                    setCursor(undefined)
                    setPrevCursors([])
                  },
                  pageSize,
                  totalCount,
                  totalRecords,
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* 删除确认 Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChangeAction={setDeleteDialogOpen}
        asset={assetToDelete}
        references={referencesQuery.data?.references ?? []}
        onConfirmAction={handleDeleteConfirm}
      />
    </div>
  )
}
