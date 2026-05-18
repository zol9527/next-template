'use client'

import * as React from 'react'
import { Search, ChevronRight, Edit2, Trash2, Plus } from 'lucide-react'
import type { AdminCategory } from '@/plugins/ecommerce/contracts/admin-categories.dto'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface CategoryDetailPanelProps {
  /** 当前选中的分类 */
  selectedCategory: AdminCategory | null
  /** 选中分类的子分类 */
  childCategories: AdminCategory[]
  /** 编辑回调 */
  onEdit: (category: AdminCategory) => void
  /** 删除回调 */
  onDelete: (categoryId: string) => void
  /** 添加子分类回调 */
  onCreateChild: () => void
  /** 切换状态回调 */
  onToggleStatus: (category: AdminCategory) => void
  /** 删除操作是否进行中 */
  isDeleting?: boolean
}

/**
 * 右栏：分类详情面板
 *
 * 包含：面包屑路径 + 分类标题/操作 + 基本信息 + 子分类列表
 * 未选中分类时显示占位提示
 */
export function CategoryDetailPanel({
  selectedCategory,
  childCategories,
  onEdit,
  onDelete,
  onCreateChild,
  onToggleStatus,
  isDeleting,
}: CategoryDetailPanelProps) {
  // 删除确认 Dialog 状态
  const [deleteTarget, setDeleteTarget] = React.useState<AdminCategory | null>(null)

  if (!selectedCategory) {
    return (
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center h-full min-h-[400px] text-fg-muted">
        <div className="w-16 h-16 rounded-2xl bg-surface-alt flex items-center justify-center mb-4">
          <Search className="h-6 w-6 text-fg-muted/50" />
        </div>
        <p className="text-body-sm">选择左侧分类查看详情</p>
      </div>
    )
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="flex flex-col gap-4">
        {/* 面包屑路径 */}
        <div className="flex items-center gap-1.5 text-body-sm text-fg-muted">
          <span>分类管理</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-fg font-medium">{selectedCategory.name}</span>
        </div>

        {/* 分类标题 + 操作 */}
        <div className="flex items-center justify-between">
          <h2 className="heading-1">{selectedCategory.name}</h2>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-body-sm"
              onClick={() => onEdit(selectedCategory)}
            >
              <Edit2 className="h-3.5 w-3.5" />
              编辑
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-caption text-fg-muted">
                {selectedCategory.status === 'active' ? '启用' : '禁用'}
              </span>
              <Switch
                checked={selectedCategory.status === 'active'}
                onCheckedChange={() => onToggleStatus(selectedCategory)}
              />
            </div>
          </div>
        </div>

        {/* 基本信息 */}
        <div className="grid grid-cols-3 gap-4 py-4 border-y border-border-default">
          <div>
            <p className="text-caption text-fg-muted mb-1">Slug</p>
            <p className="text-body-sm text-fg font-mono">{selectedCategory.slug || '-'}</p>
          </div>
          <div>
            <p className="text-caption text-fg-muted mb-1">排序权重</p>
            <p className="text-body-sm text-fg">{selectedCategory.sortOrder}</p>
          </div>
          <div>
            <p className="text-caption text-fg-muted mb-1">描述</p>
            <p className="text-body-sm text-fg">{selectedCategory.description || '暂无描述'}</p>
          </div>
        </div>

        {/* 子分类列表 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="heading-2">
              子分类
              <span className="text-fg-muted ml-2">({childCategories.length})</span>
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg border-border-default"
              onClick={onCreateChild}
            >
              <Plus className="h-3.5 w-3.5" />
              添加子分类
            </Button>
          </div>

          {childCategories.length === 0 ? (
            <div className="py-8 text-center text-caption text-fg-muted border border-dashed border-border-default rounded-lg">
              暂无子分类，点击上方按钮添加
            </div>
          ) : (
            <div className="border border-border-default rounded-lg divide-y divide-border-default">
              {childCategories.map(child => (
                <div
                  key={child.id}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-surface-alt/50 motion-safe:transition-colors"
                >
                  <span className="flex-1 text-body font-medium truncate">{child.name}</span>
                  <span className="text-body-sm text-fg-muted font-mono">{child.slug || '-'}</span>
                  <span className="text-body-sm text-fg-muted w-12 text-center">{child.sortOrder}</span>
                  <Badge variant={child.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                    {child.status === 'active' ? '启用' : '禁用'}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(child)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(child)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 删除确认 AlertDialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除分类</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除「{deleteTarget?.name}」？若存在子分类或关联商品将无法删除，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  onDelete(deleteTarget.id)
                  setDeleteTarget(null)
                }
              }}
              disabled={isDeleting}
            >
              {isDeleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
