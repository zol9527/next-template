'use client'

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import {
  BookText,
  FileText,
  FolderTree,
  Globe,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  SendHorizontal,
  Tag,
  X,
} from 'lucide-react'

import { RichTextEditor } from '../rich-text-editor'
import { MaterialPicker } from '../media/material-picker'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  AdminTabs,
  AdminTabsContent,
  AdminTabsList,
  AdminTabsTrigger,
} from '@/components/ui/admin-tabs'
import type { ApiResponse } from '@/contracts/api-response.schema'
import {
  AdminCreateArticleRequestSchema,
  AdminUpdateArticleRequestSchema,
  type AdminArticle,
  type AdminArticleStatus,
} from '@/contracts/dtos/admin/blog/articles.dto'
import {
  AdminCreateBlogTagRequestSchema,
  type AdminBlogTag,
  type AdminBlogTagListResponse,
} from '@/contracts/dtos/admin/blog/tags.dto'
import type {
  AdminBlogCategory,
  AdminBlogCategoryTreeResponse,
} from '@/contracts/dtos/admin/blog/categories.dto'
import type { AdminMediaAsset } from '@/contracts/dtos/admin/media-assets.dto'

interface AdminBlogArticleFormProps {
  articleId: string | null
  mode: 'idle' | 'create' | 'edit' | 'view'
  onSaved: () => void
  onCancel: () => void
}

type ArticleTab = 'basic' | 'content' | 'taxonomy' | 'seo' | 'cover'
type SubmitIntent = 'draft' | 'publish'

type FormState = {
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string
  categoryId: string
  metaTitle: string
  metaDescription: string
  ogImage: string
  tagIds: string[]
  status: AdminArticleStatus
}

type FormErrors = Partial<Record<keyof FormState, string>>

const DEFAULT_FORM_STATE: FormState = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImage: '',
  categoryId: '',
  metaTitle: '',
  metaDescription: '',
  ogImage: '',
  tagIds: [],
  status: 'DRAFT',
}

const EMPTY_VALUE = '__none__'

async function readApiErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as ApiResponse<unknown>
    if (!json.success) {
      return json.error.message
    }
  } catch {
    // ignore parse error and fall back to status text
  }

  return res.statusText || '请求失败'
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function mapValidationErrors(error: z.ZodError): FormErrors {
  return error.issues.reduce<FormErrors>((acc, issue) => {
    const field = issue.path[0]
    if (typeof field === 'string') {
      acc[field as keyof FormState] = issue.message
    }
    return acc
  }, {})
}

function getStatusLabel(status: AdminArticleStatus): string {
  if (status === 'PUBLISHED') return '已发布'
  if (status === 'ARCHIVED') return '已归档'
  return '草稿'
}

function buildCreatePayload(formState: FormState) {
  return {
    title: formState.title.trim(),
    content: normalizeOptionalText(formState.content),
    excerpt: normalizeOptionalText(formState.excerpt),
    coverImage: normalizeOptionalText(formState.coverImage),
    categoryId: formState.categoryId || null,
    metaTitle: normalizeOptionalText(formState.metaTitle),
    metaDescription: normalizeOptionalText(formState.metaDescription),
    ogImage: normalizeOptionalText(formState.ogImage),
    tagIds: formState.tagIds,
  }
}

function buildUpdatePayload(formState: FormState, intent: SubmitIntent) {
  return {
    title: formState.title.trim(),
    slug: normalizeOptionalText(formState.slug),
    content: normalizeOptionalText(formState.content),
    excerpt: normalizeOptionalText(formState.excerpt),
    coverImage: normalizeOptionalText(formState.coverImage),
    categoryId: formState.categoryId || null,
    metaTitle: normalizeOptionalText(formState.metaTitle),
    metaDescription: normalizeOptionalText(formState.metaDescription),
    ogImage: normalizeOptionalText(formState.ogImage),
    status: intent === 'publish' ? 'PUBLISHED' : 'DRAFT',
    tagIds: formState.tagIds,
  }
}

