'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Save, SendHorizontal } from 'lucide-react'

import { ArticleEditor, initialFormState, type FormState } from '@/components/business/admin/blog/article-editor'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { parseApiResponse } from '@/lib/api/parse-response'
import type { AdminArticle } from '@/contracts/dtos/admin/blog/articles.dto'

// ==================== 页面组件 ====================

/**
 * Function: AdminBlogEditPage
 *
 * Description: 编辑文章独立页面。
 *              与写文章页面共享 ArticleEditor 组件，通过 URL 参数获取文章 ID，
 *              加载已有文章数据填充表单，支持保存草稿和发布操作。
 *
 * Returns:
 *   element(React.ReactElement): 编辑文章页面
 */
export default function AdminBlogEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const articleId = params.id

  // ==================== 表单状态 ====================
  const [form, setForm] = React.useState<FormState>(initialFormState)
  /** 标记是否已完成初始数据加载 */
  const [isInitialized, setIsInitialized] = React.useState(false)

  /** 合并表单变更 */
  const handleFormChange = React.useCallback((updates: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...updates }))
  }, [])

  // ==================== 数据查询 ====================

  /** 获取文章详情，填充编辑表单 */
  const { data: article, isLoading } = useQuery<AdminArticle>({
    queryKey: ['admin', 'blog-article', articleId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/admin/blog/articles/${articleId}`, {
        credentials: 'include',
      })
      return parseApiResponse<AdminArticle>(response)
    },
    enabled: !!articleId,
    staleTime: 0, // 编辑页面每次都需要最新数据
  })

  // 当文章数据加载完成后，填充表单
  React.useEffect(() => {
    if (article && !isInitialized) {
      setForm({
        title: article.title ?? '',
        slug: article.slug ?? '',
        excerpt: article.excerpt ?? '',
        content: article.content ?? '',
        coverImage: article.coverImage ?? '',
        categoryId: article.categoryId ?? '',
        metaTitle: article.metaTitle ?? '',
        metaDescription: article.metaDescription ?? '',
        ogImage: article.ogImage ?? '',
        tagIds: article.tagIds ?? [],
        status: article.status,
      })
      setIsInitialized(true)
    }
  }, [article, isInitialized])

  // ==================== 提交处理 ====================

  /** 更新文章 mutation */
  const updateMutation = useMutation({
    mutationFn: async (status: 'DRAFT' | 'PUBLISHED') => {
      const response = await fetch(`/api/v1/admin/blog/articles/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: form.title,
          content: form.content || null,
          excerpt: form.excerpt || null,
          coverImage: form.coverImage || null,
          categoryId: form.categoryId || null,
          metaTitle: form.metaTitle || null,
          metaDescription: form.metaDescription || null,
          ogImage: form.ogImage || null,
          tagIds: form.tagIds,
        }),
      })

      await parseApiResponse(response)

      // 如果需要发布，调用发布接口
      if (status === 'PUBLISHED') {
        await fetch(`/api/v1/admin/blog/articles/${articleId}/publish`, {
          method: 'POST',
          credentials: 'include',
        })
      }
      // 如果需要下线（当前已是草稿状态），无需额外操作
    },
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-articles'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-article', articleId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-articles', 'stats'] })

      toast({
        title: status === 'PUBLISHED' ? '发布成功' : '保存成功',
        description: `文章「${form.title}」已${status === 'PUBLISHED' ? '发布' : '更新'}`,
      })
    },
    onError: (error) => {
      toast({
        title: '保存失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  /** 保存草稿 */
  const handleSaveDraft = React.useCallback(() => {
    if (!form.title.trim()) {
      toast({ title: '请输入文章标题', variant: 'destructive' })
      return
    }
    updateMutation.mutate('DRAFT')
  }, [updateMutation, form.title, toast])

  /** 发布文章 */
  const handlePublish = React.useCallback(() => {
    if (!form.title.trim()) {
      toast({ title: '请输入文章标题', variant: 'destructive' })
      return
    }
    if (!form.content?.trim()) {
      toast({ title: '请输入文章内容', variant: 'destructive' })
      return
    }
    updateMutation.mutate('PUBLISHED')
  }, [updateMutation, form.title, form.content, toast])

  /** 返回列表 */
  const handleGoBack = React.useCallback(() => {
    router.push('/admin/blog')
  }, [router])

  const isSubmitting = updateMutation.isPending

  // ==================== 渲染 ====================

  // 加载中状态
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">正在加载文章数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* ==================== 顶部操作栏 ==================== */}
      <div className="flex h-[60px] shrink-0 items-center justify-between border-b bg-white px-7">
        {/* 左侧：标题 */}
        <h2 className="text-lg font-semibold">编辑文章</h2>

        {/* 右侧：操作按钮组 */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className="gap-2"
            onClick={handleGoBack}
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>

          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            保存草稿
          </Button>

          <Button
            type="button"
            className="gap-2 shadow-lg shadow-primary/20"
            onClick={handlePublish}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            发布
          </Button>
        </div>
      </div>

      {/* ==================== 编辑器主体 ==================== */}
      {isInitialized && (
        <div className="flex-1 overflow-hidden">
          <ArticleEditor form={form} onFormChange={handleFormChange} />
        </div>
      )}
    </div>
  )
}
