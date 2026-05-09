'use client'

import { AdminCategoryTable } from '@/components/business/admin/admin-category-table'
import { CreateCategorySheet } from './create-category-sheet'
import { Card, CardContent } from '@/components/ui/card'
import { AdminFilterBar } from '@/components/ui/admin-filter-bar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus } from 'lucide-react'
import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { AdminCategory } from '@/plugins/ecommerce/contracts/admin-categories.dto'
import type { ApiResponse } from '@/contracts/api-response.schema'
import { AdminPageLayout } from '@/components/ui/admin-page-layout'
import { AdminPageHeader } from '@/components/ui/admin-page-header'

/**
 * File: admin-categories-client.tsx
 *
 * Description: 分类管理页面的客户端组件
 */

export function AdminCategoriesClient() {
  const [searchQuery, setSearchQuery] = useState('')
  const [createSheetOpen, setCreateSheetOpen] = useState(false)

  // 使用 useQuery 获取分类列表
  const { data: categoriesData } = useQuery<{ items: AdminCategory[] }>({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/categories', { credentials: 'include' })
      if (!res.ok) {
        throw new Error(`Failed to fetch categories: ${res.statusText}`)
      }
      const json = await res.json() as ApiResponse<{ items: AdminCategory[] }>
      if (!json.success) {
        throw new Error(json.error.message)
      }
      return { items: json.data.items }
    },
    staleTime: 5 * 60 * 1000, // 5 分钟内数据视为新鲜
  })

  // 使用 useMemo 确保 categories 引用稳定
  const categories = useMemo(() => categoriesData?.items ?? [], [categoriesData?.items])

  return (
    <AdminPageLayout>
      {/* 页面标题 */}
      <AdminPageHeader description="管理产品分类，支持多层级分类结构" />

      <AdminFilterBar>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <Input
            placeholder="搜索分类名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-muted/5 border-none shadow-none"
          />
        </div>

        {/* 创建按钮 */}
        <Button onClick={() => setCreateSheetOpen(true)} className="shrink-0 shadow-lg shadow-primary/20 gap-2">
          <Plus className="h-4 w-4" />
          新建分类
        </Button>
      </AdminFilterBar>

      {/* 分类表格 */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          <AdminCategoryTable
            categories={categories}
            searchQuery={searchQuery}
          />
        </CardContent>
      </Card>

      {/* 创建分类 Sheet */}
      <CreateCategorySheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
        categories={categories}
        onSuccess={() => {
          // 创建成功后，分类列表会自动刷新（通过 React Query 的 invalidateQueries）
        }}
      />
    </AdminPageLayout>
  )
}
