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
  SheetHeader,
  SheetTitle,
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
 * - 预览区 + 文件信息 + 操作按钮
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
        className="flex flex-col p-0 overflow-y-auto"
        style={{
          width: '420px',
          maxWidth: '100vw',
          boxShadow: '-4px 0 24px rgba(38,37,30,0.078)',
        }}
      >
        {/* 头部 */}
        <SheetHeader
          className="flex flex-row items-center justify-between shrink-0 px-6"
          style={{
            height: '56px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <SheetTitle className="text-base font-semibold" style={{ color: 'var(--fg)' }}>
            文件详情
          </SheetTitle>
          <div className="flex items-center gap-1">
            {/* 下载按钮 */}
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
                  color: 'var(--fg-secondary)',
                }}
              >
                <Download style={{ width: '18px', height: '18px' }} />
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
                color: 'var(--fg-secondary)',
              }}
            >
              <Link2 style={{ width: '18px', height: '18px' }} />
            </button>
          </div>
        </SheetHeader>

        {/* 内容区 */}
        <div className="flex-1 px-6 py-4 space-y-4">
          {/* 预览区 */}
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

          {/* 文件名区 */}
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>
              {fileName}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--teal)',
                }}
              />
              <span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>已上传</span>
              <span className="text-sm" style={{ color: 'var(--fg-muted)' }}> · {formatBytes(asset.sizeBytes)}</span>
            </div>
          </div>

          {/* 详情信息 */}
          <MediaDetailInfo asset={asset} references={references} />
        </div>

        {/* 底部操作区 */}
        <div
          className="flex flex-col gap-2 px-6 py-4 shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              style={{ borderRadius: 'var(--radius-sm, 8px)' }}
              onClick={() => onRenameClick?.(asset.id)}
            >
              <Pencil style={{ width: '14px', height: '14px', marginRight: '6px' }} />
              重命名
            </Button>
            {displayUrl && (
              <a
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex-1"
              >
                <Button
                  variant="outline"
                  className="w-full"
                  style={{ borderRadius: 'var(--radius-sm, 8px)' }}
                >
                  <Download style={{ width: '14px', height: '14px', marginRight: '6px' }} />
                  下载
                </Button>
              </a>
            )}
          </div>
          <Button
            variant="outline"
            className="w-full"
            style={{
              borderRadius: 'var(--radius-sm, 8px)',
              color: 'var(--error)',
              borderColor: 'var(--error)',
            }}
            onClick={() => onDeleteClick?.(asset.id)}
          >
            <Trash2 style={{ width: '14px', height: '14px', marginRight: '6px' }} />
            删除文件
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
