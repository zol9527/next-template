'use client'

/**
 * File: article-detail-drawer.tsx
 * Description: 文章详情抽屉组件，从右侧滑出展示文章完整详情
 * 包含封面图、标题、元信息、标签、摘要、正文预览（带渐变截断遮罩）、统计信息等
 */

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArrowDownCircle, ArrowUpCircle, Clock, Edit, Eye, Heart, MoreHorizontal, Tag, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { AdminArticle } from '@/contracts/dtos/admin/blog/articles.dto'
import { AdminArticleSchema } from '@/contracts/dtos/admin/blog/articles.dto'
import { parseApiResponse } from '@/lib/api/parse-response'

// ============================================
// 类型定义（Type Definitions）
// ============================================

/** 文章详情抽屉组件 props */
interface ArticleDetailDrawerProps {
  /** 当前查看的文章 ID，为 null 时关闭抽屉 */
  articleId: string | null
  /** 抽屉是否打开 */
  open: boolean
  /** 抽屉打开/关闭状态变化回调 */
  onOpenChange: (open: boolean) => void
  /** 点击编辑按钮的回调 */
  onEdit: (articleId: string) => void
}

// ============================================
// 工具函数（Utilities）
// ============================================

/**
 * Function: estimateReadingTime
 *
 * Description: 根据文章内容长度估算阅读时长（按中文 500 字/分钟计算）
 *
 * Parameters:
 *   content(string | null): 文章内容
 *
 * Returns:
 *   minutes(number): 估算阅读分钟数，最少 1 分钟
 */
function estimateReadingTime(content: string | null) {
  return Math.max(1, Math.ceil((content?.length || 0) / 500))
}

/**
 * Function: getArticleStatusBadge
 *
 * Description: 根据文章状态返回对应的状态徽章
 *
 * Parameters:
 *   status(string): 文章状态值
 *
 * Returns:
 *   element(React.ReactElement): 状态徽章组件
 */
function getArticleStatusBadge(status: string) {
  const config: Record<string, { label: string; status: 'published' | 'draft' | 'unpublished' | 'archived' }> = {
    PUBLISHED: { label: '已发布', status: 'published' },
    DRAFT: { label: '草稿', status: 'draft' },
    ARCHIVED: { label: '已归档', status: 'archived' },
  }

  const item = config[status] || { label: status, status: 'draft' as const }
  return <Badge status={item.status}>{item.label}</Badge>
}

// ============================================
// 组件实现（Component Implementation）
// ============================================

/**
 * Function: ArticleDetailDrawer
 *
 * Description: 文章详情抽屉组件，从右侧滑出展示文章完整信息
 * 包含：
 *   - 头部：关闭按钮 + 状态徽章 + 编辑按钮 + 更多操作菜单
 *   - 内容区：封面图、标题、元信息、标签、摘要、正文预览（渐变截断）
 *   - 底部：统计信息（浏览/点赞）+ slug 路径
 *
 * Parameters:
 *   articleId(string | null): 当前查看的文章 ID
 *   open(boolean): 抽屉是否打开
 *   onOpenChange(function): 打开/关闭状态回调
 *   onEdit(function): 编辑按钮回调
 *
 * Returns:
 *   element(React.ReactElement): 抽屉组件 UI
 */
