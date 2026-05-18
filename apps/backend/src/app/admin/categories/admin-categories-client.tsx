'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AdminCategory, AdminCategoryStatus } from '@/plugins/ecommerce/contracts/admin-categories.dto'
import type { ApiResponse } from '@/contracts/api-response.schema'
import { cn } from '@/lib/utils'
import { ShopMainCard } from '@/components/business/admin/shop/shop-main-card'
import { ShopSearchInput } from '@/components/business/admin/shop/shop-search-input'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { CreateCategorySheet } from './create-category-sheet'
import { CategoryTreePanel, buildCategoryTree } from './components/category-tree-panel'
import { CategoryDetailPanel } from './components/category-detail-panel'
import { CreateChildDialog } from './components/create-child-dialog'

/**
 * 分类管理页面客户端组件
 *
 * 设计规范:
 *   - TabBar 右侧: 搜索框 (220px) + 「添加分类」按钮
 *   - 内容区: 双栏布局
 *     - 左栏 CategoryTreePanel (280px): 分类列表树 + 搜索 + 新建分类按钮
 *     - 右栏 CategoryDetailPanel (剩余宽度): 分类详情 + 子分类列表
 */
export function AdminCategoriesClient() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // 页面状态
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null)
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set())
  const [createSheetOpen, setCreateSheetOpen] = React.useState(false)
  const [createChildDialogOpen, setCreateChildDialogOpen] = React.useState(false)

  // 获取分类列表
  const { data: categoriesData } = useQuery<{ items: AdminCategory[] }>({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/categories', { credentials: 'include' })
      if (!res.ok) throw new Error(`Failed to fetch categories: ${res.statusText}`)
      const json = (await res.json()) as ApiResponse<{ items: AdminCategory[] }>
      if (!json.success) throw new Error(json.error.message)
      return { items: json.data.items }
    },
    staleTime: 5 * 60 * 1000,
  })

  const categories = React.useMemo(() => categoriesData?.items ?? [], [categoriesData?.items])
  const categoryTree = React.useMemo(() => buildCategoryTree(categories), [categories])
  const selectedCategory = React.useMemo(
    () => categories.find(c => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  )
  const childCategories = React.useMemo(
    () => categories.filter(c => c.parentId === selectedCategoryId),
    [categories, selectedCategoryId]
  )

  // 新建子分类 mutation
  const createChildMutation = useMutation({
    mutationFn: async (params: {
      name: string
      slug: string | null
      parentId: string
      status: AdminCategoryStatus
      sortOrder: number
    }) => {
      const res = await fetch('/api/v1/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        let errorMessage = res.statusText || '请求失败'
        try {
          const json = (await res.json()) as ApiResponse<unknown>
          if (!json.success) errorMessage = json.error?.message || '请求失败'
        } catch { /* ignore */ }
        throw new Error(errorMessage)
      }
      const json = (await res.json()) as ApiResponse<AdminCategory>
      if (!json.success) throw new Error(json.error.message)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      toast({ title: '创建成功', description: '子分类已创建' })
      setCreateChildDialogOpen(false)
    },
    onError: (error) => {
      toast({
        title: '创建失败',
        description: error instanceof Error ? error.message : '网络错误',
        variant: 'destructive',
      })
    },
  })

  // 删除分类 mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/admin/categories/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        let errorMessage = res.statusText || '请求失败'
        try {
          const json = (await res.json()) as ApiResponse<unknown>
          if (!json.success) errorMessage = json.error?.message || '请求失败'
        } catch { /* ignore */ }
        throw new Error(errorMessage)
      }
      const json = (await res.json()) as ApiResponse<{ id: string }>
      if (!json.success) throw new Error(json.error.message)
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      toast({ title: '删除成功', description: '分类已删除' })
      if (selectedCategoryId) setSelectedCategoryId(null)
    },
    onError: (error) => {
      toast({
        title: '删除失败',
        description: error instanceof Error ? error.message : '网络错误',
        variant: 'destructive',
      })
    },
  })

  function toggleExpand(nodeId: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }

  return (
    <ShopMainCard
      activeTab="categories"
      headerRight={
        <>
          <ShopSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="搜索分类名称..."
          />
          <Button
            className="gap-2 shadow-lg shadow-primary/20"
            onClick={() => setCreateSheetOpen(true)}
          >
            <Plus className="h-4 w-4" />
            添加分类
          </Button>
        </>
      }
    >
      {/* 双栏布局 */}
      <div className="flex gap-6 min-h-0">
        {/* 左栏：分类树面板 */}
        <CategoryTreePanel
          categories={categories}
          categoryTree={categoryTree}
          selectedCategoryId={selectedCategoryId}
          expandedIds={expandedIds}
          onSelect={setSelectedCategoryId}
          onToggleExpand={toggleExpand}
          onToggleAll={() => {
            if (expandedIds.size > 0) {
              setExpandedIds(new Set())
            } else {
              const allIds = new Set(
                categories.filter(c => c.children && c.children.length > 0).map(c => c.id)
              )
              setExpandedIds(allIds)
            }
          }}
          onCreateCategory={() => setCreateSheetOpen(true)}
        />

        {/* 右栏：分类详情面板 */}
        <CategoryDetailPanel
          selectedCategory={selectedCategory}
          childCategories={childCategories}
          onEdit={() => {
            // TODO: 打开编辑 Modal（复用 CategoryEditModal）
          }}
          onDelete={(id) => deleteMutation.mutate(id)}
          onCreateChild={() => setCreateChildDialogOpen(true)}
          onToggleStatus={() => {
            // TODO: 切换分类状态
          }}
          isDeleting={deleteMutation.isPending}
        />
      </div>

      {/* 创建分类 Sheet */}
      <CreateCategorySheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
        categories={categories}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
        }}
      />

      {/* 添加子分类 Dialog */}
      <CreateChildDialog
        open={createChildDialogOpen}
        onOpenChange={setCreateChildDialogOpen}
        parentCategory={selectedCategory}
        siblingCount={childCategories.length}
        onSubmit={(data) => {
          if (!selectedCategoryId) return
          createChildMutation.mutate({
            ...data,
            parentId: selectedCategoryId,
          })
        }}
        isSubmitting={createChildMutation.isPending}
      />
    </ShopMainCard>
  )
}
