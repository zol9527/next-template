'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight, Edit3, FolderOpen, FolderTree, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AdminBlogCategory } from '@/contracts/dtos/admin/blog/categories.dto'

/**
 * 分类列表项组件的属性接口
 *
 * 每个分类在树形列表中渲染为一行，
 * 支持展开/折叠、选中高亮、悬浮操作按钮。
 */
interface CategoryItemProps {
  /** 当前分类数据 */
  category: AdminBlogCategory
  /** 树层级深度，用于计算缩进 */
  level: number
  /** 是否处于选中状态 */
  isSelected: boolean
  /** 是否处于展开状态（有子节点时） */
  isExpanded: boolean
  /** 是否拥有子分类 */
  hasChildren: boolean
  /** 选中分类回调，传入分类 ID；null 表示"全部文章" */
  onSelect: (categoryId: string | null) => void
  /** 展开/折叠回调 */
  onToggleExpand: (categoryId: string) => void
  /** 编辑分类回调 */
  onEdit: (category: AdminBlogCategory) => void
  /** 删除分类回调 */
  onDelete: (category: AdminBlogCategory) => void
}

/**
 * 分类列表项组件
 *
 * 在侧边栏面板中渲染单个分类行，特性：
 * - 根据 level 计算左缩进（每级 12px）
 * - 有子节点时显示展开/折叠箭头
 * - 选中状态：左侧 accent 边框 + accent 背景
 * - 悬浮时显示编辑（铅笔）和删除（垃圾桶）操作图标
 * - 展开时使用 FolderOpen 图标，折叠时使用 FolderTree 图标
 * - 显示该分类下的文章数量
 */
export function CategoryItem({
  category,
  level,
  isSelected,
  isExpanded,
  hasChildren,
  onSelect,
  onToggleExpand,
  onEdit,
  onDelete,
}: CategoryItemProps) {
  /** 悬浮状态控制操作按钮的显示/隐藏 */
  const [isHovered, setIsHovered] = React.useState(false)

  /**
   * 点击分类名称的处理
   * 选中当前分类，若该分类有子节点则同时展开/折叠
   */
  function handleClick() {
    onSelect(category.id)
    if (hasChildren) {
      onToggleExpand(category.id)
    }
  }

  /**
   * 点击展开/折叠箭头的处理
   * 仅切换展开状态，不触发选中
   */
  function handleExpandClick(e: React.MouseEvent) {
    e.stopPropagation()
    onToggleExpand(category.id)
  }

  /**
   * 编辑按钮点击处理
   * 阻止事件冒泡，避免触发选中
   */
  function handleEditClick(e: React.MouseEvent) {
    e.stopPropagation()
    onEdit(category)
  }

  /**
   * 删除按钮点击处理
   * 阻止事件冒泡，避免触发选中
   */
  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    onDelete(category)
  }

  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center gap-1 rounded-sm py-1.5 pr-1 text-sm transition-colors',
        'hover:bg-ds-accent-subtle',
        // 选中状态：accent 左侧指示条 (3px) + accent-subtle 背景 + accent 文字
        isSelected
          ? 'border-l-[3px] border-ds-accent bg-ds-accent-subtle text-ds-accent font-medium'
          : 'border-l-[3px] border-transparent text-fg'
      )}
      style={{ paddingLeft: `${level * 12 + 8}px` }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      {/* 展开/折叠箭头（仅有子节点时显示） */}
      {hasChildren ? (
        <button
          type="button"
          className="flex h-4 w-4 shrink-0 items-center justify-center text-fg-muted"
          onClick={handleExpandClick}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      ) : (
        // 无子节点时保持占位
        <span className="h-4 w-4 shrink-0" />
      )}

      {/* 文件夹图标：展开时 FolderOpen，折叠时 FolderTree */}
      {isExpanded ? (
        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
      ) : (
        <FolderTree className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
      )}

      {/* 分类名称 */}
      <span className="min-w-0 flex-1 truncate text-sm">{category.name}</span>

      {/* 文章数量标签 */}
      {(category.articleCount ?? 0) > 0 && (
        <Badge variant="neutral" className="h-4 px-1 text-[10px]">
          {category.articleCount}
        </Badge>
      )}

      {/* 悬浮时显示的编辑/删除操作按钮 */}
      {isHovered && (
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center rounded text-fg-muted transition-colors hover:bg-ds-accent-subtle hover:text-ds-accent"
            onClick={handleEditClick}
            title="编辑"
          >
            <Edit3 className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center rounded text-fg-muted transition-colors hover:bg-rose-subtle hover:text-rose"
            onClick={handleDeleteClick}
            title="删除"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
