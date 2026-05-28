'use client'

import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ChevronDown,
  ImageIcon,
  Plus,
  X,
  Loader2,
} from 'lucide-react'

import { MaterialPicker } from '@/components/business/admin/media/material-picker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
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
import { cn } from '@/lib/utils'
import { parseApiResponse } from '@/lib/api/parse-response'
import type { AdminArticleStatus } from '@/contracts/dtos/admin/blog/articles.dto'
import type {
  AdminBlogCategory,
  AdminBlogCategoryTreeResponse,
} from '@/contracts/dtos/admin/blog/categories.dto'
import type { AdminBlogTag, AdminBlogTagListResponse } from '@/contracts/dtos/admin/blog/tags.dto'
import type { AdminMediaAsset } from '@/contracts/dtos/admin/media-assets.dto'

// ==================== 类型定义 ====================

/**
 * 表单状态类型
 * 包含文章编辑器所有可编辑字段的类型定义
 */
export type FormState = {
  /** 文章标题 */
  title: string
  /** URL 友好标识符 */
  slug: string
  /** 文章摘要 */
  excerpt: string
  /** 文章正文（HTML） */
  content: string
  /** 封面图片 URL */
  coverImage: string
  /** 分类 ID */
  categoryId: string
  /** SEO Meta 标题 */
  metaTitle: string
  /** SEO Meta 描述 */
  metaDescription: string
  /** OG 图片 URL */
  ogImage: string
  /** 关联标签 ID 列表 */
  tagIds: string[]
  /** 文章状态 */
  status: AdminArticleStatus
}

/**
 * 编辑器设置面板属性
 */
interface EditorSettingsPanelProps {
  /** 当前表单状态 */
  form: FormState
  /** 表单变更回调 */
  onFormChange: (updates: Partial<FormState>) => void
}

// ==================== 组件 ====================

/**
 * Function: EditorSettingsPanel
 *
 * Description: 文章编辑器右侧设置面板，包含封面图、分类、标签、Slug、SEO 和发布设置
 *
 * Parameters:
 *     form(FormState): 当前表单状态
 *     onFormChange(function): 表单字段变更回调
 *
 * Returns:
 *     element(React.ReactElement): 设置面板 UI
 */
