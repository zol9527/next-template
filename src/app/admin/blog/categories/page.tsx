'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import { AdminBlogCategoryForm } from '@/components/business/admin/blog/admin-blog-category-form'
import { AdminBlogCategoryList } from '@/components/business/admin/blog/admin-blog-category-list'
import { AdminPageHeader } from '@/components/ui/admin-page-header'
import { AdminPageLayout } from '@/components/ui/admin-page-layout'
import type { ApiResponse } from '@/contracts/api-response.schema'
import {
  AdminBlogCategoryTreeResponseSchema,
  type AdminBlogCategory,
} from '@/contracts/dtos/admin/blog/categories.dto'

async function fetchBlogCategories(): Promise<AdminBlogCategory[]> {
  const response = await fetch('/api/v1/admin/blog/categories', {
    credentials: 'include',
  })

  const json = (await response.json()) as ApiResponse<unknown>

  if (!response.ok) {
    throw new Error(json.success === false ? json.error.message : response.statusText)
  }

  if (!json.success) {
    throw new Error(json.error.message)
  }

  const parsed = AdminBlogCategoryTreeResponseSchema.safeParse(json.data)
  if (!parsed.success) {
    throw new Error('响应数据格式不符合预期')
  }

  return parsed.data.items
}

export default function AdminBlogCategoriesPage() {
  const [editingCategory, setEditingCategory] = React.useState<AdminBlogCategory | null>(null)
  const [formOpen, setFormOpen] = React.useState(false)

  const { data } = useQuery<AdminBlogCategory[]>({
    queryKey: ['admin', 'blog-categories'],
    queryFn: fetchBlogCategories,
  })

  const categories = Array.isArray(data) ? data : []

  // 使用 useCallback 稳定化回调引用，防止子组件因引用变化导致无限重渲染
  const handleEditCategory = React.useCallback((category: AdminBlogCategory) => {
    setEditingCategory(category)
    setFormOpen(true)
  }, [])

  const handleCreateCategory = React.useCallback(() => {
    setEditingCategory(null)
    setFormOpen(true)
  }, [])

  const handleFormSaved = React.useCallback(() => {
    setFormOpen(false)
    setEditingCategory(null)
  }, [])

  const handleFormCancel = React.useCallback(() => {
    setFormOpen(false)
    setEditingCategory(null)
  }, [])

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="博客分类管理"
        description="集中维护博客分类结构，支持层级展示与分类 CRUD。"
      />

      <AdminBlogCategoryList
        onEdit={handleEditCategory}
        onCreate={handleCreateCategory}
      />

      <AdminBlogCategoryForm
        category={editingCategory}
        open={formOpen}
        onSaved={handleFormSaved}
        onCancel={handleFormCancel}
        categories={categories}
      />
    </AdminPageLayout>
  )
}
