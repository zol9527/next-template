'use client'

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, FolderTree, Plus, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { ApiResponse } from '@/contracts/api-response.schema'
import {
  AdminBlogCategoryTreeResponseSchema,
  type AdminBlogCategory,
} from '@/contracts/dtos/admin/blog/categories.dto'

import { CategoryInlineForm } from './category-inline-form'
import { CategoryItem } from './category-item'

// ============================================================
// 类型定义
// ============================================================

/** 分类面板组件的属性接口 */
interface CategoryPanelProps {
  /** 选中分类变化时的回调，null 表示"全部文章" */
  onCategoryChange: (categoryId: string | null) => void
  /** 当前选中的分类 ID，null 表示未选中任何分类 */
  selectedCategoryId: string | null
}

/** 带有子节点信息的分类树节点 */
type CategoryNode = AdminBlogCategory & {
  children: CategoryNode[]
}

/** 需要展开的分类 ID 集合 */
type ExpandedIds = Set<string>

// ============================================================
// API 请求函数
// ============================================================

/**
 * 获取博客分类列表
 *
 * 请求后端获取全部分类数据，通过 Zod schema 校验响应格式，
 * 返回扁平的分类数组。
 */
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

/**
 * 创建博客分类
 *
 * 向后端发送 POST 请求创建新分类。
 */