export function ArticleDetailDrawer({
  articleId,
  open,
  onOpenChange,
  onEdit,
}: ArticleDetailDrawerProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // ------------------------------------------
  // 数据获取：文章详情
  // ------------------------------------------
  const {
    data: article,
    isLoading,
    isError,
  } = useQuery<AdminArticle>({
    queryKey: ['admin', 'blog-article-detail', articleId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/admin/blog/articles/${articleId}`, {
        credentials: 'include',
      })
      return parseApiResponse(response, AdminArticleSchema)
    },
    // 仅在 articleId 有效且抽屉打开时启用查询
    enabled: !!articleId && open,
  })

  // ------------------------------------------
  // 操作 mutations：发布、下线、归档
  // ------------------------------------------
  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/admin/blog/articles/${id}/publish`, {
        method: 'POST',
        credentials: 'include',
      })
      return parseApiResponse(response)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-articles'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-article-detail', articleId] })
      toast({ title: '操作成功', description: '文章已发布', variant: 'default' })
    },
    onError: (error) => {
      toast({
        title: '发布失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  const unpublishMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/admin/blog/articles/${id}/unpublish`, {
        method: 'POST',
        credentials: 'include',
      })
      return parseApiResponse(response)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-articles'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-article-detail', articleId] })
      toast({ title: '操作成功', description: '文章已下线', variant: 'default' })
    },
    onError: (error) => {
      toast({
        title: '下线失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch('/api/v1/admin/blog/articles/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ articleIds: [id], status: 'ARCHIVED' }),
      })
      return parseApiResponse(response)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-articles'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-article-detail', articleId] })
      toast({ title: '操作成功', description: '文章已归档', variant: 'default' })
    },
    onError: (error) => {
      toast({
        title: '归档失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  // 操作状态标识
  const isOperating = publishMutation.isPending || unpublishMutation.isPending || archiveMutation.isPending

  // 是否已发布、已归档
  const isPublished = article?.status === 'PUBLISHED'
  const isArchived = article?.status === 'ARCHIVED'

  // 阅读时长估算
  const readingTime = article ? estimateReadingTime(article.content) : 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="sm:max-w-[640px] w-full p-0 overflow-hidden"
      >
        {/* 无障碍标题和描述（隐藏） */}
        <SheetTitle className="sr-only">文章详情</SheetTitle>
        <SheetDescription className="sr-only">查看文章的详细信息</SheetDescription>

        {/* ======================================
            头部区域：状态 + 编辑按钮 + 更多操作
            ====================================== */}
        <SheetHeader className="py-4 px-6 border-b border-border/50">
          <div className="flex items-center justify-between w-full">
            {/* 左侧：状态徽章 */}
            <div className="flex items-center gap-3">
              {article && getArticleStatusBadge(article.status)}
            </div>

            {/* 右侧：编辑按钮 + 更多操作菜单 */}
            <div className="flex items-center gap-2">
              {article && (
                <>
                  {/* 编辑按钮 */}
                  <Button
                    type="button"
                    variant="solid"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => onEdit(article.id)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                    编辑
                  </Button>

                  {/* 更多操作下拉菜单 */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={isOperating}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">更多操作</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="right">
                      {/* 发布/下线操作 */}
                      {isPublished ? (
                        <DropdownMenuItem
                          onSelect={() => unpublishMutation.mutate(article.id)}
                          disabled={isOperating}
                        >
                          <ArrowDownCircle className="h-4 w-4 mr-2" />
                          下线文章
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onSelect={() => publishMutation.mutate(article.id)}
                          disabled={isOperating}
                        >
                          <ArrowUpCircle className="h-4 w-4 mr-2" />
                          发布文章
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      {/* 归档操作 */}
                      <DropdownMenuItem
                        onSelect={() => archiveMutation.mutate(article.id)}
                        disabled={isArchived || isOperating}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        归档文章
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* ======================================
            内容区域：封面图 → 标题 → 元信息 → 标签 → 摘要 → 正文预览
            ====================================== */}
        <div className="flex-1 p-6 overflow-auto">
          {/* 加载中状态 */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">加载中...</span>
              </div>
            </div>
          )}

          {/* 加载失败状态 */}
          {isError && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <span className="text-sm">加载失败，请稍后重试</span>
              </div>
            </div>
          )}

          {/* 文章内容 */}
          {article && (
            <div className="flex flex-col gap-5">
              {/* 封面图片区域：h-52 圆角，无图时显示灰色占位 */}
              <div className="h-52 rounded-xl overflow-hidden bg-muted">
                {article.coverImage ? (
                  <img
                    src={article.coverImage}
                    alt={article.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                    <span className="text-sm">暂无封面图片</span>
                  </div>
                )}
              </div>

              {/* 文章标题 */}
              <h2 className="text-lg font-semibold leading-relaxed">
                {article.title}
              </h2>

              {/* 元信息行：分类 · 发布时间 · 阅读时长 */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {article.categoryName ? (
                  <span>{article.categoryName}</span>
                ) : (
                  <span>未分类</span>
                )}

                <span>·</span>

                {article.publishedAt ? (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(article.publishedAt).toLocaleDateString('zh-CN')}
                  </span>
                ) : (
                  <span>未发布</span>
                )}

                <span>·</span>

                <span>约 {readingTime} 分钟阅读</span>
              </div>

              {/* 标签组：Badge 药丸样式 */}
              {article.tagNames && article.tagNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {article.tagNames.map((tagName) => (
                    <Badge key={tagName} variant="secondary">
                      {tagName}
                    </Badge>
                  ))}
                </div>
              )}

              <Separator />

              {/* 摘要区域 */}
              {article.excerpt && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">摘要</span>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>
              )}

              {/* 正文预览：HTML 渲染 + 渐变截断遮罩（max-h-96） */}
              {article.content && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">正文预览</span>
                  <div className="relative max-h-96 overflow-hidden">
                    {/* 文章 HTML 内容（后台内容，可信来源） */}
                    <div
                      className="prose prose-sm prose-neutral dark:prose-invert max-w-none
                        [&_img]:rounded-lg [&_a]:text-primary [&_a]:underline"
                      dangerouslySetInnerHTML={{ __html: article.content }}
                    />

                    {/* 渐变截断遮罩：从透明到背景色的渐变 */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
                      style={{
                        background: 'linear-gradient(to bottom, transparent, var(--background))',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ======================================
            底部区域：统计信息 + slug 路径
            ====================================== */}
        {article && (
          <div className="py-3 px-6 border-t border-border/50 flex items-center justify-between">
            {/* 左侧：统计信息 */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {/* 浏览量 */}
              <span className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                {article.viewCount.toLocaleString('zh-CN')}
              </span>

              {/* 点赞数 */}
              <span className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5" />
                {article.likeCount.toLocaleString('zh-CN')}
              </span>
            </div>

            {/* 右侧：slug 路径 */}
            <span className="font-mono text-xs text-muted-foreground">
              /{article.slug}
            </span>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
