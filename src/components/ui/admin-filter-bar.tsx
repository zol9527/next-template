'use client'

import { cn } from '@/lib/utils'

interface AdminFilterBarProps {
  children?: React.ReactNode
  className?: string
}

// 统一筛选/搜索工具栏容器
export function AdminFilterBar({ children, className }: AdminFilterBarProps) {
  return (
    <div className={cn(
      'bg-muted/30 p-3 border border-border/40 rounded-lg',
      'flex flex-col md:flex-row gap-3 items-center',
      className
    )}>
      {children}
    </div>
  )
}
