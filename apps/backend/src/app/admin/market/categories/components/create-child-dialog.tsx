'use client'

import * as React from 'react'
import type { AdminCategory, AdminCategoryStatus } from '@/plugins/ecommerce/contracts/admin-categories.dto'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface CreateChildDialogProps {
  /** 是否打开 */
  open: boolean
  /** 打开/关闭回调 */
  onOpenChange: (open: boolean) => void
  /** 父分类 */
  parentCategory: AdminCategory | null
  /** 当前子分类数量（用于排序提示） */
  siblingCount: number
  /** 提交回调 */
  onSubmit: (data: {
    name: string
    slug: string | null
    status: AdminCategoryStatus
    sortOrder: number
  }) => void
  /** 是否正在提交 */
  isSubmitting: boolean
}

/**
 * 添加子分类 Dialog (520px)
 *
 * 字段：子分类名称(*)、分类标识/Slug(*)(含格式过滤)、排序权重(含当前排序提示)、启用状态(Switch)
 */
export function CreateChildDialog({
  open,
  onOpenChange,
  parentCategory,
  siblingCount,
  onSubmit,
  isSubmitting,
}: CreateChildDialogProps) {
  const [name, setName] = React.useState('')
  const [slug, setSlug] = React.useState('')
  const [sortOrder, setSortOrder] = React.useState('0')
  const [status, setStatus] = React.useState<AdminCategoryStatus>('active')

  /** 重置表单 */
  function resetForm() {
    setName('')
    setSlug('')
    setSortOrder('0')
    setStatus('active')
  }

  function handleClose() {
    onOpenChange(false)
    resetForm()
  }

  function handleSubmit() {
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      slug: slug.trim() || null,
      status,
      sortOrder: Number(sortOrder) || 0,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>添加子分类</DialogTitle>
          {parentCategory && (
            <p className="text-body-sm text-fg-muted">
              父分类：{parentCategory.name}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 子分类名称 */}
          <div className="space-y-2">
            <Label htmlFor="child-name" className="text-body-sm font-medium">
              子分类名称 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="child-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入子分类名称"
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="child-slug" className="text-body-sm font-medium">
              分类标识 (Slug) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="child-slug"
              value={slug}
              onChange={(e) => setSlug(
                e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
              )}
              placeholder="URL 友好标识，如：programming"
            />
            <p className="text-caption text-fg-muted">
              仅支持小写字母、数字和连字符，用于 URL 路径
            </p>
          </div>

          {/* 排序权重 */}
          <div className="space-y-2">
            <Label htmlFor="child-sort" className="text-body-sm font-medium">
              排序权重
            </Label>
            <Input
              id="child-sort"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="0"
            />
            <p className="text-caption text-fg-muted">
              数字越大越靠前，当前排序：{siblingCount}
            </p>
          </div>

          {/* 启用状态 */}
          <div className="flex items-center justify-between py-2">
            <Label className="text-body-sm font-medium">启用状态</Label>
            <Switch
              checked={status === 'active'}
              onCheckedChange={(checked) => setStatus(checked ? 'active' : 'disabled')}
            />
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting ? '创建中...' : '添加子分类'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