function MediaField({
  label,
  description,
  value,
  readOnly,
  error,
  pickerOpen,
  onPickerOpenChange,
  onChange,
}: {
  label: string
  description: string
  value: string
  readOnly: boolean
  error?: string
  pickerOpen: boolean
  onPickerOpenChange: (open: boolean) => void
  onChange: (nextValue: string) => void
}) {
  const handleSelect = React.useCallback(
    (assets: AdminMediaAsset[]) => {
      const selected = assets[0]
      if (selected?.url) {
        onChange(selected.url)
      }
    },
    [onChange],
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label className="text-sm font-medium text-foreground">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div
        className={cn(
          'flex flex-col gap-3 rounded-lg border bg-muted/10 p-4',
          error && 'border-destructive/60',
        )}
      >
        <div className="flex items-center gap-3 rounded-md border border-dashed border-border/60 bg-background px-3 py-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {value ? '已选择图片素材' : '暂未选择图片'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {value || '可从素材库中选择一张图片作为当前字段的资源'}
            </p>
          </div>
        </div>

        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onPickerOpenChange(true)}>
              <ImageIcon data-icon="inline-start" />
              {value ? '重新选择' : '从素材库选择'}
            </Button>
            {value && (
              <Button type="button" variant="ghost" onClick={() => onChange('')}>
                <X data-icon="inline-start" />
                清空
              </Button>
            )}
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <MaterialPicker
        open={pickerOpen}
        onOpenChange={onPickerOpenChange}
        onSelect={handleSelect}
        multiple={false}
        typeFilter={['image']}
      />
    </div>
  )
}

