'use client'

/**
 * File: media-detail-info.tsx
 * Description: 文件详情信息区 — 标签-值对展示文件元数据
 *              基于 Paper Design 详情面板规格
 */

import type { AdminMediaAsset, AdminMediaAssetReference } from '@/contracts/dtos/admin/media-assets.dto'

/** 格式化文件大小 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/** 格式化日期时间 */
function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 获取文件类型中文名 */
function getContentTypeLabel(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'JPEG 图片',
    'image/png': 'PNG 图片',
    'image/gif': 'GIF 图片',
    'image/webp': 'WebP 图片',
    'image/svg+xml': 'SVG 图片',
    'video/mp4': 'MP4 视频',
    'video/webm': 'WebM 视频',
    'audio/mpeg': 'MP3 音频',
    'audio/wav': 'WAV 音频',
    'application/pdf': 'PDF 文档',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word 文档',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel 表格',
  }
  return map[contentType] || contentType
}

interface MediaDetailInfoProps {
  asset: AdminMediaAsset
  references: AdminMediaAssetReference[]
}

/** 信息行组件 — Paper Design: flex 行, 10px 16px padding, 80px label */
function InfoRow({ label, value, isLink }: { label: string; value: string; isLink?: boolean }) {
  return (
    <div className="flex items-center gap-3" style={{ padding: '10px 16px', borderBottom: '1px solid rgba(38,37,30,0.04)' }}>
      <span
        className="text-[12px] shrink-0"
        style={{ width: '80px', color: 'var(--fg-muted)' }}
      >
        {label}
      </span>
      {isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] truncate hover:underline"
          style={{
            color: 'var(--ds-accent)',
            fontFamily: 'var(--font-mono)',
            wordBreak: 'break-all',
          }}
        >
          {value}
        </a>
      ) : (
        <span className="text-[12px]" style={{ color: 'var(--fg)' }}>
          {value}
        </span>
      )}
    </div>
  )
}

/**
 * Function: MediaDetailInfo
 *
 * Description: 文件详情信息区
 * - Paper Design: 边框容器圆角 8px, 标签-值对, 含分辨率/上传者字段
 * - 引用此文件区
 */
export function MediaDetailInfo({ asset, references }: MediaDetailInfoProps) {
  const fileName = asset.objectKey.split('/').pop() || 'unknown'

  return (
    <div className="flex flex-col gap-4">
      {/* 文件信息区 — Paper Design: border 容器, 圆角 8px */}
      <div
        style={{
          borderRadius: '8px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        <InfoRow label="文件类型" value={getContentTypeLabel(asset.contentType)} />
        <InfoRow label="文件大小" value={formatBytes(asset.sizeBytes)} />
        {/* Paper Design: 分辨率字段 — 从 metadata 中读取 width/height */}
        {asset.metadata?.width && asset.metadata?.height && (
          <InfoRow label="分辨率" value={`${asset.metadata.width} × ${asset.metadata.height}`} />
        )}
        <InfoRow label="上传时间" value={formatDateTime(asset.createdAt)} />
        <InfoRow label="上传者" value="管理员" />
        {asset.url && (
          <InfoRow label="URL" value={asset.url} isLink />
        )}
      </div>

      {/* 引用此文件区 — Paper Design: 12px/600 标题, 引用项含图标 */}
      {references.length > 0 && (
        <div>
          <h4 className="text-[12px] font-semibold mb-2" style={{ color: 'var(--fg)' }}>
            引用此文件
          </h4>
          <div className="flex flex-col gap-1">
            {references.map((ref) => (
              <div
                key={ref.id}
                className="flex items-center gap-2 px-3 py-2"
                style={{
                  borderRadius: '6px',
                  backgroundColor: 'var(--surface-alt)',
                }}
              >
                <span className="text-[11px]" style={{ color: 'var(--fg-secondary)' }}>{ref.title}</span>
                <span className="text-[11px] capitalize" style={{ color: 'var(--fg-muted)' }}>{ref.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
