'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

import { BlogMainLayout, type BlogStats } from '@/components/business/admin/blog/blog-main-layout'
import { parseApiResponse } from '@/lib/api/parse-response'
import { AdminArticleListResponseSchema } from '@/contracts/dtos/admin/blog/articles.dto'

// ==================== 辅助函数 ====================
 * 获取各状态文章总数的辅助函数
 */
async function fetchStatusCount(status?: string): Promise<number> {
  const params = new URLSearchParams({ limit: '1' })
  if (status) {
    params.set('status', status)
  }
  const response = await fetch(`/api/v1/admin/blog/articles?${params.toString()}`, { credentials: 'include' })
  const data = await parseApiResponse<{ totalCount: number }>(response, AdminArticleListResponseSchema)
  return data.totalCount
}

// ==================== 页面组件 ====================

/**
 * Function: AdminBlogPage
 *
 * Description: 博客管理主页。
 *              采用双栏布局：左侧为分类管理面板，右侧为文章列表面板。
 *              替代旧版的 KPI 卡片 + 筛选条 + Dialog 弹窗模式。
 *              文章详情通过右侧抽屉查看，编辑/新建跳转独立路由页面。
 *
 * Returns:
 *   element(React.ReactElement): 博客管理主页
 */
export default function AdminBlogPage() {
  const router = useRouter()

  // ==================== 状态管理 ====================
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null)
  const [keyword, setKeyword] = React.useState('')

  // 防抖搜索关键词
  const debouncedKeyword = React.useRef<string>('')
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout>>()

  const handleKeywordChange = React.useCallback((value: string) => {
    setKeyword(value)
    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    // 300ms 防抖
    debounceTimerRef.current = setTimeout(() => {
      debouncedKeyword.current = value
    }, 300)
  }, [])

  // ==================== 数据查询 ====================

  /** 文章状态统计 */
  const { data: stats } = useQuery<BlogStats>({
    queryKey: ['admin', 'blog-articles', 'stats'],
    queryFn: async () => {
      const [publishedCount, draftCount, archivedCount] = await Promise.all([
        fetchStatusCount('PUBLISHED'),
        fetchStatusCount('DRAFT'),
        fetchStatusCount('ARCHIVED'),
      ])
      return { publishedCount, draftCount, archivedCount }
    },
    staleTime: 60 * 1000, // 统计数据缓存 1 分钟
  })

  // ==================== 事件处理 ====================

  /** 点击"写文章"按钮 → 跳转到写文章页面 */
  const handleWriteArticle = React.useCallback(() => {
    router.push('/admin/blog/write')
  }, [router])

  /** 查看文章详情 → 由 ArticlePanel 内部的 ArticleDetailDrawer 处理 */
  const handleViewArticle = React.useCallback((_articleId: string) => {
    // ArticlePanel 内部集成了 ArticleDetailDrawer，无需额外处理
    // 此回调保留供将来扩展使用（如需要页面级别感知查看事件）
  }, [])

  /** 编辑文章 → 跳转到编辑页面 */
  const handleEditArticle = React.useCallback((articleId: string) => {
    router.push(`/admin/blog/${articleId}/edit`)
  }, [router])

  // ==================== 渲染 ====================

  return (
    <div className="flex h-full animate-in fade-in duration-500">
      <BlogMainLayout
        stats={stats}
        keyword={keyword}
        onKeywordChange={handleKeywordChange}
        selectedCategoryId={selectedCategoryId}
        onCategoryChange={setSelectedCategoryId}
        onViewArticle={handleViewArticle}
        onEditArticle={handleEditArticle}
        onWriteArticle={handleWriteArticle}
      />
    </div>
  )
}
