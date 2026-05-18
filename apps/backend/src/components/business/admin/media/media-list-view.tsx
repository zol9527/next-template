'use client'

/**
 * File: media-list-view.tsx
 * Description: 媒体列表视图 — 表格式布局，包含表头和数据行
 *              基于 Paper Design 列表视图规格
 */

import * as React from 'react'
import { ImageIcon, Video, FileText, Music, Loader2 } from 'lucide-react'
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

/** 文件扩展名 */
function getExtension(contentType: string): string {
  return contentType.split('/')[1]?.toUpperCase() || contentType.toUpperCase()
}

/** 根据文件类型获取图标颜色 */
function getTypeColor(contentType: string): string {
  if (contentType.startsWith('image/')) return '#f59e0b'
  if (contentType.startsWith('video/')) return '#3b82f6'
  if (contentType.startsWith('audio/')) return '#8b5cf6'
  if (contentType.includes('pdf')) return '#ef4444'
  return 'var(--fg-muted)'
}

/** 文件类型图标 */
function getFileIcon(contentType: string) {
  if (contentType.startsWith('image/')) return ImageIcon
  if (contentType.startsWith('video/')) return Video
  if (contentType.startsWith('audio/')) return Music
  return FileText
}

interface MediaListViewProps {
  items: AdminMediaAsset[]
  isLoading: boolean
  onDeleteClick: (assetId: string) => void
  onDetailClick: (assetId: string) => void
}

/** 列定义 */
const COLUMNS = [
  { key: 'checkbox', label: '', width: '40px' },
  { key: 'name', label: '文件名', width: 'flex' },
  { key: 'type', label: '类型', width: '80px' },
  { key: 'size', label: '大小', width: '90px' },
  { key: 'date', label: '上传时间', width: '110px' },
  { key: 'actions', label: '操作', width: '50px' },
] as const

/**
 * Function: MediaListView
 *
 * Description: 列表视图容器
 * - 表头: 35px 高, background var(--surface-alt)
 * - 表头文字: heading-4 样式 (11px, 600, uppercase, letter-spacing 0.04em)
 * - 数据行: ~57px, 底部分隔线
 * - hover: var(--ds-accent-subtle) 背景
 */
export function MediaListView({
  items,
  isLoading,
  onDeleteClick,
  onDetailClick,
}: MediaListViewProps) {
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
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>暂无媒体资源</p>
      </div>
    )
  }

  return (
    <div
      className="overflow-hidden"
      style={{
        borderRadius: 'var(--radius-md, 12px)',
        border: '1px solid var(--border)',
      }}
    >
      {/* 表头 */}
      <div
        className="flex items-center"
        style={{
          height: '35px',
          backgroundColor: 'var(--surface-alt)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            className="heading-4"
            style={{
              width: col.width === 'flex' ? undefined : col.width,
              flex: col.width === 'flex' ? 1 : undefined,
              paddingLeft: col.key === 'checkbox' ? '12px' : '8px',
              paddingRight: '8px',
            }}
          >
            {col.label}
          </div>
        ))}
      </div>

      {/* 数据行 */}
      {items.map((asset) => {
        const fileName = asset.objectKey.split('/').pop() || 'unknown'
        const ext = getExtension(asset.contentType)
        const typeColor = getTypeColor(asset.contentType)
        const FileIcon = getFileIcon(asset.contentType)

        return (
          <div
            key={asset.id}
            className="group flex items-center cursor-pointer transition-colors"
            style={{
              minHeight: '57px',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'transparent',
            }}
            onClick={() => onDetailClick(asset.id)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--ds-accent-subtle)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            {/* 复选框列 */}
            <div style={{ width: '40px', paddingLeft: '12px' }}>
              <input
                type="checkbox"
                className="rounded"
                style={{ accentColor: 'var(--ds-accent)' }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* 文件名列 */}
            <div className="flex items-center gap-2.5 min-w-0" style={{ flex: 1 }}>
              <div
                className="flex items-center justify-center shrink-0"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm, 8px)',
                  backgroundColor: `${typeColor}15`,
                }}
              >
                <FileIcon style={{ width: '18px', height: '18px', color: typeColor }} />
              </div>
              <span
                className="text-sm truncate"
                style={{ color: 'var(--fg)', fontWeight: 500 }}
                title={fileName}
              >
                {fileName}
              </span>
            </div>

            {/* 类型列 */}
            <div style={{ width: '80px', paddingRight: '8px' }}>
              <span
                className="inline-block text-xs font-medium"
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill, 9999px)',
                  backgroundColor: `${typeColor}15`,
                  color: typeColor,
                }}
              >
                {ext}
              </span>
            </div>

            {/* 大小列 */}
            <div
              className="text-sm"
              style={{ width: '90px', paddingRight: '8px', color: 'var(--fg-secondary)' }}
            >
              {formatBytes(asset.sizeBytes)}
            </div>

            {/* 上传时间列 */}
            <div
              className="text-sm"
              style={{ width: '110px', paddingRight: '8px', color: 'var(--fg-secondary)' }}
            >
              {formatDate(asset.createdAt)}
            </div>

            {/* 操作列 */}
            <div style={{ width: '50px', paddingRight: '8px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteClick(asset.id)
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                style={{ color: 'var(--error)' }}
              >
                删除
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
