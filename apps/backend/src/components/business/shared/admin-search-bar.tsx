'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface AdminSearchBarProps {
  placeholder: string
  value: string
  onChange: (value: string) => void
  /** 是否显示快捷键提示（⌘K） */
  showShortcut?: boolean
  className?: string
}

/**
 * Component: AdminSearchBar
 *
 * Description: 管理后台共享搜索栏组件，提供一致的搜索体验
 *              pill 圆角容器 + 搜索图标 + 可选快捷键提示
 *
 * Parameters:
 *     placeholder(string): 搜索框占位符文本
 *     value(string): 搜索框当前值
 *     onChange(function): 搜索值变化回调
 *     showShortcut(boolean, optional): 是否显示 ⌘K 快捷键提示，默认 true
 *     className(string, optional): 自定义样式类名
 *
 * Returns:
 *     JSX.Element: 搜索栏组件
 *
 * Example:
 *     <AdminSearchBar
 *       placeholder="搜索用户..."
 *       value={search}
 *       onChange={setSearch}
 *     />
 */
export function AdminSearchBar({
  placeholder,
  value,
  onChange,
  showShortcut = true,
  className,
}: AdminSearchBarProps) {
  return (
    <div className={cn('relative w-full md:w-96', className)}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-full bg-muted/50 border border-border pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
      />
      {showShortcut && (
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-5 select-none items-center gap-0.5 rounded-md border border-border bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      )}
    </div>
  )
}

export type { AdminSearchBarProps }
