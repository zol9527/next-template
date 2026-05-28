'use client'

import * as React from 'react'
import { Search, Filter, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

/**
 * 用户列表 CardHeader
 *
 * 左侧: "用户管理" 标题 + "N 位用户" 灰色副标题
 * 右侧: 搜索框 + 筛选按钮 + "添加用户" 主色按钮
 */

interface UserListHeaderProps {
  totalCount: number
  search: string
  onSearchChange: (value: string) => void
  onFilterClick?: () => void
}

export function UserListHeader({ totalCount, search, onSearchChange, onFilterClick }: UserListHeaderProps) {
  const { toast } = useToast()

  const handleAddUser = React.useCallback(() => {
    toast({ title: '功能开发中', description: '添加用户功能正在开发中' })
  }, [toast])

  return (
    <div className="flex items-start justify-between gap-4">
      {/* 左侧标题 */}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
          用户管理
        </h2>
        <p className="text-sm text-[var(--fg-muted,#6B6960)]">
          {totalCount} 位用户
        </p>
      </div>

      {/* 右侧操作区 */}
      <div className="flex items-center gap-3">
        {/* 搜索框 */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-faint,#9C9A91)]" />
          <Input
            type="text"
            placeholder="搜索用户..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 bg-white border-[var(--border)] rounded-lg text-sm"
          />
        </div>

        {/* 筛选按钮 */}
        <Button
          variant="outline"
          size="icon"
          onClick={onFilterClick}
          className="h-9 w-9 rounded-lg border-[var(--border)]"
        >
          <Filter className="h-4 w-4" />
        </Button>

        {/* 添加用户按钮 */}
        <Button
          onClick={handleAddUser}
          className="h-9 rounded-lg bg-[var(--ds-accent,#F54E00)] hover:bg-[var(--ds-accent-hover,#D94400)] text-white font-medium text-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          添加用户
        </Button>
      </div>
    </div>
  )
}
