'use client'

import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Search } from 'lucide-react'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { AdminCategory } from '@/plugins/ecommerce/contracts/admin-categories.dto'

/**
 * File: create-category-sheet.tsx
 *
 * Description: 创建分类的 Sheet 组件
 */

interface CreateCategorySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: AdminCategory[]
  onSuccess: () => void
}

/**
 * Function: CreateCategorySheet
 *
 * Description: 创建分类的 Sheet 组件
 *
 * Parameters:
 *   open(boolean): 是否打开
 *   onOpenChange(function): 打开状态变化回调
 *   categories(AdminCategory[]): 所有分类列表（用于父分类选择）
 *   onSuccess(function): 创建成功回调
 */
export function CreateCategorySheet({
  open,
  onOpenChange,
  categories,
  onSuccess,
}: CreateCategorySheetProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [name, setName] = React.useState('')
  const [slug, setSlug] = React.useState('')
  const [selectedParentIds, setSelectedParentIds] = React.useState<Set<string>>(new Set())
  const [isRoot, setIsRoot] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')

  // 重置表单
  const resetForm = React.useCallback(() => {
    setName('')
    setSlug('')
    setSelectedParentIds(new Set())
    setIsRoot(true)
    setSearchQuery('')
  }, [])

  // 创建分类的 mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim()
      if (!trimmedName) {
        throw new Error('分类名称不能为空')
      }

      // 确定要创建的父分类列表
      const parentIds = isRoot ? [] : Array.from(selectedParentIds)

      if (!isRoot && parentIds.length === 0) {
        throw new Error('请选择至少一个父分类')
      }

      // 前端验证：检查同级分类名称是否已存在
      const nameToLower = trimmedName.toLowerCase()
      for (const parentId of parentIds) {
        const siblings = categories.filter((c) => c.parentId === parentId)
        const nameExists = siblings.some((c) => c.name.toLowerCase() === nameToLower)
        if (nameExists) {
          const parentName = parentId ? getCategoryName(parentId) : '一级分类'
          throw new Error(`「${parentName}」下已存在名为「${trimmedName}」的分类`)
        }
      }

      // 如果是一级分类，检查一级分类中是否已存在同名
      if (isRoot) {
        const rootCategories = categories.filter((c) => !c.parentId)
        const nameExists = rootCategories.some((c) => c.name.toLowerCase() === nameToLower)
        if (nameExists) {
          throw new Error(`一级分类中已存在名为「${trimmedName}」的分类`)
        }
      }

      // 批量创建
      const promises = parentIds.map((parentId) =>
        fetch('/api/v1/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: trimmedName,
            slug: slug.trim() || null,
            parentId: parentId || null,
          }),
        })
      )

      // 如果是一级分类，只创建一个
      if (isRoot) {
        promises.push(
          fetch('/api/v1/admin/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name: trimmedName, slug: slug.trim() || null, parentId: null }),
          })
        )
      }

      const results = await Promise.all(promises)

      // 检查所有请求是否成功
      const errors: string[] = []
      for (const res of results) {
        if (!res.ok) {
          let errorMessage = res.statusText || '请求失败'
          try {
            const json = (await res.json()) as ApiResponse<unknown>
            if (!json.success) errorMessage = json.error?.message || '请求失败'
          } catch { /* ignore */ }
          errors.push(errorMessage)
        }
      }

      if (errors.length > 0) {
        throw new Error(errors.join('; '))
      }

      return { successCount: results.length }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      const count = data?.successCount || 1
      toast({
        title: '创建成功',
        description: count > 1 ? `已创建 ${count} 个分类` : '分类已创建',
        variant: 'default',
      })
      resetForm()
      onOpenChange(false)
      onSuccess()
    },
    onError: (error) => {
      toast({
        title: '创建失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  /**
   * Function: getCategoryName
   *
   * Description: 获取分类名称
   *
   * Parameters:
   *   id(string): 分类 ID
   *
   * Returns:
   *   name(string): 分类名称
   */
  function getCategoryName(id: string) {
    const cat = categories.find((c) => c.id === id)
    return cat?.name || id
  }

  // 过滤顶级分类
  const filteredTopLevelCategories = React.useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    return categories
      .filter((c) => !c.parentId)
      .filter((c) => !query || c.name.toLowerCase().includes(query))
  }, [categories, searchQuery])

  // 切换分类选中状态
  const toggleCategorySelection = React.useCallback((categoryId: string) => {
    setSelectedParentIds((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }, [])

  return (
    <Sheet open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        resetForm()
      }
      onOpenChange(newOpen)
    }}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>新建分类</SheetTitle>
          <SheetDescription>
            创建新的分类，可选择多个父分类批量创建子分类
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* 分类类型选择 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">分类类型</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={isRoot ? 'solid' : 'outline'}
                color={isRoot ? 'primary' : undefined}
                size="sm"
                onClick={() => setIsRoot(true)}
                className="flex-1"
              >
                一级分类
              </Button>
              <Button
                type="button"
                variant={!isRoot ? 'solid' : 'outline'}
                color={!isRoot ? 'primary' : undefined}
                size="sm"
                onClick={() => setIsRoot(false)}
                className="flex-1"
              >
                子分类
              </Button>
            </div>
          </div>

          {/* 父分类选择（仅子分类时显示） */}
          {!isRoot && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">选择父分类（可多选）</Label>

              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
                <Input
                  placeholder="搜索分类..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* 分类列表 */}
              <ScrollArea className="h-48 border rounded-lg">
                {filteredTopLevelCategories.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {searchQuery ? '未找到匹配的分类' : '暂无分类'}
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredTopLevelCategories.map((cat) => {
                      const isSelected = selectedParentIds.has(cat.id)
                      return (
                        <div
                          key={cat.id}
                          onClick={() => toggleCategorySelection(cat.id)}
                          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => {}}
                            className="shrink-0 pointer-events-none"
                          />
                          <span className="flex-1 truncate">{cat.name}</span>
                          {isSelected && (
                            <span className="text-xs text-muted-foreground">
                              已选
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>

              {selectedParentIds.size > 0 && (
                <p className="text-sm text-muted-foreground">
                  已选择 {selectedParentIds.size} 个父分类
                </p>
              )}
            </div>
          )}

          {/* 分类名称 */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">分类名称 *</Label>
            <Input
              id="name"
              placeholder="输入分类名称"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={createMutation.isPending}
            />
          </div>

          {/* Slug（可选） */}
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-sm font-medium">
              Slug（可选）
            </Label>
            <Input
              id="slug"
              placeholder="URL 友好标识，留空则自动生成"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={createMutation.isPending}
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              type="button"
              color="primary"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !name.trim() || (!isRoot && selectedParentIds.size === 0)}
              className="flex-1"
            >
              {createMutation.isPending ? '创建中…' : '创建'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
