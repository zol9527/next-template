'use client'

/**
 * File: media-filter-bar.tsx
 * Description: 媒体库筛选栏 — 分类标签 + 统计 + 存储空间
 */

import { cn } from '@/lib/utils'

export type TypeFilter = 'all' | 'image' | 'video' | 'document' | 'audio'

interface MediaFilterBarProps {
  activeFilter: TypeFilter
  onFilterChange: (filter: TypeFilter) => void
  totalCount: number
  storageUsage: { used: number; total: number; breakdown?: Record<string, number> } | null
}

/** 格式化字节数为可读字符串 */
function formatStorageBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/** 存储使用百分比 */
function getStoragePercent(used: number, total: number): number {
  if (total === 0) return 0
  return Math.min(100, Math.round((used / total) * 100))
}

const FILTER_OPTIONS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'image', label: '图片' },
  { key: 'video', label: '视频' },
  { key: 'document', label: '文档' },
  { key: 'audio', label: '音频' },
]

/**
 * Function: MediaFilterBar
 *
 * Description: 媒体库筛选栏，包含分类标签、文件统计和存储空间进度
 */
export function MediaFilterBar({
  activeFilter,
  onFilterChange,
  totalCount,
  storageUsage,
}: MediaFilterBarProps) {
  const storagePercent = storageUsage
    ? getStoragePercent(storageUsage.used, storageUsage.total)
    : 0

  return (
    <div
      className="flex items-center gap-2"
      style={{
        padding: 'var(--space-6, 24px) var(--space-7, 28px)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* 左侧：分类筛选标签 */}
      <div className="flex items-center gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onFilterChange(opt.key)}
            className={cn(
              'text-sm transition-colors cursor-pointer',
            )}
            style={{
              padding: '4px 12px',
              borderRadius: 'var(--radius-pill, 9999px)',
              backgroundColor: activeFilter === opt.key ? 'var(--ds-accent)' : 'transparent',
              color: activeFilter === opt.key ? '#ffffff' : 'var(--fg-secondary)',
              border: activeFilter === opt.key ? '1px solid var(--ds-accent)' : '1px solid var(--border)',
              fontWeight: 500,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 中间弹性占位 */}
      <div className="flex-1" />

      {/* 中间偏右：统计信息 */}
      <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
        共 {totalCount} 个文件
      </span>

      {/* 右侧：存储空间 */}
      {storageUsage && (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
            已用 {formatStorageBytes(storageUsage.used)} / {formatStorageBytes(storageUsage.total)}
          </span>
          <div
            style={{
              width: '120px',
              height: '6px',
              borderRadius: 'var(--radius-pill, 9999px)',
              backgroundColor: 'var(--border)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${storagePercent}%`,
                borderRadius: 'var(--radius-pill, 9999px)',
                backgroundColor: 'var(--teal)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
