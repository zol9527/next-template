'use client'

/**
 * File: media-toolbar.tsx
 * Description: 媒体库工具栏 — 面包屑 + 搜索 + 视图切换 + 上传按钮
 */

import { Search, LayoutGrid, List, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type ViewMode = 'grid' | 'list'

interface MediaToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onUploadClick: () => void
}

/**
 * Function: MediaToolbar
 *
 * Description: 媒体库顶部工具栏，包含面包屑导航、搜索框、视图切换和上传按钮
 */
export function MediaToolbar({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onUploadClick,
}: MediaToolbarProps) {
  return (
    <div
      className="flex items-center justify-between gap-4"
      style={{
        height: 'var(--card-header-height, 60px)',
        paddingLeft: 'var(--space-7, 28px)',
        paddingRight: 'var(--space-7, 28px)',
      }}
    >
      {/* 左侧：面包屑 */}
      <div className="flex items-center gap-1.5 text-sm shrink-0">
        <span style={{ color: 'var(--fg-secondary)' }}>内容管理</span>
        <span style={{ color: 'var(--fg-muted)' }}>/</span>
        <span style={{ color: 'var(--fg)' }} className="font-medium">媒体库</span>
      </div>

      {/* 中间：搜索框 */}
      <div className="relative" style={{ width: '220px' }}>
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2"
          style={{ width: 'var(--icon-sm, 20px)', height: 'var(--icon-sm, 20px)', color: 'var(--fg-muted)' }}
        />
        <Input
          placeholder="搜索文件..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-[33px] text-sm"
          style={{
            borderRadius: 'var(--radius-sm, 8px)',
            borderColor: 'var(--border)',
          }}
        />
      </div>

      {/* 右侧：视图切换 + 上传按钮 */}
      <div className="flex items-center gap-2 shrink-0">
        {/* 视图切换 */}
        <div className="flex" style={{ borderRadius: 'var(--radius-sm, 8px)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <button
            onClick={() => onViewModeChange('grid')}
            className="flex items-center justify-center transition-colors"
            style={{
              width: '32px',
              height: '30px',
              backgroundColor: viewMode === 'grid' ? 'var(--ds-accent)' : 'transparent',
              color: viewMode === 'grid' ? '#ffffff' : 'var(--fg-secondary)',
            }}
          >
            <LayoutGrid style={{ width: 'var(--icon-sm, 20px)', height: 'var(--icon-sm, 20px)' }} />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className="flex items-center justify-center transition-colors"
            style={{
              width: '32px',
              height: '30px',
              backgroundColor: viewMode === 'list' ? 'var(--ds-accent)' : 'transparent',
              color: viewMode === 'list' ? '#ffffff' : 'var(--fg-secondary)',
            }}
          >
            <List style={{ width: 'var(--icon-sm, 20px)', height: 'var(--icon-sm, 20px)' }} />
          </button>
        </div>

        {/* 上传按钮 */}
        <Button
          onClick={onUploadClick}
          className="text-white text-sm font-medium flex items-center gap-1.5"
          style={{
            backgroundColor: 'var(--ds-accent)',
            borderRadius: 'var(--radius-sm, 8px)',
            height: '31px',
            width: '102px',
          }}
        >
          <Upload style={{ width: 'var(--icon-sm, 20px)', height: 'var(--icon-sm, 20px)' }} />
          上传文件
        </Button>
      </div>
    </div>
  )
}
