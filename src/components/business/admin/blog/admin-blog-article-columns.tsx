'use client'

import { ArrowDownCircle, ArrowUpCircle, Archive, Clock, Edit, Eye, FileText, Tag } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CopyCell } from '@/components/ui/data-table/copy-cell'
import type { AdminArticle } from '@/contracts/dtos/admin/blog/articles.dto'

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
 * Description: 根据文章状态返回对应的状态徽章
 *
 * Parameters:
 *   status(string): 文章状态
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

/**
 * Function: formatArticleDate
 *
 * Description: 将 ISO 时间格式化为后台列表可读时间
 *
 * Parameters:
 *   value(string | null | undefined): ISO 时间字符串
 *
 * Returns:
 *   formatted(string): 格式化后的时间文本
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

interface ArticleColumnsProps {
  onSelect?: (articleId: string) => void
  onView?: (articleId: string) => void
  onPublish?: (articleId: string) => void
  onUnpublish?: (articleId: string) => void
  onArchive?: (articleId: string) => void
}

/**
 * Function: getArticleColumns
 *
 * Description: 生成博客文章列表表格列定义
 *
 * Parameters:
 *   onSelect(function): 选择文章进入编辑的回调
 *   onView(function): 选择文章进入查看的回调
 *   onPublish(function): 发布文章的回调
 *   onUnpublish(function): 下线文章的回调
 *   onArchive(function): 归档文章的回调
 *
 * Returns:
 *   columns(ColumnDef<AdminArticle>[]): TanStack Table 列定义
 */
export function getArticleColumns({
  onSelect,
  onView,
  onPublish,
  onUnpublish,
  onArchive,
}: ArticleColumnsProps = {}): ColumnDef<AdminArticle>[] {
  const columns: ColumnDef<AdminArticle>[] = []

  // 复选框列 - 用于批量选择
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

  columns.push({
    accessorKey: 'id',
    header: () => (
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4" />
        文章 ID
      </div>
    ),
    cell: ({ row }) => (
      <CopyCell value={row.original.id} label="文章 ID" />
    ),
  })

  columns.push({
    accessorKey: 'title',
    header: () => (
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4" />
        标题
      </div>
    ),
    cell: ({ row }) => {
      const tags = row.original.tagNames ?? []

      return (
        <div className="flex max-w-80 flex-col gap-1">
          <span className="truncate font-medium">{row.original.title}</span>
          <span className="truncate text-xs text-muted-foreground">/{row.original.slug}</span>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="default">
                  {tag}
                </Badge>
              ))}
              {tags.length > 2 && (
                <Badge variant="default">+{tags.length - 2}</Badge>
              )}
            </div>
          )}
        </div>
      )
    },
  })

  columns.push({
    accessorKey: 'status',
    header: () => <div className="flex items-center justify-center">状态</div>,
    cell: ({ row }) => (
      <div className="text-center">
        {getArticleStatusBadge(row.original.status)}
      </div>
    ),
  })

  columns.push({
    accessorKey: 'categoryName',
    header: () => '分类',
    cell: ({ row }) => row.original.categoryName || '未分类',
  })

  columns.push({
    accessorKey: 'viewCount',
    header: () => (
      <div className="flex items-center justify-end gap-2">
        <Eye className="h-4 w-4" />
        阅读量
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right font-mono">{row.original.viewCount.toLocaleString('zh-CN')}</div>
    ),
  })

  columns.push({
    accessorKey: 'publishedAt',
    header: () => (
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        发布时间
      </div>
    ),
    cell: ({ row }) => {
      const displayDate = row.original.publishedAt ?? row.original.createdAt
      const helperText = row.original.publishedAt ? '发布时间' : '创建时间'

      return (
        <div className="flex flex-col gap-1">
          <span>{formatArticleDate(displayDate)}</span>
          <span className="text-xs text-muted-foreground">{helperText}</span>
        </div>
      )
    },
  })

  columns.push({
    id: 'actions',
    header: () => <div className="text-right">操作</div>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1.5">
        {onView && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 transition-all duration-200 hover:scale-105 active:scale-95"
            onClick={() => onView(row.original.id)}
            title="查看"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )}

        {onSelect && (
          <Button
            type="button"
            variant="solid"
            size="icon"
            className="h-8 w-8 transition-all duration-200 hover:scale-105 active:scale-95"
            onClick={() => onSelect(row.original.id)}
            title="编辑"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
        )}

        {row.original.status === 'PUBLISHED' ? (
          onUnpublish && (
            <Button
              type="button"
              variant="solid"
              color="warning"
              size="icon"
              className="h-8 w-8 transition-all duration-200 hover:scale-105 active:scale-95"
              onClick={() => onUnpublish(row.original.id)}
              title="下线"
            >
              <ArrowDownCircle className="h-3.5 w-3.5" />
            </Button>
          )
        ) : (
          row.original.status !== 'ARCHIVED' &&
          onPublish && (
            <Button
              type="button"
              variant="solid"
              color="success"
              size="icon"
              className="h-8 w-8 transition-all duration-200 hover:scale-105 active:scale-95"
              onClick={() => onPublish(row.original.id)}
              title="发布"
            >
              <ArrowUpCircle className="h-3.5 w-3.5" />
            </Button>
          )
        )}

        {row.original.status !== 'ARCHIVED' && onArchive && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 transition-all duration-200 hover:scale-105 active:scale-95"
            onClick={() => onArchive(row.original.id)}
            title="归档"
          >
            <Archive className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    ),
  })

  return columns
}
