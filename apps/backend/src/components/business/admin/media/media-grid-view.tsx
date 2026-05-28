'use client'

/**
 * File: media-grid-view.tsx
 * Description: 媒体网格视图容器，包含网格卡片布局和空状态
 */

import { Loader2, ImageIcon } from 'lucide-react'
import { MediaGridCard } from './media-grid-card'
import type { AdminMediaAsset } from '@/contracts/dtos/admin/media-assets.dto'

interface MediaGridViewProps {
  items: AdminMediaAsset[]
  isLoading: boolean
  onDeleteClick: (assetId: string) => void
  onDetailClick: (assetId: string) => void
}

/**
 * Function: MediaGridView
 *
 * Description: 网格视图容器
 * - CSS Grid 5列自适应布局
 * - 加载状态、空状态
 * - 传递事件给 MediaGridCard
 */
export function MediaGridView({
  items,
  isLoading,
  onDeleteClick,
  onDetailClick,
}: MediaGridViewProps) {
  // 加载状态
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2
          className="animate-spin"
          style={{ width: 'var(--icon-lg, 32px)', height: 'var(--icon-lg, 32px)', color: 'var(--ds-accent)' }}
        />
        <p className="mt-3 text-sm" style={{ color: 'var(--fg-muted)' }}>加载中...</p>
      </div>
    )
  }

  // 空状态
  if (items.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20"
        style={{
          backgroundColor: 'var(--surface-alt)',
          borderRadius: 'var(--radius-md, 12px)',
          border: '1px dashed var(--border-medium)',
        }}
      >
        <div
          className="flex items-center justify-center mb-4"
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'var(--surface-alt)',
          }}
        >
          <ImageIcon style={{ width: '40px', height: '40px', color: 'var(--fg-muted)', opacity: 0.3 }} />
        </div>
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>暂无媒体资源，开始上传吧</p>
      </div>
    )
  }

  // 网格布局
  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      }}
    >
      {items.map((asset) => (
        <MediaGridCard
          key={asset.id}
          asset={asset}
          onDeleteClick={onDeleteClick}
          onDetailClick={onDetailClick}
        />
      ))}
    </div>
  )
}
