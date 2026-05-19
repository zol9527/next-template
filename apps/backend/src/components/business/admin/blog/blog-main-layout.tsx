'use client'

import * as React from 'react'

import { CategoryPanel } from './category-panel'
import { ArticlePanel } from './article-panel'

// ==================== 类型定义 ====================

/**
 * 博客管理主页状态统计
 * 用于标题旁的状态药丸显示
 */
export interface BlogStats {
  /** 已发布文章数 */
  publishedCount: number
  /** 草稿文章数 */
  draftCount: number
  /** 归档文章数 */
  archivedCount: number
}

/**
 * 博客双栏布局属性
 */
interface BlogMainLayoutProps {
  /** 文章状态统计 */
  stats?: BlogStats
  /** 搜索关键词（由 CardHeader 的搜索框驱动） */
  keyword: string
  /** 当前选中的分类 ID，null 表示全部 */
  selectedCategoryId: string | null
  /** 分类选择变更回调 */
  onCategoryChange: (categoryId: string | null) => void
  /** 查看文章详情回调 */
  onViewArticle: (articleId: string) => void
  /** 编辑文章回调 */
  onEditArticle: (articleId: string) => void
}

// ==================== 主组件 ====================

/**
 * Function: BlogMainLayout
 *
 * Description: 博客管理主页双栏布局容器。
 *              左侧为分类管理面板（CategoryPanel），右侧为文章列表面板（ArticlePanel）。
 *              搜索框和"写文章"按钮已在 CardHeader 的 AdminPageHeader actions 中，
 *              状态药丸由 ArticlePanel 的筛选栏显示。
 *              本组件仅负责双栏布局，不包含工具栏。
 *
 * Parameters:
 *   stats(BlogStats): 文章状态统计数据（传递给 ArticlePanel 的筛选栏）
 *   keyword(string): 当前搜索关键词
 *   selectedCategoryId(string | null): 当前选中的分类 ID
 *   onCategoryChange(function): 分类选择变更回调
 *   onViewArticle(function): 查看文章详情回调
 *   onEditArticle(function): 编辑文章回调
 *
 * Returns:
 *   element(React.ReactElement): 博客管理主页双栏布局
 */
export function BlogMainLayout({
  stats,
  keyword,
  selectedCategoryId,
  onCategoryChange,
  onViewArticle,
  onEditArticle,
}: BlogMainLayoutProps) {
  // 构建 ArticlePanel 所需的 filters 对象
  const filters = React.useMemo(
    () => ({
      keyword: keyword || undefined,
      categoryId: selectedCategoryId || undefined,
    }),
    [keyword, selectedCategoryId],
  )

  return (
    // 不使用独立卡片壳 — 已在 AdminShell 的白色卡片内
    // h-full w-full 撑满父容器的宽高，直接双栏布局
    <div className="flex h-full w-full overflow-hidden">
      {/* 左栏：分类管理面板 */}
      <CategoryPanel
        onCategoryChange={onCategoryChange}
        selectedCategoryId={selectedCategoryId}
      />

      {/* 右栏：文章列表面板（含状态药丸筛选栏） */}
      <ArticlePanel
        stats={stats}
        filters={filters}
        onView={onViewArticle}
        onEdit={onEditArticle}
      />
    </div>
  )
}