async function createBlogCategory(payload: {
  name: string
  slug?: string
  description?: string
  parentId?: string | null
  sortOrder?: number
}): Promise<AdminBlogCategory> {
  const response = await fetch('/api/v1/admin/blog/categories', {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
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

  // 创建接口返回的也是 { items } 结构，取第一个
  return parsed.data.items[0]
}

/**
 * 更新博客分类
 *
 * 向后端发送 PATCH 请求更新指定分类信息。
 */
async function updateBlogCategory(
  categoryId: string,
  payload: { name?: string; slug?: string; description?: string }
): Promise<AdminBlogCategory> {
  const response = await fetch(`/api/v1/admin/blog/categories/${categoryId}`, {
    credentials: 'include',
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
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

  return parsed.data.items[0]
}

/**
 * 读取删除操作的错误信息
 *
 * 尝试从响应体中解析错误消息和错误码，
 * 用于在删除失败时给出精确的提示。
 */
async function readDeleteError(response: Response): Promise<{ message: string; code?: string }> {
  try {
    const json = (await response.json()) as ApiResponse<unknown>
    if (!json.success) {
      return { message: json.error.message, code: json.error.code }
    }
  } catch {
    // 解析失败时忽略
  }

  return { message: response.statusText || '请求失败' }
}

/**
 * 删除博客分类
 *
 * 向后端发送 DELETE 请求删除指定分类，
 * 支持检测 CONFLICT 错误码（分类下存在文章时）。
 */
async function deleteBlogCategory(category: AdminBlogCategory): Promise<AdminBlogCategory> {
  const response = await fetch(`/api/v1/admin/blog/categories/${category.id}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) {
    const apiError = await readDeleteError(response)
    const errorToThrow = new Error(apiError.message) as Error & { code?: string }
    errorToThrow.code = apiError.code
    throw errorToThrow
  }

  const json = (await response.json()) as ApiResponse<unknown>
  if (!json.success) {
    const errorToThrow = new Error(json.error.message) as Error & { code?: string }
    errorToThrow.code = json.error.code
    throw errorToThrow
  }

  return category
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 将扁平的分类列表构建为树形结构
 *
 * 算法：
 * 1. 创建所有节点的 Map（id → CategoryNode）
 * 2. 根据 parentId 建立父子关系
 * 3. 无 parentId 或 parentId 找不到对应节点 → 作为根节点
 * 4. 按 sortOrder 升序排序，sortOrder 相同则按 name 中文排序
 */
function buildCategoryTree(categories: AdminBlogCategory[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>()
  categories.forEach((item) => {
    nodes.set(item.id, { ...item, children: [] })
  })

  const roots: CategoryNode[] = []
  nodes.forEach((node) => {
    if (node.parentId) {
      const parent = nodes.get(node.parentId)
      if (parent) {
        parent.children.push(node)
        return
      }
    }

    roots.push(node)
  })

  // 递归排序：先按 sortOrder，再按 name
  const sortNodes = (items: CategoryNode[]) => {
    items.sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder
      }
      return left.name.localeCompare(right.name, 'zh-CN')
    })
    items.forEach((item) => sortNodes(item.children))
  }

  sortNodes(roots)
  return roots
}

/**
 * 根据名称关键词过滤分类树
 *
 * 保留自身或任一后代匹配关键词的节点，
 * 确保匹配节点的所有祖先节点也显示出来。
 */
function filterCategoryTree(
  nodes: CategoryNode[],
  keyword: string
): CategoryNode[] {
  if (!keyword.trim()) {
    return nodes
  }

  const lowerKeyword = keyword.toLowerCase()

  function filterNode(node: CategoryNode): CategoryNode | null {
    // 检查当前节点名称是否匹配
    const selfMatches = node.name.toLowerCase().includes(lowerKeyword)

    // 递归过滤子节点
    const filteredChildren = node.children
      .map((child) => filterNode(child))
      .filter((child): child is CategoryNode => child !== null)

    // 自身匹配或有匹配的子节点 → 保留
    if (selfMatches || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren }
    }

    return null
  }

  return nodes
    .map((node) => filterNode(node))
    .filter((node): node is CategoryNode => node !== null)
}

/**
 * 收集节点及其所有后代的 ID
 *
 * 用于在删除分类时检查是否需要收起展开状态，
 * 以及在取消选中已删除的分类时自动回退到"全部文章"。
 */
function collectDescendantIds(node: CategoryNode): string[] {
  const ids = [node.id]
  for (const child of node.children) {
    ids.push(...collectDescendantIds(child))
  }
  return ids
}

// ============================================================
// 分类树递归渲染组件
// ============================================================

/**
 * 递归渲染分类树节点列表
 *
 * 根据 expandedIds 决定是否渲染子节点，
 * 通过 level 传递当前深度用于计算缩进。
 */
function CategoryTreeItems({
  nodes,
  level,
  selectedCategoryId,
  expandedIds,
  onSelect,
  onToggleExpand,
  onEdit,
  onDelete,
}: {
  nodes: CategoryNode[]
  level: number
  selectedCategoryId: string | null
  expandedIds: ExpandedIds
  onSelect: (categoryId: string | null) => void
  onToggleExpand: (categoryId: string) => void
  onEdit: (category: AdminBlogCategory) => void
  onDelete: (category: AdminBlogCategory) => void
}) {
  return (
    <>
      {nodes.map((node) => {
        const isExpanded = expandedIds.has(node.id)
        const hasChildren = node.children.length > 0

        return (
          <React.Fragment key={node.id}>
            <CategoryItem
              category={node}
              level={level}
              isSelected={selectedCategoryId === node.id}
              isExpanded={isExpanded}
              hasChildren={hasChildren}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onDelete={onDelete}
            />
            {/* 仅在展开时渲染子节点 */}
            {isExpanded && hasChildren && (
              <CategoryTreeItems
                nodes={node.children}
                level={level + 1}
                selectedCategoryId={selectedCategoryId}
                expandedIds={expandedIds}
                onSelect={onSelect}
                onToggleExpand={onToggleExpand}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            )}
          </React.Fragment>
        )
      })}
    </>
  )
}

// ============================================================
// 主组件：分类面板
// ============================================================

/**
 * 博客分类管理面板
 *
 * 作为博客管理页面的左侧边栏，提供：
 * - 搜索分类
 * - 树形展示分类列表
 * - 行内新建/编辑分类
 * - 点击分类筛选文章
 * - 删除分类（带冲突检测）
 *
 * 结构：
 * 1. 顶部标题 + 新建按钮
 * 2. 搜索输入框
 * 3. "全部文章"选项 + 分类树列表
 * 4. 行内表单（新建/编辑时显示）
 * 5. 底部分类计数
 */
export function CategoryPanel({ onCategoryChange, selectedCategoryId }: CategoryPanelProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // ---- 状态 ----
  /** 搜索关键词 */
  const [searchKeyword, setSearchKeyword] = React.useState('')
  /** 展开的分类 ID 集合 */
  const [expandedIds, setExpandedIds] = React.useState<ExpandedIds>(new Set())
  /** 是否显示行内表单 */
  const [showForm, setShowForm] = React.useState(false)
  /** 正在编辑的分类，null 表示新建模式 */
  const [editingCategory, setEditingCategory] = React.useState<AdminBlogCategory | null>(null)

  // ---- 数据查询 ----
  const { data, isLoading, error } = useQuery<AdminBlogCategory[]>({
    queryKey: ['admin', 'blog-categories'],
    queryFn: fetchBlogCategories,
    staleTime: 5 * 60 * 1000,
  })

  const categories = Array.isArray(data) ? data : []

  // ---- 派生数据 ----
  /** 构建分类树 */
  const categoryTree = React.useMemo(
    () => buildCategoryTree(categories),
    [categories]
  )

  /** 根据搜索关键词过滤分类树 */
  const filteredTree = React.useMemo(
    () => filterCategoryTree(categoryTree, searchKeyword),
    [categoryTree, searchKeyword]
  )

  /** 搜索模式下统计过滤后的总分类数 */
  const totalFilteredCount = React.useMemo(() => {
    if (!searchKeyword.trim()) return categories.length
    let count = 0
    const countNodes = (nodes: CategoryNode[]) => {
      for (const node of nodes) {
        count++
        countNodes(node.children)
      }
    }
    countNodes(filteredTree)
    return count
  }, [categories.length, searchKeyword, filteredTree])

  // ---- 删除 mutation ----
  const deleteMutation = useMutation({
    mutationFn: deleteBlogCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-categories'] })
      toast({ title: '删除成功', description: '博客分类已删除' })

      // 如果删除的是当前选中的分类，则回退到"全部文章"
      if (selectedCategoryId) {
        const deletedId = deleteMutation.variables?.id
        if (deletedId === selectedCategoryId) {
          onCategoryChange(null)
        }
      }
    },
    onError: (error) => {
      const typedError = error as Error & { code?: string }
      toast({
        title: '删除失败',
        description:
          typedError.code === 'CONFLICT'
            ? '该分类下存在文章，无法删除'
            : typedError.message,
        variant: 'destructive',
      })
    },
  })

  // ---- 创建 mutation ----
  const createMutation = useMutation({
    mutationFn: createBlogCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-categories'] })
      toast({ title: '创建成功', description: '博客分类已创建' })
      closeForm()
    },
    onError: (error) => {
      toast({
        title: '创建失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      })
    },
  })

  // ---- 更新 mutation ----
  const updateMutation = useMutation({
    mutationFn: ({ categoryId, data }: { categoryId: string; data: { name?: string; slug?: string; description?: string } }) =>
      updateBlogCategory(categoryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-categories'] })
      toast({ title: '更新成功', description: '博客分类已更新' })
      closeForm()
    },
    onError: (error) => {
      toast({
        title: '更新失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      })
    },
  })

  // ---- 事件处理 ----

  /**
   * 关闭行内表单，重置编辑状态
   */
  function closeForm() {
    setShowForm(false)
    setEditingCategory(null)
  }

  /**
   * 点击"新建分类"按钮
   */
  function handleCreateClick() {
    setEditingCategory(null)
    setShowForm(true)
  }

  /**
   * 行内表单提交处理
   * 根据编辑模式/新建模式分别调用对应的 mutation
   */
  function handleFormSubmit(formData: { name: string; slug?: string; description?: string }) {
    if (editingCategory) {
      // 编辑模式
      updateMutation.mutate({
        categoryId: editingCategory.id,
        data: formData,
      })
    } else {
      // 新建模式
      createMutation.mutate(formData)
    }
  }

  /**
   * 编辑分类回调
   * 打开行内表单并预填充分类数据
   */
  function handleEdit(category: AdminBlogCategory) {
    setEditingCategory(category)
    setShowForm(true)
  }

  /**
   * 删除分类回调
   * 弹出确认对话框后执行删除
   */
  function handleDelete(category: AdminBlogCategory) {
    if (deleteMutation.isPending) {
      return
    }

    if (!confirm(`确定要删除分类"${category.name}"吗？`)) {
      return
    }

    deleteMutation.mutate(category)
  }

  /**
   * 展开/折叠分类
   */
  function handleToggleExpand(categoryId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  /**
   * 选中分类
   * 通知父组件分类选择变化
   */
  function handleSelect(categoryId: string | null) {
    onCategoryChange(categoryId)
  }

  // ---- 是否正在提交（表单的 isSubmitting 状态）----
  const isFormSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex w-[260px] shrink-0 flex-col border-r">
      {/* ---- 顶部标题栏 ---- */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <FolderTree className="h-4 w-4" />
          分类管理
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleCreateClick}
          title="新建分类"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* ---- 搜索框 ---- */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索分类..."
            className="h-7 pl-7 pr-2 text-sm"
          />
        </div>
      </div>

      {/* ---- 分类列表 ---- */}
      <div className="flex-1 overflow-auto px-1">
        {isLoading ? (
          <div className="flex min-h-20 items-center justify-center text-xs text-muted-foreground">
            正在加载分类...
          </div>
        ) : error ? (
          <div className="flex min-h-20 items-center justify-center text-xs text-destructive">
            {error instanceof Error ? error.message : '分类加载失败'}
          </div>
        ) : (
          <>
            {/* "全部文章"选项 */}
            <div
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-sm py-1.5 px-2 text-sm transition-colors',
                'hover:bg-accent/5',
                selectedCategoryId === null && 'border-l-2 border-accent bg-accent/10',
                selectedCategoryId !== null && 'border-l-2 border-transparent'
              )}
              onClick={() => handleSelect(null)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleSelect(null)
                }
              }}
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm">全部文章</span>
              <span className="text-xs text-muted-foreground">{categories.length}</span>
            </div>

            {/* 分类树 */}
            {filteredTree.length === 0 && !searchKeyword.trim() ? (
              <div className="flex min-h-20 flex-col items-center justify-center gap-1 px-2 text-center">
                <p className="text-xs font-medium">暂无分类</p>
                <p className="text-xs text-muted-foreground">点击 + 创建分类</p>
              </div>
            ) : filteredTree.length === 0 && searchKeyword.trim() ? (
              <div className="flex min-h-20 items-center justify-center px-2 text-center text-xs text-muted-foreground">
                未找到匹配的分类
              </div>
            ) : (
              <CategoryTreeItems
                nodes={filteredTree}
                level={0}
                selectedCategoryId={selectedCategoryId}
                expandedIds={expandedIds}
                onSelect={handleSelect}
                onToggleExpand={handleToggleExpand}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </>
        )}

        {/* ---- 行内表单（新建/编辑） ---- */}
        {showForm && (
          <div className="mt-1 px-1">
            <CategoryInlineForm
              category={editingCategory ?? undefined}
              onSubmit={handleFormSubmit}
              onCancel={closeForm}
              isSubmitting={isFormSubmitting}
            />
          </div>
        )}
      </div>

      {/* ---- 底部分类计数 ---- */}
      <div className="border-t px-3 py-2 text-xs text-muted-foreground">
        共 {totalFilteredCount} 个分类
      </div>
    </div>
  )
}
