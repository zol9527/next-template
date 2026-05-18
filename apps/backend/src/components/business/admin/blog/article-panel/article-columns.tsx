'use client'

/**
 * File: article-columns.tsx
 * Description: 文章面板表格列定义，包含缩略图+标题+描述、分类、状态、浏览量、点赞数、更新时间、操作等列
 * 重写自旧版 admin-blog-article-columns.tsx，适配新的双栏布局面板
 */

import { ArrowDownCircle, ArrowUpCircle, Archive, Edit, Eye, Heart, ImageIcon } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import type { AdminArticle } from '@/contracts/dtos/admin/blog/articles.dto'

// ============================================
// 类型定义（Type Definitions）
// ============================================

/** 发布操作按钮配置 */
type PublishActionConfig = {
  icon: LucideIcon
  label: string
  color: 'warning' | 'success'
  onClick: () => void
}

/** 文章列定义的回调 props */
interface ArticleColumnsProps {
  /** 查看文章详情回调 */
  onView: (articleId: string) => void
  /** 编辑文章回调 */
  onEdit: (articleId: string) => void
  /** 发布文章回调 */
  onPublish: (articleId: string) => void
  /** 下线文章回调 */
  onUnpublish: (articleId: string) => void
  /** 归档文章回调 */
  onArchive: (articleId: string) => void
}

// ============================================
// 常量与工具函数（Constants & Utilities）
// ============================================

/** 中文日期格式化器：年/月/日 时:分 */
const articleDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Function: getArticleStatusBadge
 *
 * Description: 根据文章状态返回对应的状态徽章组件
 *
 * Parameters:
 *   status(string): 文章状态值（PUBLISHED / DRAFT / ARCHIVED）
 *
 * Returns:
 *   element(React.ReactElement): 带颜色的状态徽章
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

/**
 * Function: formatArticleDate
 *
 * Description: 将 ISO 时间字符串格式化为后台可读的中文日期时间
 *
 * Parameters:
 *   value(string | null | undefined): ISO 时间字符串
 *
 * Returns:
 *   formatted(string): 格式化后的日期时间文本，无效时返回 '—'
 */
function formatArticleDate(value: string | null | undefined) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return articleDateFormatter.format(date)
}

/**
 * Function: formatNumber
 *
 * Description: 将数字格式化为中文千分位表示（如 1,234）
 *
 * Parameters:
 *   count(number): 数字值
 *
 * Returns:
 *   formatted(string): 格式化后的字符串
 */
function formatNumber(count: number) {
  return count.toLocaleString('zh-CN')
}

// ============================================
// 列定义导出（Column Definitions）
// ============================================

/**
 * Function: getArticleColumns
 *
 * Description: 生成博客文章面板表格列定义，包含：
 *   - 复选框列（批量选择）
 *   - 标题列（封面缩略图 + 标题 + 摘要片段）
 *   - 分类列
 *   - 状态列
 *   - 浏览量列
 *   - 点赞数列（Heart 图标）
 *   - 更新时间列
 *   - 操作列（查看、编辑、发布/下线、归档）
 *
 * Parameters:
 *   onView(function): 查看文章详情回调
 *   onEdit(function): 编辑文章回调
 *   onPublish(function): 发布文章回调
 *   onUnpublish(function): 下线文章回调
 *   onArchive(function): 归档文章回调
 *
 * Returns:
 *   columns(ColumnDef<AdminArticle>[]): TanStack Table 列定义数组
 */
