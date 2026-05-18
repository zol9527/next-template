'use client'

import * as React from 'react'
import { Search, ChevronRight, ChevronDown, Plus } from 'lucide-react'
import type { AdminCategory } from '@/plugins/ecommerce/contracts/admin-categories.dto'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

/**
 * 树形节点扩展类型
 */
export interface CategoryNode extends AdminCategory {
  children?: CategoryNode[]
}

/**
 * 构建分类树形结构
 */
export function buildCategoryTree(items: AdminCategory[]): CategoryNode[] {
  const itemMap = new Map<string, CategoryNode>()
  items.forEach((item) => itemMap.set(item.id, { ...item }))

  const roots: CategoryNode[] = []
  items.forEach((item) => {
    const node = itemMap.get(item.id)!
    if (item.parentId) {
      const parent = itemMap.get(item.parentId)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(node)
      }
    } else {
      roots.push(node)
    }
  })

  return roots
}

interface CategoryTreePanelProps {
  /** 分类列表 */
  categories: AdminCategory[]
  /** 树形结构 */
  categoryTree: CategoryNode[]
  /** 当前选中的分类 ID */
  selectedCategoryId: string | null
  /** 展开的节点集合 */
  expandedIds: Set<string>
  /** 选中变化回调 */
  onSelect: (id: string) => void
  /** 展开/折叠切换回调 */
  onToggleExpand: (id: string) => void
  /** 展开全部/折叠全部回调 */
  onToggleAll: () => void
  /** 新建分类回调 */
  onCreateCategory: () => void
}

/**
 * 左栏：分类树面板 (280px)
 *
 * 包含: 标题栏 + 搜索框 + 树列表 + 底部新建按钮
 */
export function CategoryTreePanel({
  categoryTree,
  selectedCategoryId,
  expandedIds,
  onSelect,
  onToggleExpand,
  onToggleAll,
  onCreateCategory,
}: CategoryTreePanelProps) {
  const [treeSearch, setTreeSearch] = React.useState('')

  /**
   * 递归渲染树形节点
   */
  function renderTreeNodes(nodes: CategoryNode[], depth: number = 0): React.ReactNode[] {
    const result: React.ReactNode[] = []
    const query = treeSearch.toLowerCase().trim()

    for (const node of nodes) {
      const isExpanded = expandedIds.has(node.id)
      const isSelected = selectedCategoryId === node.id
      const matchesSearch = !query || node.name.toLowerCase().includes(query)

      // 搜索时：如果自身不匹配，检查是否有子分类匹配
      if (!matchesSearch && !node.children?.some(child =>
        child.name.toLowerCase().includes(query)
      )) continue

      result.push(
        <button
          key={node.id}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-left',
            'text-body-sm motion-safe:transition-colors motion-safe:duration-100',
            'hover:bg-surface-alt rounded-lg',
            isSelected && 'bg-ds-accent-subtle text-primary',
            !isSelected && 'text-fg-secondary',
          )}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
          onClick={() => {
            onSelect(node.id)
            if (node.children?.length) {
              onToggleExpand(node.id)
            }
          }}
        >
          {/* 展开箭头 */}
          {node.children?.length ? (
            <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </span>
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}

          {/* 分类名称 */}
          <span className="flex-1 truncate font-medium">{node.name}</span>

          {/* 子分类计数 */}
          {node.children?.length ? (
            <span className="text-caption text-fg-muted flex-shrink-0">{node.children.length}</span>
          ) : null}
        </button>
      )

      // 递归渲染子节点（仅在展开时）
      if (isExpanded && node.children?.length) {
        result.push(...renderTreeNodes(node.children, depth + 1))
      }
    }

    return result
  }

  return (
    <div className="w-[280px] flex-shrink-0 flex flex-col border-r border-border-default pr-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="heading-3">分类列表</h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-caption text-fg-muted h-6"
          onClick={onToggleAll}
        >
          {expandedIds.size > 0 ? '折叠全部' : '展开全部'}
        </Button>
      </div>

      {/* 树搜索 */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted" />
        <input
          type="text"
          value={treeSearch}
          onChange={(e) => setTreeSearch(e.target.value)}
          placeholder="搜索分类..."
          className="w-full h-8 pl-8 pr-3 bg-bg border-none rounded-lg text-body-sm placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* 树列表 */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5">
          {categoryTree.length === 0 ? (
            <div className="py-8 text-center text-caption text-fg-muted">暂无分类</div>
          ) : (
            renderTreeNodes(categoryTree)
          )}
        </div>
      </ScrollArea>

      {/* 底部新建按钮 */}
      <Button
        variant="ghost"
        className="mt-3 gap-2 text-body-sm text-fg-muted hover:text-primary w-full justify-start"
        onClick={onCreateCategory}
      >
        <Plus className="h-4 w-4" />
        新建分类
      </Button>
    </div>
  )
}
