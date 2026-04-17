'use client'

import { X, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * File: batch-action-bar.tsx
 * Description: 批量操作栏组件，用于表格批量操作时的固定操作栏
 */

interface BatchActionBarProps {
  /** 选中的项目数量 */
  selectedCount: number
  /** 批量发布回调 */
  onPublish?: () => void
  /** 批量下架回调 */
  onUnpublish?: () => void
  /** 批量删除回调 */
  onDelete?: () => void
  /** 清除选择回调 */
  onClearSelection: () => void
  /** 是否正在加载 */
  isLoading?: boolean
}

/**
 * Function: BatchActionBar
 *
 * Description: 固定在表格顶部或底部的批量操作栏，显示选中数量并提供批量操作按钮
 *
 * Parameters:
 * 	selectedCount(number): 选中的项目数量
 * 	onPublish(function): 批量发布回调
 * 	onUnpublish(function): 批量下架回调
 * 	onDelete(function): 批量删除回调
 * 	onClearSelection(function): 清除选择回调
 * 	isLoading(boolean): 是否正在加载
 *
 * Returns:
 * 	JSX.Element: 批量操作栏组件
 */
export function BatchActionBar({
  selectedCount,
  onPublish,
  onUnpublish,
  onDelete,
  onClearSelection,
  isLoading = false,
}: BatchActionBarProps) {
  if (selectedCount === 0) {
    return null
  }

  const handlePublish = () => {
    onPublish?.()
  }

  const handleUnpublish = () => {
    onUnpublish?.()
  }

  const handleDelete = () => {
    onDelete?.()
  }

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'bg-card border border-border/40 rounded-lg shadow-lg',
        'px-4 py-3 flex items-center gap-4',
        'animate-in slide-in-from-bottom-4 fade-in duration-300',
        'max-w-[90vw] overflow-x-auto'
      )}
      role="toolbar"
      aria-label={`批量操作：已选择 ${selectedCount} 项`}
    >
      {/* 选中数量指示 */}
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
          {selectedCount}
        </div>
        <span>已选择</span>
      </div>

      {/* 分隔线 */}
      <div className="h-6 w-px bg-border/40" />

      {/* 批量操作按钮 */}
      <div className="flex items-center gap-2">
        {onPublish && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handlePublish}
            disabled={isLoading}
            className="gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" />
            批量上架
          </Button>
        )}

        {onUnpublish && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleUnpublish}
            disabled={isLoading}
            className="gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" />
            批量下架
          </Button>
        )}

        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isLoading}
            className="gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            批量删除
          </Button>
        )}
      </div>

      {/* 分隔线 */}
      <div className="h-6 w-px bg-border/40" />

      {/* 清除选择按钮 */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClearSelection}
        disabled={isLoading}
        className="h-8 w-8 shrink-0"
        aria-label="清除选择"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* 加载状态指示 */}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          处理中...
        </div>
      )}
    </div>
  )
}