/**
Function: AdminBlogArticleForm

Description: 管理后台博客文章表单弹窗，支持新建、编辑、查看，以及富文本、分类、标签和 SEO 配置。

Parameters:
	articleId(string | null): 当前文章 ID，null 表示新建
	mode('idle' | 'create' | 'edit' | 'view'): 当前表单模式
	onSaved(() => void): 保存成功回调
	onCancel(() => void): 关闭弹窗回调

Returns:
	element(React.ReactElement): 博客文章表单弹窗
*/
export function AdminBlogArticleForm({
  articleId,
  mode,
  onSaved,
  onCancel,
}: AdminBlogArticleFormProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const isOpen = mode !== 'idle'
  const editing = mode === 'edit'
  const creating = mode === 'create'
  const viewing = mode === 'view'
  const [activeTab, setActiveTab] = React.useState<ArticleTab>('basic')
  const [formState, setFormState] = React.useState<FormState>(DEFAULT_FORM_STATE)
  const [errors, setErrors] = React.useState<FormErrors>({})
  const [tagInput, setTagInput] = React.useState('')
  const [coverPickerOpen, setCoverPickerOpen] = React.useState(false)
  const [ogPickerOpen, setOgPickerOpen] = React.useState(false)

  const { data: articleData, isLoading: articleLoading } = useQuery<AdminArticle>({
    queryKey: ['admin', 'blog-articles', articleId],
    queryFn: async () => {
      if (!articleId) {
        throw new Error('文章 ID 不能为空')
      }

      const res = await fetch(`/api/v1/admin/blog/articles/${articleId}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res))
      }

      const json = (await res.json()) as ApiResponse<AdminArticle>
      if (!json.success) {
        throw new Error(json.error.message)
      }

      return json.data
    },
    enabled: Boolean(articleId) && (editing || viewing),
  })

  const categoriesQuery = useQuery<AdminBlogCategoryTreeResponse>({
    queryKey: ['admin', 'blog-categories'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/blog/categories', {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res))
      }

      const json = (await res.json()) as ApiResponse<AdminBlogCategoryTreeResponse>
      if (!json.success) {
        throw new Error(json.error.message)
      }

      return json.data
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  })

  const tagsQuery = useQuery<AdminBlogTagListResponse>({
    queryKey: ['admin', 'blog-tags'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/blog/tags', {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res))
      }

      const json = (await res.json()) as ApiResponse<AdminBlogTagListResponse>
      if (!json.success) {
        throw new Error(json.error.message)
      }

      return json.data
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  })

  React.useEffect(() => {
    if (!isOpen || creating) {
      setFormState(DEFAULT_FORM_STATE)
      setErrors({})
      setTagInput('')
      setActiveTab('basic')
    }
  }, [creating, isOpen])

  React.useEffect(() => {
    if (!articleData) {
      return
    }

    setFormState({
      title: articleData.title,
      slug: articleData.slug ?? '',
      excerpt: articleData.excerpt ?? '',
      content: articleData.content ?? '',
      coverImage: articleData.coverImage ?? '',
      categoryId: articleData.categoryId ?? '',
      metaTitle: articleData.metaTitle ?? '',
      metaDescription: articleData.metaDescription ?? '',
      ogImage: articleData.ogImage ?? '',
      tagIds: articleData.tagIds ?? [],
      status: articleData.status,
    })
    setErrors({})
  }, [articleData])

  const categories = categoriesQuery.data?.items ?? []
  const tags = tagsQuery.data?.items ?? []

  const tagsById = React.useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag] satisfies [string, AdminBlogTag])),
    [tags],
  )

  const matchingTags = React.useMemo(() => {
    const keyword = tagInput.trim().toLowerCase()

    return tags.filter((tag) => {
      if (formState.tagIds.includes(tag.id)) {
        return false
      }

      if (keyword === '') {
        return true
      }

      return tag.name.toLowerCase().includes(keyword)
    })
  }, [formState.tagIds, tagInput, tags])

  const exactMatchedTag = React.useMemo(() => {
    const keyword = tagInput.trim().toLowerCase()
    if (!keyword) {
      return null
    }

    return tags.find((tag) => tag.name.toLowerCase() === keyword) ?? null
  }, [tagInput, tags])

  const isMutating = React.useMemo(() => false, [])

  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const parsed = AdminCreateBlogTagRequestSchema.safeParse({ name: name.trim() })
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? '标签名称不合法')
      }

      const res = await fetch('/api/v1/admin/blog/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(parsed.data),
      })

      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res))
      }

      const json = (await res.json()) as ApiResponse<AdminBlogTag>
      if (!json.success) {
        throw new Error(json.error.message)
      }

      return json.data
    },
    onSuccess: (createdTag) => {
      queryClient.setQueryData<AdminBlogTagListResponse | undefined>(['admin', 'blog-tags'], (old) => {
        if (!old) {
          return { items: [createdTag] }
        }

        if (old.items.some((item) => item.id === createdTag.id)) {
          return old
        }

        return {
          items: [...old.items, createdTag],
        }
      })

      setFormState((prev) => ({
        ...prev,
        tagIds: prev.tagIds.includes(createdTag.id) ? prev.tagIds : [...prev.tagIds, createdTag.id],
      }))
      setTagInput('')
      toast({ title: '标签已创建', description: `已添加标签“${createdTag.name}”` })
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : '创建标签失败'
      toast({ title: '创建标签失败', description: message, variant: 'destructive' })
    },
  })

  const saveArticleMutation = useMutation({
    mutationFn: async (intent: SubmitIntent) => {
      if (editing && !articleId) {
        throw new Error('文章 ID 不能为空')
      }

      if (editing) {
        const parsed = AdminUpdateArticleRequestSchema.safeParse(buildUpdatePayload(formState, intent))
        if (!parsed.success) {
          throw parsed.error
        }

        const patchRes = await fetch(`/api/v1/admin/blog/articles/${articleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(parsed.data),
        })

        if (!patchRes.ok) {
          throw new Error(await readApiErrorMessage(patchRes))
        }

        const patchJson = (await patchRes.json()) as ApiResponse<AdminArticle>
        if (!patchJson.success) {
          throw new Error(patchJson.error.message)
        }

        let result = patchJson.data

        if (intent === 'publish') {
          const publishRes = await fetch(`/api/v1/admin/blog/articles/${articleId}/publish`, {
            method: 'POST',
            credentials: 'include',
          })

          if (!publishRes.ok) {
            throw new Error(await readApiErrorMessage(publishRes))
          }

          const publishJson = (await publishRes.json()) as ApiResponse<AdminArticle>
          if (!publishJson.success) {
            throw new Error(publishJson.error.message)
          }

          result = publishJson.data
        }

        return { article: result, intent }
      }

      const parsed = AdminCreateArticleRequestSchema.safeParse(buildCreatePayload(formState))
      if (!parsed.success) {
        throw parsed.error
      }

      const createRes = await fetch('/api/v1/admin/blog/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(parsed.data),
      })

      if (!createRes.ok) {
        throw new Error(await readApiErrorMessage(createRes))
      }

      const createJson = (await createRes.json()) as ApiResponse<AdminArticle>
      if (!createJson.success) {
        throw new Error(createJson.error.message)
      }

      let result = createJson.data

      if (intent === 'publish') {
        const publishRes = await fetch(`/api/v1/admin/blog/articles/${createJson.data.id}/publish`, {
          method: 'POST',
          credentials: 'include',
        })

        if (!publishRes.ok) {
          throw new Error(await readApiErrorMessage(publishRes))
        }

        const publishJson = (await publishRes.json()) as ApiResponse<AdminArticle>
        if (!publishJson.success) {
          throw new Error(publishJson.error.message)
        }

        result = publishJson.data
      }

      return { article: result, intent }
    },
    onSuccess: ({ article, intent }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-articles'] })
      queryClient.setQueryData(['admin', 'blog-articles', article.id], article)
      toast({
        title: intent === 'publish' ? '文章已发布' : '文章已保存',
        description: intent === 'publish' ? '文章内容已更新并发布。' : '文章草稿已成功保存。',
      })
      onSaved()
    },
    onError: (error) => {
      if (error instanceof z.ZodError) {
        setErrors(mapValidationErrors(error))
        toast({
          title: '表单校验失败',
          description: '请检查标红字段后重新提交。',
          variant: 'destructive',
        })
        return
      }

      const message = error instanceof Error ? error.message : '保存文章失败'
      toast({ title: '保存失败', description: message, variant: 'destructive' })
    },
  })

  const isSubmitting = saveArticleMutation.isPending || createTagMutation.isPending || isMutating

  const setFieldValue = React.useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }))
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    },
    [],
  )

  const handleDialogOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open && !isSubmitting) {
        onCancel()
      }
    },
    [isSubmitting, onCancel],
  )

  const handleTagToggle = React.useCallback((tagId: string) => {
    setFormState((prev) => {
      const exists = prev.tagIds.includes(tagId)
      return {
        ...prev,
        tagIds: exists ? prev.tagIds.filter((item) => item !== tagId) : [...prev.tagIds, tagId],
      }
    })
  }, [])

  const handleTagSubmit = React.useCallback(() => {
    const keyword = tagInput.trim()
    if (!keyword || viewing || createTagMutation.isPending) {
      return
    }

    if (exactMatchedTag) {
      if (!formState.tagIds.includes(exactMatchedTag.id)) {
        handleTagToggle(exactMatchedTag.id)
      }
      setTagInput('')
      return
    }

    createTagMutation.mutate(keyword)
  }, [createTagMutation, exactMatchedTag, formState.tagIds, handleTagToggle, tagInput, viewing])

  const handleSubmit = React.useCallback(
    (intent: SubmitIntent) => {
      setErrors({})
      saveArticleMutation.mutate(intent)
    },
    [saveArticleMutation],
  )

  const dialogTitle = viewing ? '查看文章' : editing ? '编辑文章' : '新建文章'
  const showLoadingState = (editing || viewing) && articleLoading

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        size="xl"
        showCloseButton={false}
        disableAnimation
        className="max-h-[90vh] overflow-hidden p-0"
        onPointerDownOutside={(event) => {
          const target = event.target as HTMLElement
          if (target.closest('[data-dialog-content]')) {
            return
          }
        }}
      >
        <DialogHeader className="border-b px-8 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookText className="h-6 w-6" />
              </div>
              <div className="flex flex-col gap-1">
                <DialogTitle className="text-2xl font-semibold">
                  {dialogTitle}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {viewing
                    ? '查看文章的正文、分类、标签与 SEO 配置。'
                    : '通过标签页完成文章内容、封面、分类和 SEO 的配置。'}
                </p>
              </div>
            </div>

            {(editing || viewing) && (
              <Badge variant={formState.status === 'PUBLISHED' ? 'success' : 'secondary'}>
                {getStatusLabel(formState.status)}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="border-b px-8 py-4">
          <AdminTabs value={activeTab} onValueChange={(value) => setActiveTab(value as ArticleTab)}>
            <AdminTabsList className="flex h-auto w-full flex-wrap gap-2 bg-transparent p-0">
              <AdminTabsTrigger value="basic">基本内容</AdminTabsTrigger>
              <AdminTabsTrigger value="content">正文内容</AdminTabsTrigger>
              <AdminTabsTrigger value="taxonomy">分类标签</AdminTabsTrigger>
              <AdminTabsTrigger value="seo">SEO 设置</AdminTabsTrigger>
              <AdminTabsTrigger value="cover">封面图片</AdminTabsTrigger>
            </AdminTabsList>
          </AdminTabs>
        </div>

        <ScrollArea className="h-[60vh]">
          <div className="px-8 py-6">
            {showLoadingState ? (
              <div className="flex flex-col gap-6">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-72 w-full" />
              </div>
            ) : (
              <AdminTabs value={activeTab} className="w-full">
                <AdminTabsContent value="basic" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5 text-primary" />
                        基本内容
                      </CardTitle>
                      <CardDescription>
                        设置文章标题、摘要与 URL 标识。
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="article-title" className="text-sm font-medium text-foreground">
                            文章标题
                          </Label>
                          <Input
                            id="article-title"
                            size="lg"
                            value={formState.title}
                            onChange={(event) => setFieldValue('title', event.target.value)}
                            disabled={viewing || isSubmitting}
                            aria-invalid={Boolean(errors.title)}
                            placeholder="请输入文章标题"
                            className={cn(errors.title && 'border-destructive/60')}
                          />
                          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                        </div>

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="article-slug" className="text-sm font-medium text-foreground">
                              Slug
                            </Label>
                            <Input
                              id="article-slug"
                              value={formState.slug}
                              onChange={(event) => setFieldValue('slug', event.target.value)}
                              disabled={viewing || creating || isSubmitting}
                              aria-invalid={Boolean(errors.slug)}
                              placeholder={creating ? '新建后自动生成，可在编辑时调整' : '请输入文章 slug'}
                              className={cn(errors.slug && 'border-destructive/60')}
                            />
                            {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
                            {creating && (
                              <p className="text-xs text-muted-foreground">
                                新建文章时将由服务端自动生成 slug，保存后可手动修改。
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            <Label className="text-sm font-medium text-foreground">当前状态</Label>
                            <div className="flex min-h-10 items-center rounded-md border bg-muted/10 px-3 text-sm text-muted-foreground">
                              {getStatusLabel(formState.status)}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label htmlFor="article-excerpt" className="text-sm font-medium text-foreground">
                            摘要
                          </Label>
                          <Textarea
                            id="article-excerpt"
                            value={formState.excerpt}
                            onChange={(event) => setFieldValue('excerpt', event.target.value)}
                            disabled={viewing || isSubmitting}
                            aria-invalid={Boolean(errors.excerpt)}
                            placeholder="请输入文章摘要，便于列表与搜索结果展示"
                            className={cn('min-h-32', errors.excerpt && 'border-destructive/60')}
                          />
                          {errors.excerpt && <p className="text-xs text-destructive">{errors.excerpt}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </AdminTabsContent>

                <AdminTabsContent value="content" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BookText className="h-5 w-5 text-primary" />
                        正文内容
                      </CardTitle>
                      <CardDescription>
                        使用现有 TipTap 编辑器编写文章正文。
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        <RichTextEditor
                          value={formState.content}
                          onChange={(value) => setFieldValue('content', value)}
                          readOnly={viewing || isSubmitting}
                        />
                        {errors.content && <p className="text-xs text-destructive">{errors.content}</p>}
                      </div>
                    </CardContent>
                  </Card>
                </AdminTabsContent>

                <AdminTabsContent value="taxonomy" className="mt-0">
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <FolderTree className="h-5 w-5 text-primary" />
                          文章分类
                        </CardTitle>
                        <CardDescription>
                          选择文章所属分类，便于前台归档展示。
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-2">
                          <Label className="text-sm font-medium text-foreground">分类</Label>
                          <Select
                            value={formState.categoryId || EMPTY_VALUE}
                            onValueChange={(value) => setFieldValue('categoryId', value === EMPTY_VALUE ? '' : value)}
                            disabled={viewing || isSubmitting || categoriesQuery.isLoading}
                          >
                            <SelectTrigger aria-invalid={Boolean(errors.categoryId)}>
                              <SelectValue placeholder="请选择文章分类" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectItem value={EMPTY_VALUE}>未分类</SelectItem>
                                {categories.map((category: AdminBlogCategory) => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId}</p>}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Tag className="h-5 w-5 text-primary" />
                          标签管理
                        </CardTitle>
                        <CardDescription>
                          可选择已有标签，也可以直接输入新标签名称并创建。
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-6">
                          <div className="flex flex-col gap-3">
                            <Label className="text-sm font-medium text-foreground">已选标签</Label>
                            <div className="flex min-h-16 flex-wrap gap-2 rounded-lg border bg-muted/10 p-3">
                              {formState.tagIds.length === 0 && (
                                <p className="text-sm text-muted-foreground">暂未选择标签</p>
                              )}
                              {formState.tagIds.map((tagId) => {
                                const tag = tagsById.get(tagId)

                                return (
                                  <Badge key={tagId} variant="secondary" className="gap-1 px-3 py-1">
                                    {tag?.name ?? tagId}
                                    {!viewing && (
                                      <button
                                        type="button"
                                        onClick={() => handleTagToggle(tagId)}
                                        className="inline-flex items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    )}
                                  </Badge>
                                )
                              })}
                            </div>
                          </div>

                          {!viewing && (
                            <div className="flex flex-col gap-3">
                              <Label htmlFor="article-tags" className="text-sm font-medium text-foreground">
                                添加或创建标签
                              </Label>
                              <div className="flex flex-col gap-3 rounded-lg border bg-muted/10 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                  <Input
                                    id="article-tags"
                                    value={tagInput}
                                    onChange={(event) => setTagInput(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') {
                                        event.preventDefault()
                                        handleTagSubmit()
                                      }
                                    }}
                                    placeholder="输入标签名，回车快速选择或创建"
                                    disabled={isSubmitting}
                                  />
                                  <Button type="button" variant="outline" onClick={handleTagSubmit} disabled={!tagInput.trim() || isSubmitting}>
                                    {createTagMutation.isPending ? (
                                      <Loader2 className="animate-spin" data-icon="inline-start" />
                                    ) : (
                                      <Plus data-icon="inline-start" />
                                    )}
                                    {exactMatchedTag ? '加入标签' : '创建标签'}
                                  </Button>
                                </div>

                                <Separator />

                                <div className="flex flex-col gap-3">
                                  <p className="text-sm font-medium text-foreground">可选标签</p>
                                  <div className="flex flex-wrap gap-2">
                                    {matchingTags.length === 0 ? (
                                      <p className="text-sm text-muted-foreground">没有更多可选标签，可直接创建新标签。</p>
                                    ) : (
                                      matchingTags.map((tag) => (
                                        <Button
                                          key={tag.id}
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleTagToggle(tag.id)}
                                          disabled={isSubmitting}
                                        >
                                          <Tag data-icon="inline-start" />
                                          {tag.name}
                                        </Button>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </AdminTabsContent>

                <AdminTabsContent value="seo" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Globe className="h-5 w-5 text-primary" />
                        SEO 设置
                      </CardTitle>
                      <CardDescription>
                        配置搜索引擎标题、描述与社交分享图。
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-6">
                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="article-meta-title" className="text-sm font-medium text-foreground">
                              Meta Title
                            </Label>
                            <Input
                              id="article-meta-title"
                              value={formState.metaTitle}
                              onChange={(event) => setFieldValue('metaTitle', event.target.value)}
                              disabled={viewing || isSubmitting}
                              aria-invalid={Boolean(errors.metaTitle)}
                              placeholder="搜索引擎显示标题"
                              className={cn(errors.metaTitle && 'border-destructive/60')}
                            />
                            {errors.metaTitle && <p className="text-xs text-destructive">{errors.metaTitle}</p>}
                          </div>

                          <div className="flex flex-col gap-2">
                            <Label htmlFor="article-meta-description" className="text-sm font-medium text-foreground">
                              Meta Description
                            </Label>
                            <Textarea
                              id="article-meta-description"
                              value={formState.metaDescription}
                              onChange={(event) => setFieldValue('metaDescription', event.target.value)}
                              disabled={viewing || isSubmitting}
                              aria-invalid={Boolean(errors.metaDescription)}
                              placeholder="搜索结果中的摘要描述"
                              className={cn('min-h-28', errors.metaDescription && 'border-destructive/60')}
                            />
                            {errors.metaDescription && <p className="text-xs text-destructive">{errors.metaDescription}</p>}
                          </div>
                        </div>

                        <MediaField
                          label="OG Image"
                          description="社交媒体分享时展示的预览图片。"
                          value={formState.ogImage}
                          readOnly={viewing || isSubmitting}
                          error={errors.ogImage}
                          pickerOpen={ogPickerOpen}
                          onPickerOpenChange={setOgPickerOpen}
                          onChange={(value) => setFieldValue('ogImage', value)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </AdminTabsContent>

                <AdminTabsContent value="cover" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <ImageIcon className="h-5 w-5 text-primary" />
                        封面图片
                      </CardTitle>
                      <CardDescription>
                        为文章设置列表页与详情页使用的主封面图。
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <MediaField
                        label="封面图"
                        description="建议选择清晰的横版图片，用于文章列表和详情头图展示。"
                        value={formState.coverImage}
                        readOnly={viewing || isSubmitting}
                        error={errors.coverImage}
                        pickerOpen={coverPickerOpen}
                        onPickerOpenChange={setCoverPickerOpen}
                        onChange={(value) => setFieldValue('coverImage', value)}
                      />
                    </CardContent>
                  </Card>
                </AdminTabsContent>
              </AdminTabs>
            )}
          </div>
        </ScrollArea>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t px-8 py-5">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            <X data-icon="inline-start" />
            {viewing ? '关闭' : '取消'}
          </Button>

          {!viewing && (
            <>
              <Button type="button" variant="outline" onClick={() => handleSubmit('draft')} disabled={isSubmitting || showLoadingState}>
                {saveArticleMutation.isPending ? (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                ) : (
                  <Save data-icon="inline-start" />
                )}
                保存草稿
              </Button>
              <Button type="button" onClick={() => handleSubmit('publish')} disabled={isSubmitting || showLoadingState}>
                {saveArticleMutation.isPending ? (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                ) : (
                  <SendHorizontal data-icon="inline-start" />
                )}
                发布文章
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
