'use client'

/**
 * File: media-toolbar.tsx
 * Description: 媒体库工具栏 — 面包屑 + 搜索 + 视图切换 + 上传按钮
 */

import { Search, LayoutGrid, List, Upload, ChevronRight } from 'lucide-react'
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
      className="flex items-center"
      style={{
        height: 'var(--card-header-height, 60px)',
        paddingLeft: 'var(--space-7, 28px)',
        paddingRight: 'var(--space-7, 28px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* 左侧：面包屑 — Paper Design: fg-secondary + chevron + fg 标题 */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[13px]" style={{ color: 'var(--fg-secondary)' }}>内容管理</span>
        <ChevronRight style={{ width: '14px', height: '14px', color: 'var(--fg-muted)' }} />
        <span className="text-[18px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>媒体库</span>
      </div>

      {/* 弹性占位 — 把右侧工具推到最右边 */}
      <div className="flex-1" />

      {/* 右侧工具组：搜索框 + 视图切换 + 上传按钮 */}
      <div className="flex items-center shrink-0" style={{ gap: '8px' }}>
        {/* 搜索框 — Paper Design: pill 圆角, bg 背景, 紧贴右侧工具 */}
        <div className="relative" style={{ width: '220px' }}>
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ width: '16px', height: '16px', color: 'var(--fg-muted)' }}
          />
          <Input
            placeholder="搜索文件..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-[33px] border-0 shadow-none"
            style={{
              borderRadius: 'var(--radius-pill, 9999px)',
              backgroundColor: 'var(--bg, #f2f1ed)',
              color: 'var(--fg)',
              fontSize: '12px',
            }}
          />
        </div>

        {/* 视图切换 — Paper Design: bg 色底, active 白色+阴影, inactive 透明 */}
        <div
          className="flex items-center gap-0.5 p-0.5"
          style={{
            borderRadius: 'var(--radius-sm, 8px)',
            backgroundColor: 'var(--bg, #f2f1ed)',
          }}
        >
          <button
            onClick={() => onViewModeChange('grid')}
            className="flex items-center justify-center transition-all"
            style={{
              width: '32px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: viewMode === 'grid' ? 'var(--surface, #ffffff)' : 'transparent',
              color: viewMode === 'grid' ? 'var(--fg)' : 'var(--fg-muted, #9c9a91)',
              boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(38,37,30,0.08)' : 'none',
            }}
          >
            <LayoutGrid style={{ width: '18px', height: '18px' }} />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className="flex items-center justify-center transition-all"
            style={{
              width: '32px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: viewMode === 'list' ? 'var(--surface, #ffffff)' : 'transparent',
              color: viewMode === 'list' ? 'var(--fg)' : 'var(--fg-muted, #9c9a91)',
              boxShadow: viewMode === 'list' ? '0 1px 3px rgba(38,37,30,0.08)' : 'none',
            }}
          >
            <List style={{ width: '18px', height: '18px' }} />
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
          <Upload style={{ width: '16px', height: '16px' }} />
          上传文件
        </Button>
      </div>
    </div>
  )
}
