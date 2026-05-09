'use client'

/**
 * File: media-card.tsx
 * Description: 媒体卡片组件，显示媒体缩略图和操作按钮
 */

import { ImageIcon, Video, FileText } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import type { AdminMediaAsset } from '@/contracts/dtos/admin/media-assets.dto'

/**
 * Function: getMediaUrl
 *
 * Description: 根据媒体资产的 provider 生成访问 URL
 *              优先使用 API 返回的 url 字段（已包含签名 URL）
 *
 * Parameters:
 *    asset(AdminMediaAsset): 媒体资产数据
 *
 * Returns:
 *    url(string | null): 媒体访问 URL
 */
function getMediaUrl(asset: AdminMediaAsset): string | null {
  // 优先使用 API 返回的 url 字段（对于云存储，已包含签名 URL）
  if (asset.url) {
    return asset.url
  }

  // 根据 provider 生成 URL（fallback，理论上不应该走到这里）
  switch (asset.provider) {
    case 'local':
      // 本地存储：使用统一的 public API 路径
      return `/api/v1/public/files/${asset.objectKey}`
    case 'aliyun_oss': {
      // 阿里云 OSS：使用后端代理 API（支持私有 Bucket，避免 CORS 问题）
      return `/api/v1/admin/storage/oss/files/${asset.objectKey}`
    }
    case 'tencent_cos': {
      // 腾讯云 COS URL 格式
      const uploadHost = process.env.NEXT_PUBLIC_TENCENT_COS_UPLOAD_HOST
      if (uploadHost) {
        return `${uploadHost}/${asset.objectKey}`
      }
      return `https://${asset.bucket}.cos.ap-guangzhou.myqcloud.com/${asset.objectKey}`
    }
    default:
      return null
  }
}

/**
 * Function: MediaCard
 *
 * Description: 媒体卡片组件，显示媒体缩略图和信息
 *
 * Parameters:
 *    asset(AdminMediaAsset): 媒体资产数据
 *    onDeleteClickAction(function): 删除按钮点击回调
 *    referenceCount(number, optional): 引用数量
 *    showCheckbox(boolean, optional): 是否显示选择框
 *    selected(boolean, optional): 是否已选中
 *    onSelectAction(function, optional): 选择回调
 *
 * Returns:
 *    element(React.ReactElement): 媒体卡片 UI
 */
export function MediaCard({
  asset,
  onDeleteClickAction,
  referenceCount = 0,
  showCheckbox = false,
  selected = false,
  onSelectAction,
}: {
  asset: AdminMediaAsset
  onDeleteClickAction: (assetId: string) => void
  referenceCount?: number
  showCheckbox?: boolean
  selected?: boolean
  onSelectAction?: (selected: boolean) => void
}) {
  // 生成媒体 URL
  const displayUrl = getMediaUrl(asset)

  const [imageLoadFailed, setImageLoadFailed] = useState(false)

  // 判断媒体类型
  const isImage = asset.contentType.startsWith('image/')
  const isVideo = asset.contentType.startsWith('video/')

  // 文件名
  const fileName = asset.objectKey.split('/').pop() || 'unknown'

  // 格式化文件大小
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all duration-300",
        selected && "ring-2 ring-primary"
      )}
    >
      {/* 选择框 */}
      {showCheckbox && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelectAction?.(e.target.checked)}
            className="w-5 h-5 rounded border-2 border-primary/50"
          />
        </div>
      )}

      {/* 引用数量徽章 */}
      {referenceCount > 0 && (
        <div className="absolute top-2 right-2 z-10 bg-primary/90 text-primary-foreground text-xs font-bold px-2 py-1 rounded-full shadow-lg">
          {referenceCount} 引用
        </div>
      )}

      {/* Preview Area */}
      <div className="aspect-square relative bg-card/20 flex items-center justify-center overflow-hidden">
        {isImage && displayUrl && !imageLoadFailed ? (
          // 这里需要使用 <img> 以确保同域 Cookie 会随请求发送（next/image 的优化管线可能导致鉴权失败）
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt={fileName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              void e
              setImageLoadFailed(true)
            }}
          />
        ) : isImage ? (
          <ImageIcon className="w-12 h-12 text-muted-foreground/40" />
        ) : isVideo ? (
          <Video className="w-12 h-12 text-muted-foreground/40" />
        ) : (
          <FileText className="w-12 h-12 text-muted-foreground/40" />
        )}

        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-card/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
          <button
            onClick={() => onDeleteClickAction(asset.id)}
            className="text-xs font-medium text-destructive hover:underline"
          >
            删除
          </button>
        </div>
      </div>

      {/* Info Area */}
      <div className="p-3 flex flex-col gap-1">
        <p
          className="text-sm font-semibold truncate group-hover:text-primary transition-colors"
          title={fileName}
        >
          {fileName}
        </p>
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
            {asset.contentType.split('/')[1] || asset.contentType}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatBytes(asset.sizeBytes)}
          </p>
        </div>
      </div>
    </div>
  )
}
