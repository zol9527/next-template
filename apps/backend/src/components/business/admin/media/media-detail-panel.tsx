'use client'

/**
 * File: media-detail-panel.tsx
 * Description: 文件详情侧边栏（Sheet 组件）
 *              基于 Paper Design DetailPanel 规格
 */

import * as React from 'react'
import { X, Download, Link2, Trash2, Pencil } from 'lucide-react'
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import type { AdminMediaAsset, AdminMediaAssetReference } from '@/contracts/dtos/admin/media-assets.dto'
import { MediaDetailInfo } from './media-detail-info'

/** 格式化文件大小 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

interface MediaDetailPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  asset: AdminMediaAsset | null
  references: AdminMediaAssetReference[]
  onDeleteClick?: (assetId: string) => void
  onRenameClick?: (assetId: string) => void
}

/**
 * Function: MediaDetailPanel
 *
 * Description: 文件详情侧边栏
 * - Sheet 右侧滑出, 420px 宽
 * - Paper Design: 头部 71px, 预览区 4:3, 元数据表, 引用区, 底部 3 等宽按钮
 */
export function MediaDetailPanel({
  open,
  onOpenChange,
  asset,
  references,
  onDeleteClick,
  onRenameClick,
}: MediaDetailPanelProps) {
  if (!asset) return null

  const isImage = asset.contentType.startsWith('image/')
  const fileName = asset.objectKey.split('/').pop() || 'unknown'
  const displayUrl = asset.url

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="!gap-0 !max-w-none !border-l-0 !bg-[var(--surface)] overflow-y-auto"
        style={{
          width: '420px',
          maxWidth: '100vw',
          padding: 0,
          boxShadow: '-4px 0 24px rgba(38,37,30,0.078)',
        }}
      >
        {/* 头部 — Paper Design: 71px 高度, 右侧 3 个图标按钮 */}
        <div
          className="flex flex-row items-center justify-between shrink-0 px-6"
          style={{
            height: '71px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold" style={{ color: 'var(--fg)' }}>
            文件详情
          </h2>
          <div className="flex items-center gap-1">
            {/* 下载按钮 — Paper Design: 30px, bg 色底 */}
            {displayUrl && (
              <a
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center justify-center transition-colors"
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: 'var(--radius-sm, 8px)',
                  backgroundColor: 'var(--bg, #f2f1ed)',
                  color: 'var(--fg-secondary)',
                }}
              >
                <Download style={{ width: '16px', height: '16px' }} />
              </a>
            )}
            {/* 复制链接按钮 */}
            <button
              onClick={() => {
                if (displayUrl) {
                  void navigator.clipboard.writeText(displayUrl)
                }
              }}
              className="flex items-center justify-center transition-colors"
              style={{
                width: '30px',
                height: '30px',
                borderRadius: 'var(--radius-sm, 8px)',
                backgroundColor: 'var(--bg, #f2f1ed)',
                color: 'var(--fg-secondary)',
              }}
            >
              <Link2 style={{ width: '16px', height: '16px' }} />
            </button>
            {/* 关闭按钮 — 唯一的 X */}
            <button
              onClick={() => onOpenChange(false)}
              className="flex items-center justify-center transition-colors"
              style={{
                width: '30px',
                height: '30px',
                borderRadius: 'var(--radius-sm, 8px)',
                color: 'var(--fg-muted)',
              }}
            >
              <X style={{ width: '18px', height: '18px' }} />
            </button>
          </div>
        </div>

        {/* 内容区 — Paper Design: 24px padding, 24px gap */}
        <div className="flex-1 px-6 py-6 space-y-6">
          {/* 预览区 — Paper Design: 372px 宽, 4:3, 圆角 12px */}
          <div
            className="flex items-center justify-center overflow-hidden"
            style={{
              width: '372px',
              aspectRatio: '4/3',
              borderRadius: 'var(--radius-md, 12px)',
              backgroundColor: 'var(--surface-alt)',
              border: '1px solid var(--border)',
              margin: '0 auto',
            }}
          >
            {isImage && displayUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                预览不可用
              </div>
            )}
          </div>

          {/* 文件名区 — Paper Design: 15px/600 文件名, 状态药丸 */}
          <div>
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--fg)' }}>
              {fileName}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              {/* 状态药丸 — Paper Design: 5px 色点 + pill 圆角 */}
              <div
                className="inline-flex items-center gap-1 px-2 py-0.5"
                style={{
                  borderRadius: 'var(--radius-pill, 9999px)',
                  backgroundColor: 'var(--teal-subtle, rgba(31,138,101,0.1))',
                }}
              >
                <div
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--teal)',
                  }}
                />
                <span className="text-[11px] font-medium" style={{ color: 'var(--teal)' }}>已上传</span>
              </div>
              <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{formatBytes(asset.sizeBytes)}</span>
            </div>
          </div>

          {/* 详情信息 */}
          <MediaDetailInfo asset={asset} references={references} />
        </div>

        {/* 底部操作区 — Paper Design: 高度 66px, 3 等宽按钮, 8px gap */}
        <div
          className="flex items-center px-6 shrink-0"
          style={{
            height: '66px',
            borderTop: '1px solid var(--border)',
            gap: '8px',
          }}
        >
          {/* 下载按钮 */}
          {displayUrl ? (
            <a
              href={displayUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="flex-1"
            >
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-1.5"
                style={{ borderRadius: 'var(--radius-sm, 8px)' }}
              >
                <Download style={{ width: '14px', height: '14px', color: 'var(--fg-secondary)' }} />
                <span style={{ color: 'var(--fg-secondary)' }}>下载</span>
              </Button>
            </a>
          ) : (
            <Button
              variant="outline"
              disabled
              className="flex-1 flex items-center justify-center gap-1.5"
              style={{ borderRadius: 'var(--radius-sm, 8px)' }}
            >
              <Download style={{ width: '14px', height: '14px' }} />
              下载
            </Button>
          )}
          {/* 重命名按钮 */}
          <Button
            variant="outline"
            className="flex-1 flex items-center justify-center gap-1.5"
            style={{ borderRadius: 'var(--radius-sm, 8px)' }}
            onClick={() => onRenameClick?.(asset.id)}
          >
            <Pencil style={{ width: '14px', height: '14px', color: 'var(--fg-secondary)' }} />
            <span style={{ color: 'var(--fg-secondary)' }}>重命名</span>
          </Button>
          {/* 删除按钮 — danger 样式 */}
          <Button
            variant="outline"
            className="flex-1 flex items-center justify-center gap-1.5"
            style={{
              borderRadius: 'var(--radius-sm, 8px)',
              color: 'var(--rose, #cf2d56)',
              borderColor: 'rgba(207,45,86,0.2)',
            }}
            onClick={() => onDeleteClick?.(asset.id)}
          >
            <Trash2 style={{ width: '14px', height: '14px' }} />
            删除
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
