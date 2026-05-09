'use client'

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit3, FolderTree, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { ApiResponse } from '@/contracts/api-response.schema'
import {
  AdminBlogCategoryTreeResponseSchema,
  type AdminBlogCategory,
} from '@/contracts/dtos/admin/blog/categories.dto'

const LEVEL_CLASS_NAMES = ['ml-0', 'ml-4', 'ml-8', 'ml-12', 'ml-16'] as const

interface AdminBlogCategoryListProps {
  onEdit: (category: AdminBlogCategory) => void
  onCreate: () => void
}

type CategoryNode = AdminBlogCategory & {
  children: CategoryNode[]
}

type FlattenedCategoryNode = AdminBlogCategory & {
  level: number
}

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

async function readDeleteError(response: Response): Promise<{ message: string; code?: string }> {
  try {
    const json = (await response.json()) as ApiResponse<unknown>
    if (!json.success) {
      return { message: json.error.message, code: json.error.code }
    }
  } catch {
    // ignore
  }

  return { message: response.statusText || '请求失败' }
}

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

function flattenCategories(nodes: CategoryNode[], level = 0): FlattenedCategoryNode[] {
  const currentLevel = Math.min(level, LEVEL_CLASS_NAMES.length - 1)

  return nodes.flatMap((node) => [
    { ...node, level: currentLevel },
    ...flattenCategories(node.children, currentLevel + 1),
  ])
}

export function AdminBlogCategoryList({ onEdit, onCreate }: AdminBlogCategoryListProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery<AdminBlogCategory[]>({
    queryKey: ['admin', 'blog-categories'],
    queryFn: fetchBlogCategories,
  })

  const categories = Array.isArray(data) ? data : []
  const flattenedCategories = React.useMemo(
    () => flattenCategories(buildCategoryTree(categories)),
    [categories]
  )

  const deleteMutation = useMutation({
    mutationFn: async (category: AdminBlogCategory) => {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-categories'] })
      toast({ title: '删除成功', description: '博客分类已删除' })
    },
    onError: (error) => {
      const typedError = error as Error & { code?: string }
      toast({
        title: '删除失败',
        description: typedError.code === 'CONFLICT' ? '该分类下存在文章' : typedError.message,
        variant: 'destructive',
      })
    },
  })

  function handleDelete(category: AdminBlogCategory) {
    if (deleteMutation.isPending) {
      return
    }

    if (!confirm(`确定要删除分类“${category.name}”吗？`)) {
      return
    }

    deleteMutation.mutate(category)
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            分类列表
          </CardTitle>
          <CardDescription>支持分类层级展示、快速编辑与删除。</CardDescription>
        </div>

        <Button type="button" onClick={onCreate}>
          <Plus data-icon="inline-start" />
          新建分类
        </Button>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
            正在加载分类列表...
          </div>
        ) : error ? (
          <div className="flex min-h-40 items-center justify-center text-sm text-destructive">
            {error instanceof Error ? error.message : '分类列表加载失败'}
          </div>
        ) : flattenedCategories.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium">暂无博客分类</p>
            <p className="text-sm text-muted-foreground">点击右上角按钮创建第一条分类。</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>分类名称</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>文章数</TableHead>
                  <TableHead>排序</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flattenedCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className={cn('flex items-center gap-2', LEVEL_CLASS_NAMES[category.level])}>
                        {category.level > 0 ? (
                          <span className="text-muted-foreground">└</span>
                        ) : null}
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="font-medium">{category.name}</span>
                          {category.description ? (
                            <span className="truncate text-sm text-muted-foreground">
                              {category.description}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                    <TableCell>
                      <Badge variant={category.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {category.status === 'ACTIVE' ? '启用' : '停用'}
                      </Badge>
                    </TableCell>
                    <TableCell>{category.articleCount ?? 0}</TableCell>
                    <TableCell>{category.sortOrder}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => onEdit(category)}>
                          <Edit3 data-icon="inline-start" />
                          编辑
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(category)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 data-icon="inline-start" />
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