export function getArticleColumns({
  onView,
  onEdit,
  onPublish,
  onUnpublish,
  onArchive,
}: ArticleColumnsProps): ColumnDef<AdminArticle>[] {
  const columns: ColumnDef<AdminArticle>[] = []

  // ------------------------------------------
  // 复选框列 - 用于批量选择
  // ------------------------------------------
  columns.push({
    id: 'select',
    header: ({ table }) => (
      <div className="flex h-full items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="全选"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex h-full items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="选择行"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 48,
  })

  // ------------------------------------------
  // 标题列 - 封面缩略图 + 标题 + 摘要片段
  // ------------------------------------------
  columns.push({
    accessorKey: 'title',
    header: () => <div className="flex items-center">标题</div>,
    cell: ({ row }) => {
      const { title, coverImage, excerpt } = row.original

      return (
        <div className="flex items-center gap-3 max-w-80">
          {/* 封面缩略图：40×28px 圆角，无图时显示占位图标 */}
          <div className="shrink-0 h-10 w-14 rounded-md overflow-hidden bg-muted flex items-center justify-center">
            {coverImage ? (
              <img
                src={coverImage}
                alt={title}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {/* 标题 + 摘要片段 */}
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="truncate font-medium text-sm">{title}</span>
            {excerpt && (
              <span className="truncate text-xs text-muted-foreground">{excerpt}</span>
            )}
          </div>
        </div>
      )
    },
    size: 320,
  })

  // ------------------------------------------
  // 分类列
  // ------------------------------------------
  columns.push({
    accessorKey: 'categoryName',
    header: () => <div className="flex items-center">分类</div>,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.categoryName || '未分类'}
      </span>
    ),
    size: 100,
  })

  // ------------------------------------------
  // 状态列
  // ------------------------------------------
  columns.push({
    accessorKey: 'status',
    header: () => <div className="flex items-center justify-center">状态</div>,
    cell: ({ row }) => (
      <div className="flex justify-center">
        {getArticleStatusBadge(row.original.status)}
      </div>
    ),
    size: 90,
  })

  // ------------------------------------------
  // 浏览量列 - Eye 图标 + 数字
  // ------------------------------------------
  columns.push({
    accessorKey: 'viewCount',
    header: () => (
      <div className="flex items-center justify-end gap-1.5">
        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
        <span>浏览</span>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right font-mono text-sm tabular-nums">
        {formatNumber(row.original.viewCount)}
      </div>
    ),
    size: 90,
  })

  // ------------------------------------------
  // 点赞数列 - Heart 图标 + 数字
  // ------------------------------------------
  columns.push({
    accessorKey: 'likeCount',
    header: () => (
      <div className="flex items-center justify-end gap-1.5">
        <Heart className="h-3.5 w-3.5 text-muted-foreground" />
        <span>点赞</span>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right font-mono text-sm tabular-nums">
        {formatNumber(row.original.likeCount)}
      </div>
    ),
    size: 90,
  })

  // ------------------------------------------
  // 更新时间列
  // ------------------------------------------
  columns.push({
    accessorKey: 'updatedAt',
    header: () => <div className="flex items-center">更新时间</div>,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatArticleDate(row.original.updatedAt)}
      </span>
    ),
    size: 160,
  })

  // ------------------------------------------
  // 操作列 - 查看、编辑、发布/下线、归档
  // ------------------------------------------
  columns.push({
    id: 'actions',
    header: () => <div className="text-right">操作</div>,
    cell: ({ row }) => {
      const { status, id } = row.original
      const isPublished = status === 'PUBLISHED'
      const isArchived = status === 'ARCHIVED'

      // 根据当前状态决定发布按钮的行为
      const publishAction: PublishActionConfig = isPublished
        ? { icon: ArrowDownCircle, label: '下线', color: 'warning' as const, onClick: () => onUnpublish(id) }
        : { icon: ArrowUpCircle, label: isArchived ? '重新上线' : '上线', color: 'success' as const, onClick: () => onPublish(id) }

      return (
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center justify-end gap-1.5">
            {/* 查看按钮 - 打开详情抽屉 */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 transition-all duration-200 hover:scale-105 active:scale-95"
              onClick={() => onView(id)}
              title="查看"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>

            {/* 编辑按钮 - 跳转到编辑页 */}
            <Button
              type="button"
              variant="solid"
              size="icon"
              className="h-8 w-8 transition-all duration-200 hover:scale-105 active:scale-95"
              onClick={() => onEdit(id)}
              title="编辑"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>

            {/* 发布/下线切换按钮 */}
            <Button
              type="button"
              variant="solid"
              color={publishAction.color}
              size="icon"
              className="h-8 w-8 transition-all duration-200 hover:scale-105 active:scale-95"
              onClick={publishAction.onClick}
              title={publishAction.label}
            >
              <publishAction.icon className="h-3.5 w-3.5" />
            </Button>

            {/* 归档按钮 - 已归档时禁用并显示提示 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={isArchived ? 0 : undefined}>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 transition-all duration-200 hover:scale-105 active:scale-95"
                    onClick={() => !isArchived && onArchive(id)}
                    disabled={isArchived}
                    title="归档"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                </span>
              </TooltipTrigger>
              {isArchived && (
                <TooltipContent side="top">
                  <p>该文章已归档，无需重复操作</p>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </TooltipProvider>
      )
    },
    size: 180,
  })

  return columns
}
