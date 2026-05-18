'use client'

/**
 * File: media-grid-card.tsx
 * Description: 媒体网格卡片组件，显示缩略图、文件信息和操作
 *              基于 Paper Design 网格卡片规格
 */

import * as React from 'react'
import { ImageIcon, Video, FileText, Music, Play, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AdminMediaAsset } from '@/contracts/dtos/admin/media-assets.dto'

/** 格式化文件大小 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/** 格式化日期 */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 根据媒体资产获取显示 URL */
function getMediaUrl(asset: AdminMediaAsset): string | null {
  if (asset.url) return asset.url
  switch (asset.provider) {
    case 'local':
      return `/api/v1/public/files/${asset.objectKey}`
    case 'aliyun_oss':
      return `/api/v1/admin/storage/oss/files/${asset.objectKey}`
    default:
      return null
  }
}

/** 文件扩展名提取 */
function getFileExtension(contentType: string): string {
  const parts = contentType.split('/')
  return parts[1]?.toUpperCase() || contentType.toUpperCase()
}

/** 根据文件类型获取图标颜色 */
function getTypeColor(contentType: string): string {
  if (contentType.startsWith('image/')) return '#f59e0b'  // 橙色 (JPG/PNG)
  if (contentType.startsWith('video/')) return '#3b82f6'  // 蓝色 (MP4)
  if (contentType.startsWith('audio/')) return '#8b5cf6'  // 紫色
  if (contentType.includes('pdf')) return '#ef4444'       // 红色 (PDF)
  if (contentType.includes('sheet') || contentType.includes('xlsx') || contentType.includes('excel')) return '#22c55e' // 绿色 (XLSX)
  if (contentType.includes('word') || contentType.includes('doc')) return '#26251e'   // 黑色 (DOC)
  if (contentType.includes('presentation') || contentType.includes('ppt')) return '#f97316' // 橙色 (PPT)
  return 'var(--fg-muted)'
}

/** 根据文件类型获取图标 */
function getFileIcon(contentType: string) {
  if (contentType.startsWith('image/')) return ImageIcon
  if (contentType.startsWith('video/')) return Video
  if (contentType.startsWith('audio/')) return Music
  return FileText
}

interface MediaGridCardProps {
  asset: AdminMediaAsset
  selected?: boolean
  onSelect?: (selected: boolean) => void
  onDeleteClick?: (assetId: string) => void
  onDetailClick?: (assetId: string) => void
}

/**
 * Function: MediaGridCard
 *
 * Description: 网格视图中的媒体卡片
 * - 圆角 var(--radius-md)
 * - 边框 1px solid var(--border)
 * - hover: var(--shadow-hover) + 显示操作按钮
 * - 左上角复选框
 * - 底部文件名 + 大小 + 日期
 */
export function MediaGridCard({
  asset,
  selected = false,
  onSelect,
  onDeleteClick,
  onDetailClick,
}: MediaGridCardProps) {
  const displayUrl = getMediaUrl(asset)
  const isImage = asset.contentType.startsWith('image/')
  const isVideo = asset.contentType.startsWith('video/')
  const [imageLoadFailed, setImageLoadFailed] = React.useState(false)
  const fileName = asset.objectKey.split('/').pop() || 'unknown'
  const ext = getFileExtension(asset.contentType)
  const typeColor = getTypeColor(asset.contentType)
  const FileIcon = getFileIcon(asset.contentType)

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden transition-all duration-200 cursor-pointer',
      )}
      style={{
        borderRadius: 'var(--radius-md, 12px)',
        border: selected ? '2px solid var(--ds-accent)' : '1px solid var(--border)',
        height: '209px',
        backgroundColor: 'var(--surface)',
      }}
      onClick={() => onDetailClick?.(asset.id)}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.boxShadow = 'var(--shadow-hover)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.boxShadow = 'none'
      }}
    >
      {/* 左上角复选框 */}
      <div
        className="absolute top-2 left-2 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onSelect?.(!selected)}
          className="flex items-center justify-center transition-colors"
          style={{
            width: '20px',
            height: '20px',
            borderRadius: 'var(--radius-sm, 8px)',
            border: selected ? 'none' : '1.5px solid var(--border-medium)',
            backgroundColor: selected ? 'var(--ds-accent)' : 'rgba(255,255,255,0.9)',
          }}
        >
          {selected && (
            <Check style={{ width: '14px', height: '14px', color: '#ffffff' }} />
          )}
        </button>
      </div>

      {/* 缩略图/文件图标区 */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: isImage ? 'var(--surface-alt)' : 'var(--surface-alt)' }}
      >
        {isImage && displayUrl && !imageLoadFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt={fileName}
            className="w-full h-full object-cover"
            onError={() => setImageLoadFailed(true)}
          />
        ) : isVideo && displayUrl ? (
          <div className="relative w-full h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl}
              alt={fileName}
              className="w-full h-full object-cover"
              onError={() => setImageLoadFailed(true)}
            />
            {/* 播放图标覆盖 */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.9)',
                }}
              >
                <Play style={{ width: '18px', height: '18px', color: 'var(--fg)', marginLeft: '2px' }} />
              </div>
            </div>
          </div>
        ) : (
          // 文件类型图标
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex items-center justify-center"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-md, 12px)',
                backgroundColor: `${typeColor}15`,
              }}
            >
              <FileIcon style={{ width: '24px', height: '24px', color: typeColor }} />
            </div>
            <span
              className="text-xs font-medium"
              style={{ color: typeColor }}
            >
              {ext}
            </span>
          </div>
        )}

        {/* Hover 操作覆盖层 */}
        <div
          className="absolute inset-0 flex items-center justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {onDeleteClick && (
            <button
              onClick={() => onDeleteClick(asset.id)}
              className="flex items-center justify-center"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-sm, 8px)',
                backgroundColor: 'rgba(255,255,255,0.9)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <span style={{ fontSize: '14px', color: 'var(--error)' }}>×</span>
            </button>
          )}
        </div>
      </div>

      {/* 底部文件信息区 */}
      <div
        className="flex flex-col gap-0.5 px-3 py-2"
        style={{
          borderTop: '1px solid var(--border)',
        }}
      >
        <p
          className="truncate text-[13px] font-medium"
          style={{ color: 'var(--fg)' }}
          title={fileName}
        >
          {fileName}
        </p>
        <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
          {formatBytes(asset.sizeBytes)} · {formatDate(asset.createdAt)}
        </p>
      </div>
    </div>
  )
}
