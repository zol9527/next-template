'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Save, SendHorizontal } from 'lucide-react'

import { ArticleEditor, initialFormState, type FormState } from '@/components/business/admin/blog/article-editor'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { parseApiResponse } from '@/lib/api/parse-response'
import type { AdminArticle } from '@/contracts/dtos/admin/blog/articles.dto'

// ==================== 页面组件 ====================

/**
 * Function: AdminBlogWritePage
 *
 * Description: 写文章独立页面。
 *              提供文章编辑器的完整页面布局，包含顶部操作栏（返回/保存草稿/发布）
 *              和主体编辑区域（左侧编辑器 + 右侧设置面板）。
 *              创建成功后自动跳转到编辑页面。
 *
 * Returns:
 *   element(React.ReactElement): 写文章页面
 */
export default function AdminBlogWritePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // ==================== 表单状态 ====================
  const [form, setForm] = React.useState<FormState>(initialFormState)

  /** 合并表单变更 */
  const handleFormChange = React.useCallback((updates: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...updates }))
  }, [])

  // ==================== 提交处理 ====================

  /** 创建文章的通用方法 */
  const createMutation = useMutation({
    mutationFn: async (status: 'DRAFT' | 'PUBLISHED') => {
      const response = await fetch('/api/v1/admin/blog/articles', {
        method: 'POST',
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

      const article = await parseApiResponse<AdminArticle>(response)

      // 创建后如果需要发布，调用发布接口
      if (status === 'PUBLISHED' && article.id) {
        await fetch(`/api/v1/admin/blog/articles/${article.id}/publish`, {
          method: 'POST',
          credentials: 'include',
        })
      }

      return article
    },
    onSuccess: (article, status) => {
      // 刷新文章列表
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-articles'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'blog-articles', 'stats'] })

      toast({
        title: status === 'PUBLISHED' ? '发布成功' : '草稿已保存',
        description: `文章「${article.title}」已${status === 'PUBLISHED' ? '发布' : '保存为草稿'}`,
      })

      // 跳转到编辑页面，方便继续编辑
      router.push(`/admin/blog/${article.id}/edit`)
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
    createMutation.mutate('DRAFT')
  }, [createMutation, form.title, toast])

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
    createMutation.mutate('PUBLISHED')
  }, [createMutation, form.title, form.content, toast])

  /** 返回列表 */
  const handleGoBack = React.useCallback(() => {
    router.push('/admin/blog')
  }, [router])

  const isSubmitting = createMutation.isPending

  // ==================== 渲染 ====================

  return (
    <div className="flex h-full flex-col">
      {/* ==================== 顶部操作栏 ==================== */}
      <div className="flex h-[60px] shrink-0 items-center justify-between border-b bg-white px-7">
        {/* 左侧：标题 */}
        <h2 className="text-lg font-semibold">写文章</h2>

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
      <div className="flex-1 overflow-hidden">
        <ArticleEditor form={form} onFormChange={handleFormChange} />
      </div>
    </div>
  )
}
