'use client'

import * as React from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * 用户列表高级筛选栏
 *
 * 搜索框 + 状态/角色/部门下拉 + Chip 行
 */

export interface FilterChip {
  key: string
  label: string
  value: string
  color?: string
}

interface UserFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  chips?: FilterChip[]
  onRemoveChip?: (key: string) => void
  onClearAll?: () => void
  children?: React.ReactNode // 额外的下拉按钮
}

export function UserFilterBar({
  search,
  onSearchChange,
  chips = [],
  onRemoveChip,
  onClearAll,
  children,
}: UserFilterBarProps) {
  const hasChips = chips.length > 0

  return (
    <div className="flex flex-col gap-3">
      {/* 筛选栏主体 */}
      <div className="flex items-center gap-3">
        {/* 搜索框 */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-faint,#9C9A91)]" />
          <Input
            type="text"
            placeholder="搜索..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 bg-white border-[var(--border)] rounded-lg text-sm"
          />
          {/* 快捷键提示 */}
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-[var(--border)] bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-[var(--fg-faint,#9C9A91)]">
            ⌘K
          </kbd>
        </div>

        {/* 下拉筛选按钮 */}
        {children}

        {/* 已筛选标签 */}
        {hasChips && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[var(--ds-accent,#F54E00)]/10 text-[var(--ds-accent,#F54E00)] text-xs font-medium">
            已筛选
          </span>
        )}
      </div>

      {/* 筛选 Chip 行 */}
      {hasChips && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[var(--fg-faint,#9C9A91)]">已选条件:</span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => onRemoveChip?.(chip.key)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-[9999px] text-xs font-medium border transition-colors',
                chip.color
                  ? `bg-[var(${chip.color})]/5 text-[var(${chip.color})] border-[var(${chip.color})]/20`
                  : 'bg-[var(--ds-accent,#F54E00)]/5 text-[var(--ds-accent,#F54E00)] border-[var(--ds-accent,#F54E00)]/20'
              )}
            >
              {chip.label}: {chip.value}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button
            onClick={onClearAll}
            className="text-xs text-[var(--fg-muted,#6B6960)] hover:text-[var(--fg,#26251E)] transition-colors"
          >
            清除全部
          </button>
        </div>
      )}
    </div>
  )
}
