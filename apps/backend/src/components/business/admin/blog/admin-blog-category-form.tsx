'use client'

import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import type { ApiResponse } from '@/contracts/api-response.schema'
import {
  AdminBlogCategorySchema,
  AdminBlogCategoryStatusSchema,
  AdminCreateBlogCategoryRequestSchema,
  AdminUpdateBlogCategoryRequestSchema,
  type AdminBlogCategory,
} from '@/contracts/dtos/admin/blog/categories.dto'

const ROOT_VALUE = '__root__'
const LEVEL_CLASS_NAMES = ['ml-0', 'ml-4', 'ml-8', 'ml-12', 'ml-16'] as const

type FlattenedCategoryOption = {
  id: string
  name: string
  level: number
}

interface AdminBlogCategoryFormProps {
  category?: AdminBlogCategory | null
  open: boolean
  onSaved: () => void
  onCancel: () => void
  categories: AdminBlogCategory[]
}

function readIssueMap(error: unknown): Record<string, string> {
  if (!(error instanceof Error)) {
    return {}
  }

  try {
    return JSON.parse(error.message) as Record<string, string>
  } catch {
    return {}
  }
}

async function readApiErrorMessage(response: Response): Promise<{ message: string; code?: string }> {
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

function buildCategoryTreeOptions(
  categories: AdminBlogCategory[],
  excludedIds: Set<string> = new Set(),
  parentId: string | null = null,
  level = 0
): FlattenedCategoryOption[] {
  const currentLevel = Math.min(level, LEVEL_CLASS_NAMES.length - 1)
  const nodes = categories
    .filter((item) => item.parentId === parentId && !excludedIds.has(item.id))
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder
      }
      return left.name.localeCompare(right.name, 'zh-CN')
    })

  return nodes.flatMap((item) => [
    { id: item.id, name: item.name, level: currentLevel },
    ...buildCategoryTreeOptions(categories, excludedIds, item.id, currentLevel + 1),
  ])
}

function collectDescendantIds(categories: AdminBlogCategory[], categoryId: string): Set<string> {
  const descendants = new Set<string>()
  const queue = [categoryId]

  while (queue.length > 0) {
    const currentId = queue.shift()
    if (!currentId) {
      continue
    }

    for (const item of categories) {
      if (item.parentId === currentId && !descendants.has(item.id)) {
        descendants.add(item.id)
        queue.push(item.id)
      }
    }
  }

  return descendants
}

