'use client'

import * as React from 'react'
import { Plus, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

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
  /** 搜索关键词 */
  keyword: string
  /** 搜索关键词变更回调 */
  onKeywordChange: (keyword: string) => void
  /** 当前选中的分类 ID，null 表示全部 */
  selectedCategoryId: string | null
  /** 分类选择变更回调 */
  onCategoryChange: (categoryId: string | null) => void
  /** 查看文章详情回调 */
  onViewArticle: (articleId: string) => void
  /** 编辑文章回调 */
  onEditArticle: (articleId: string) => void
  /** 新建文章回调（点击"写文章"按钮） */
  onWriteArticle: () => void
}

// ==================== 辅助组件 ====================

/**
 * 状态药丸组件
 * 用于标题旁显示各状态的文章计数
 * 映射到 Badge 的 ColorRole：published → success, draft → warning, archived → neutral
 */
function StatusPill({ label, count, variant }: {
  label: string
  count: number
  variant: 'published' | 'draft' | 'archived'
}) {
  // 将博客状态映射到系统语义色
  const colorMap: Record<typeof variant, 'success' | 'warning' | 'neutral'> = {
    published: 'success',
    draft: 'warning',
    archived: 'neutral',
  }

  return (
    <Badge variant={colorMap[variant]} className="gap-1 text-xs font-normal">
      {label}
      <span className="font-medium">{count}</span>
    </Badge>
  )
}

// ==================== 主组件 ====================

/**
 * Function: BlogMainLayout
 *
 * Description: 博客管理主页双栏布局容器。
 *              左侧为分类管理面板（CategoryPanel），右侧为文章列表面板（ArticlePanel）。
 *              顶部包含标题、状态统计药丸、搜索框和"写文章"按钮。
 *
 * Parameters:
 *   stats(BlogStats): 文章状态统计数据
 *   keyword(string): 当前搜索关键词
 *   onKeywordChange(function): 搜索关键词变更回调
 *   selectedCategoryId(string | null): 当前选中的分类 ID
 *   onCategoryChange(function): 分类选择变更回调
 *   onViewArticle(function): 查看文章详情回调
 *   onEditArticle(function): 编辑文章回调
 *   onWriteArticle(function): 新建文章回调
 *
 * Returns:
 *   element(React.ReactElement): 博客管理主页双栏布局
 */
export function BlogMainLayout({
  stats,
  keyword,
  onKeywordChange,
  selectedCategoryId,
  onCategoryChange,
  onViewArticle,
  onEditArticle,
  onWriteArticle,
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
    // h-full w-full 撑满父容器的宽高，flex-col 让工具栏固定、双栏自适应
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* ==================== 工具栏：状态药丸 + 搜索 + 写文章 ==================== */}
      {/* 不重复"博客管理"标题 — AdminShell 的 CardHeader 已显示页面标题 */}
      <div className="flex shrink-0 items-center justify-between border-b border-border-default px-7 py-3">
        {/* 左侧：状态药丸 */}
        <div className="flex items-center gap-1.5">
          {stats && (
            <>
              <StatusPill label="已发布" count={stats.publishedCount} variant="published" />
              <StatusPill label="草稿" count={stats.draftCount} variant="draft" />
              <StatusPill label="归档" count={stats.archivedCount} variant="archived" />
            </>
          )}
        </div>

        {/* 右侧：搜索框 + 写文章按钮 */}
        <div className="flex items-center gap-3">
          {/* 搜索框：pill 圆角，匹配设计规范 */}
          <div className="relative w-60">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" strokeWidth={2} />
            <Input
              placeholder="搜索文章标题..."
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              className="h-9 rounded-full border-border-default/30 bg-bg/50 pl-9 text-sm shadow-none"
            />
          </div>

          {/* 写文章按钮：主色 accent，匹配设计规范 */}
          <Button
            type="button"
            className="gap-2 shadow-lg shadow-primary/20"
            onClick={onWriteArticle}
          >
            <Plus className="h-4 w-4" />
            写文章
          </Button>
        </div>
      </div>

      {/* ==================== 双栏布局：分类面板 + 文章面板 ==================== */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* 左栏：分类管理面板 */}
        <CategoryPanel
          onCategoryChange={onCategoryChange}
          selectedCategoryId={selectedCategoryId}
        />

        {/* 右栏：文章列表面板 */}
        <ArticlePanel
          filters={filters}
          onView={onViewArticle}
          onEdit={onEditArticle}
        />
      </div>
    </div>
  )
}
