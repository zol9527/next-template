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

/** 根据文件类型获取图标颜色 — 使用设计系统令牌 */
function getTypeColor(contentType: string): string {
  if (contentType.startsWith('image/')) return 'var(--ds-accent, #f54e00)'       // 暖橙 (JPG/PNG)
  if (contentType.startsWith('video/')) return 'var(--teal, #1f8a65)'            // 青绿 (MP4)
  if (contentType.startsWith('audio/')) return 'var(--gold, #c08532)'             // 金棕 (MP3)
  if (contentType.includes('pdf')) return 'var(--rose, #cf2d56)'                  // 玫红 (PDF)
  if (contentType.includes('sheet') || contentType.includes('xlsx') || contentType.includes('excel')) return 'var(--teal, #1f8a65)' // 青绿 (XLSX)
  if (contentType.includes('word') || contentType.includes('doc')) return 'var(--fg)'   // 主色 (DOC)
  if (contentType.includes('presentation') || contentType.includes('ppt')) return 'var(--ds-accent, #f54e00)' // 暖橙 (PPT)
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

  // 解析 CSS 变量为 hex 值用于拼接透明度
  const typeColorHex = React.useMemo(() => {
    const cssVar = typeColor
    if (cssVar.startsWith('var(')) return '' // 运行时无法解析，使用 fallback
    return cssVar
  }, [typeColor])

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
      {/* 左上角复选框 — Paper Design: 20px, 圆角 4px */}
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
            borderRadius: '4px',
            border: selected ? 'none' : '1.5px solid rgba(255,255,255,0.6)',
            backgroundColor: selected ? 'var(--ds-accent)' : 'rgba(0,0,0,0.15)',
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
          // 文件类型图标 — Paper Design: 实色块 + 白色扩展名
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex items-center justify-center"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-md, 12px)',
                backgroundColor: typeColor,
              }}
            >
              <FileIcon style={{ width: '24px', height: '24px', color: 'rgba(255,255,255,0.8)' }} />
            </div>
            <span
              className="text-xs font-bold"
              style={{ color: typeColor }}
            >
              {ext}
            </span>
          </div>
        )}

        {/* Paper Design: 网格卡片不显示 hover 删除按钮，操作通过详情面板进行 */}
      </div>

      {/* 底部文件信息区 — Paper Design: 10px padding, 12px/500 文件名, 10px meta */}
      <div
        className="flex flex-col gap-0.5 px-3 py-2.5"
        style={{
          borderTop: '1px solid var(--border)',
        }}
      >
        <p
          className="truncate font-medium"
          style={{ color: 'var(--fg)', fontSize: '12px' }}
          title={fileName}
        >
          {fileName}
        </p>
        <p style={{ color: 'var(--fg-muted)', fontSize: '10px' }}>
          {formatBytes(asset.sizeBytes)} · {formatDate(asset.createdAt)}
        </p>
      </div>
    </div>
  )
}