export function AdminBlogCategoryForm({
  category,
  open,
  onSaved,
  onCancel,
  categories,
}: AdminBlogCategoryFormProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const isEditing = Boolean(category)

  const [name, setName] = React.useState('')
  const [slug, setSlug] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [parentId, setParentId] = React.useState(ROOT_VALUE)
  const [sortOrder, setSortOrder] = React.useState('0')
  const [status, setStatus] = React.useState<'ACTIVE' | 'INACTIVE'>('ACTIVE')
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const selectableCategories = React.useMemo(() => {
    if (!category) {
      return buildCategoryTreeOptions(categories)
    }

    const excludedIds = collectDescendantIds(categories, category.id)
    excludedIds.add(category.id)
    return buildCategoryTreeOptions(categories, excludedIds)
  }, [categories, category])

  React.useEffect(() => {
    if (!open) {
      setErrors({})
      return
    }

    setName(category?.name ?? '')
    setSlug(category?.slug ?? '')
    setDescription(category?.description ?? '')
    setParentId(category?.parentId ?? ROOT_VALUE)
    setSortOrder(String(category?.sortOrder ?? 0))
    setStatus(category?.status ?? 'ACTIVE')
    setErrors({})
  }, [category, open])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const normalizedSortOrder = sortOrder.trim() === '' ? 0 : Number(sortOrder)
      const normalizedParentId = parentId === ROOT_VALUE ? null : parentId

      if (!Number.isInteger(normalizedSortOrder)) {
        throw new Error(JSON.stringify({ sortOrder: '排序必须为整数' }))
      }

      const payload = isEditing
        ? {
            name: name.trim(),
            slug: slug.trim() === '' ? null : slug.trim(),
            description: description.trim() === '' ? null : description.trim(),
            parentId: normalizedParentId,
            sortOrder: normalizedSortOrder,
            status,
          }
        : {
            name: name.trim(),
            slug: slug.trim() === '' ? undefined : slug.trim(),
            description: description.trim() === '' ? null : description.trim(),
            parentId: normalizedParentId,
            sortOrder: normalizedSortOrder,
          }

      const parsed = isEditing
        ? AdminUpdateBlogCategoryRequestSchema.safeParse(payload)
        : AdminCreateBlogCategoryRequestSchema.safeParse(payload)

      if (!parsed.success) {
        const fieldErrors = parsed.error.issues.reduce<Record<string, string>>((accumulator, issue) => {
          const key = issue.path[0]?.toString() ?? 'form'
          accumulator[key] = issue.message
          return accumulator
        }, {})
        throw new Error(JSON.stringify(fieldErrors))
      }

      const response = await fetch(
        isEditing ? `/api/v1/admin/blog/categories/${category!.id}` : '/api/v1/admin/blog/categories',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(parsed.data),
        }
      )

      if (!response.ok) {
        const apiError = await readApiErrorMessage(response)
        throw new Error(apiError.message)
      }

      const json = (await response.json()) as ApiResponse<unknown>
      if (!json.success) {
        throw new Error(json.error.message)
      }

      const result = AdminBlogCategorySchema.safeParse(json.data)
      if (!result.success) {
        throw new Error('响应数据格式不符合预期')
      }

      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-categories'] })
      toast({
        title: isEditing ? '保存成功' : '创建成功',
        description: isEditing ? '分类信息已更新' : '博客分类已创建',
      })
      onSaved()
    },
    onError: (error) => {
      const fieldErrors = readIssueMap(error)
      setErrors(fieldErrors)
      toast({
        title: isEditing ? '保存失败' : '创建失败',
        description:
          Object.keys(fieldErrors).length > 0
            ? '请检查表单中的错误提示'
            : error instanceof Error
              ? error.message
              : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  function handleCancel() {
    if (saveMutation.isPending) {
      return
    }

    setErrors({})
    onCancel()
  }

  function getError(field: string) {
    return errors[field]
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? handleCancel() : undefined)}>
      <DialogContent size="sm" disableAnimation>
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑博客分类' : '新建博客分类'}</DialogTitle>
          <DialogDescription>
            维护博客分类的名称、层级与排序，列表会在保存后自动刷新。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="blog-category-name">分类名称</Label>
              <Input
                id="blog-category-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={Boolean(getError('name'))}
                placeholder="例如：前端工程"
              />
              {getError('name') ? <p className="text-sm text-destructive">{getError('name')}</p> : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="blog-category-slug">Slug</Label>
              <Input
                id="blog-category-slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                aria-invalid={Boolean(getError('slug'))}
                placeholder="frontend-engineering"
              />
              <p className="text-sm text-muted-foreground">留空时由服务端自动生成。</p>
              {getError('slug') ? <p className="text-sm text-destructive">{getError('slug')}</p> : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="blog-category-description">分类描述</Label>
            <Textarea
              id="blog-category-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              aria-invalid={Boolean(getError('description'))}
              placeholder="补充说明该分类的内容范围"
            />
            {getError('description') ? (
              <p className="text-sm text-destructive">{getError('description')}</p>
            ) : null}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="blog-category-parent">父分类</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger id="blog-category-parent" aria-invalid={Boolean(getError('parentId'))}>
                  <SelectValue placeholder="选择父分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>分类层级</SelectLabel>
                    <SelectItem value={ROOT_VALUE}>顶级分类</SelectItem>
                    {selectableCategories.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        <span className={LEVEL_CLASS_NAMES[item.level]}>{item.level > 0 ? `└ ${item.name}` : item.name}</span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {getError('parentId') ? <p className="text-sm text-destructive">{getError('parentId')}</p> : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="blog-category-sort-order">排序</Label>
              <Input
                id="blog-category-sort-order"
                type="number"
                inputMode="numeric"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                aria-invalid={Boolean(getError('sortOrder'))}
              />
              {getError('sortOrder') ? (
                <p className="text-sm text-destructive">{getError('sortOrder')}</p>
              ) : null}
            </div>
          </div>

          {isEditing ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="blog-category-status">状态</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(AdminBlogCategoryStatusSchema.parse(value))}
              >
                <SelectTrigger id="blog-category-status" aria-invalid={Boolean(getError('status'))}>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>发布状态</SelectLabel>
                    <SelectItem value="ACTIVE">启用</SelectItem>
                    <SelectItem value="INACTIVE">停用</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {getError('status') ? <p className="text-sm text-destructive">{getError('status')}</p> : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={saveMutation.isPending}>
            取消
          </Button>
          <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? '保存中...' : isEditing ? '保存分类' : '创建分类'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
