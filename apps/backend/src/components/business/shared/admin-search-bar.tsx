'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface AdminSearchBarProps {
  placeholder: string
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * Component: AdminSearchBar
 *
 * Description: 管理后台共享搜索栏组件，提供一致的搜索体验
 *
 * Parameters:
 *     placeholder(string): 搜索框占位符文本
 *     value(string): 搜索框当前值
 *     onChange(function): 搜索值变化回调
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
  className,
}: AdminSearchBarProps) {
  return (
    <div className={cn("relative w-full md:w-96", className)}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-muted/5 border border-border/10 py-3 pl-12 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
      />
    </div>
  )
}

export type { AdminSearchBarProps }