export function EditorSettingsPanel({ form, onFormChange }: EditorSettingsPanelProps) {
  const { toast } = useToast()

  // 素材选择器弹窗状态
  const [isCoverPickerOpen, setIsCoverPickerOpen] = React.useState(false)
  // 新标签输入状态
  const [newTagName, setNewTagName] = React.useState('')
  // SEO 设置折叠状态
  const [isSeoExpanded, setIsSeoExpanded] = React.useState(false)

  // ==================== 数据查询 ====================

  /**
   * 获取分类列表
   * 用于分类下拉选择器
   */
  const categoriesQuery = useQuery({
    queryKey: ['admin-blog-categories'],
    queryFn: async () => {
      const response = await fetch('/api/v1/admin/blog/categories')
      return parseApiResponse<{ items: AdminBlogCategory[] }>(response)
    },
  })

  /**
   * 获取标签列表
   * 用于标签选择和已选标签显示
   */
  const tagsQuery = useQuery({
    queryKey: ['admin-blog-tags'],
    queryFn: async () => {
      const response = await fetch('/api/v1/admin/blog/tags')
      return parseApiResponse<{ items: AdminBlogTag[] }>(response)
    },
  })

  /**
   * 创建新标签 mutation
   * 用于在设置面板中内联创建标签
   */
  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch('/api/v1/admin/blog/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      return parseApiResponse<AdminBlogTag>(response)
    },
    onSuccess: (newTag) => {
      // 将新标签添加到已选标签列表中
      onFormChange({ tagIds: [...form.tagIds, newTag.id] })
      setNewTagName('')
      // 使缓存失效，刷新标签列表
      tagsQuery.refetch()
      toast({ title: '标签创建成功' })
    },
    onError: (error) => {
      toast({ title: '创建标签失败', description: error.message, variant: 'destructive' })
    },
  })

  // ==================== 事件处理 ====================

  /**
   * 处理封面图选择
   * 从素材选择器中选取图片后更新封面
   */
  const handleCoverSelect = React.useCallback(
    (assets: AdminMediaAsset[]) => {
      if (assets.length > 0) {
        const asset = assets[0]
        // 优先使用 API 返回的 url 字段
        const url = asset.url || `/api/v1/public/files/${asset.objectKey}`
        onFormChange({ coverImage: url })
      }
      setIsCoverPickerOpen(false)
    },
    [onFormChange],
  )

  /**
   * 处理标签添加（输入已有标签名称时）
   */
  const handleAddTag = React.useCallback(() => {
    const trimmedName = newTagName.trim()
    if (!trimmedName) return

    // 先在已有标签中查找匹配项
    const existingTag = tagsQuery.data?.items.find(
      (tag) => tag.name.toLowerCase() === trimmedName.toLowerCase(),
    )

    if (existingTag) {
      // 已有标签：直接添加到选中列表
      if (form.tagIds.includes(existingTag.id)) {
        toast({ title: '该标签已添加', variant: 'destructive' })
        return
      }
      onFormChange({ tagIds: [...form.tagIds, existingTag.id] })
      setNewTagName('')
    } else {
      // 不存在：创建新标签
      createTagMutation.mutate(trimmedName)
    }
  }, [newTagName, tagsQuery.data, form.tagIds, onFormChange, createTagMutation, toast])

  /**
   * 移除已选标签
   */
  const handleRemoveTag = React.useCallback(
    (tagId: string) => {
      onFormChange({ tagIds: form.tagIds.filter((id) => id !== tagId) })
    },
    [form.tagIds, onFormChange],
  )

  // 获取已选标签的完整信息（用于显示标签名称）
  const selectedTags = React.useMemo(
    () => (tagsQuery.data?.items ?? []).filter((tag) => form.tagIds.includes(tag.id)),
    [tagsQuery.data?.items, form.tagIds],
  )

  // ==================== 渲染 ====================

  return (
    <div className="w-[300px] shrink-0 border-l p-6 overflow-auto space-y-6">
      {/* ========== 封面图设置 ========== */}
      <div className="space-y-2">
        <Label>封面图</Label>
        {form.coverImage ? (
          <div className="relative aspect-video rounded-md overflow-hidden border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.coverImage}
              alt="封面图"
              className="w-full h-full object-cover"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6"
              onClick={() => onFormChange({ coverImage: '' })}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setIsCoverPickerOpen(true)}
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          选择图片
        </Button>
      </div>

      {/* ========== 分类设置 ========== */}
      <div className="space-y-2">
        <Label>分类</Label>
        <Select
          value={form.categoryId}
          onValueChange={(value) => onFormChange({ categoryId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder={categoriesQuery.isLoading ? '加载中...' : '选择分类'} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>文章分类</SelectLabel>
              {(categoriesQuery.data?.items ?? []).map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* ========== 标签设置 ========== */}
      <div className="space-y-2">
        <Label>标签</Label>
        {/* 已选标签展示 */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedTags.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="gap-1">
                {tag.name}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag.id)}
                  className="ml-0.5 rounded-full hover:bg-foreground/20 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        {/* 新标签输入 */}
        <div className="flex gap-2">
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="输入标签名称"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddTag()
              }
            }}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleAddTag}
            disabled={createTagMutation.isPending || !newTagName.trim()}
          >
            {createTagMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Separator />

      {/* ========== URL Slug 设置 ========== */}
      <div className="space-y-2">
        <Label>URL Slug</Label>
        <Input
          value={form.slug}
          onChange={(e) => onFormChange({ slug: e.target.value })}
          placeholder="article-url-slug"
          className="font-mono text-sm"
        />
      </div>

      <Separator />

      {/* ========== SEO 设置（可折叠） ========== */}
      <div>
        <button
          type="button"
          className="flex w-full items-center justify-between py-2 text-sm font-medium"
          onClick={() => setIsSeoExpanded(!isSeoExpanded)}
        >
          SEO 设置
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform',
              isSeoExpanded && 'rotate-180',
            )}
          />
        </button>
        {isSeoExpanded && (
          <div className="space-y-3 pb-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Meta Title</Label>
              <Input
                value={form.metaTitle}
                onChange={(e) => onFormChange({ metaTitle: e.target.value })}
                placeholder="SEO 标题（留空则使用文章标题）"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Meta Description</Label>
              <Textarea
                value={form.metaDescription}
                onChange={(e) => onFormChange({ metaDescription: e.target.value })}
                placeholder="SEO 描述（留空则使用文章摘要）"
                rows={3}
                className="text-sm resize-none"
              />
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* ========== 发布设置 ========== */}
      <div className="space-y-4">
        <div className="text-sm font-medium">发布设置</div>

        {/* 可见性（文章状态） */}
        <div className="space-y-1.5">
          <Label>可见性</Label>
          <Select
            value={form.status === 'PUBLISHED' ? 'public' : 'private'}
            onValueChange={(value) =>
              onFormChange({ status: (value === 'public' ? 'PUBLISHED' : 'DRAFT') as AdminArticleStatus })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">公开</SelectItem>
              <SelectItem value="private">私密</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 允许评论（Switch） */}
        <div className="flex items-center justify-between">
          <Label>允许评论</Label>
          <Switch checked={true} />
        </div>
      </div>

      {/* ========== 素材选择器弹窗 ========== */}
      <MaterialPicker
        open={isCoverPickerOpen}
        onOpenChange={setIsCoverPickerOpen}
        onSelect={handleCoverSelect}
        multiple={false}
        typeFilter={['image']}
      />
    </div>
  )
}
