'use client'

/**
 * File: media-upload-dialog.tsx
 * Description: 媒体上传弹窗，支持拖拽上传、多文件、进度显示
 *              基于 Paper Design 上传 Dialog 规格
 */

import * as React from 'react'
import { Upload, X, FileIcon, CheckCircle2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FILE_INPUT_ACCEPT_VALUE } from '@/lib/constants/file-types'
import { useToast } from '@/components/ui/toast'
import { useAdminMediaAssets } from '@/components/context/admin-media-assets-context'

/** 上传文件状态 */
interface UploadFileItem {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number
  error?: string
}

/** 格式化文件大小 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/** 获取文件类型颜色 */
function getFileTypeColor(contentType: string): string {
  if (contentType.startsWith('image/')) return '#f59e0b'
  if (contentType.startsWith('video/')) return '#3b82f6'
  if (contentType.startsWith('audio/')) return '#8b5cf6'
  if (contentType.includes('pdf')) return '#ef4444'
  return 'var(--fg-muted)'
}

interface UploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Function: UploadDialog
 *
 * Description: 上传弹窗组件
 * - Dialog: 560px 宽, 圆角 var(--radius-lg), 阴影 var(--shadow-modal)
 * - 拖拽上传区
 * - 文件列表显示进度
 * - 底部操作按钮
 */
export function UploadDialog({
  open,
  onOpenChange,
}: UploadDialogProps) {
  const { toast } = useToast()
  const { uploadAsset } = useAdminMediaAssets()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [files, setFiles] = React.useState<UploadFileItem[]>([])
  const [isDragOver, setIsDragOver] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)

  // 添加文件
  const addFiles = React.useCallback((fileList: FileList | File[]) => {
    const newFiles: UploadFileItem[] = Array.from(fileList).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      status: 'pending' as const,
      progress: 0,
    }))
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  // 移除文件
  const removeFile = React.useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  // 上传单个文件
  const uploadSingleFile = React.useCallback(async (item: UploadFileItem) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading' as const, progress: 0 } : f))
    )

    try {
      await uploadAsset(item.file, {
        onProgress: (info) => {
          setFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, progress: info.percent } : f))
          )
        },
      })
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: 'done' as const, progress: 100 } : f))
      )
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? { ...f, status: 'error' as const, error: error instanceof Error ? error.message : '上传失败' }
            : f
        )
      )
    }
  }, [uploadAsset])

  // 上传所有文件
  const uploadAll = React.useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending')
    if (pendingFiles.length === 0) return

    setIsUploading(true)
    try {
      // 逐个上传（避免并发压力）
      for (const file of pendingFiles) {
        await uploadSingleFile(file)
      }
      toast({ title: '上传完成', description: `已成功上传 ${pendingFiles.length} 个文件` })
    } catch {
      // 单个文件错误已在 uploadSingleFile 中处理
    } finally {
      setIsUploading(false)
    }
  }, [files, uploadSingleFile, toast])

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  // 关闭时清理
  const handleClose = () => {
    if (!isUploading) {
      setFiles([])
      onOpenChange(false)
    }
  }

  const pendingCount = files.filter((f) => f.status === 'pending').length
  const hasFiles = files.length > 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="flex flex-col p-0 overflow-hidden"
        style={{
          maxWidth: '560px',
          borderRadius: 'var(--radius-lg, 16px)',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        {/* 头部 */}
        <DialogHeader
          className="flex flex-row items-center justify-between shrink-0 px-6"
          style={{
            height: '71px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <DialogTitle className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>
            上传文件
          </DialogTitle>
          <button
            onClick={handleClose}
            className="flex items-center justify-center transition-colors"
            style={{
              width: '30px',
              height: '30px',
              borderRadius: 'var(--radius-sm, 8px)',
              color: 'var(--fg-secondary)',
            }}
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </DialogHeader>

        {/* 拖拽上传区 */}
        <div className="px-6 pt-4">
          <div
            className={cn(
              'flex flex-col items-center justify-center cursor-pointer transition-all',
            )}
            style={{
              height: '192px',
              border: `2px dashed ${isDragOver ? 'var(--ds-accent)' : 'var(--border-medium)'}`,
              borderRadius: 'var(--radius-md, 12px)',
              backgroundColor: isDragOver ? 'var(--ds-accent-subtle)' : 'transparent',
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={FILE_INPUT_ACCEPT_VALUE}
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files)
                e.target.value = ''
              }}
            />

            <Upload
              style={{
                width: '48px',
                height: '48px',
                color: 'var(--ds-accent)',
                marginBottom: '12px',
              }}
            />
            <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
              拖拽文件到此处，或点击上传
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
              支持 JPG、PNG、GIF、MP4、PDF、DOCX 等格式，单文件最大 200 MB
            </p>
          </div>
        </div>

        {/* 文件列表 */}
        {hasFiles && (
          <div className="flex-1 overflow-y-auto px-6 py-3" style={{ maxHeight: '300px' }}>
            <div className="flex flex-col gap-2">
              {files.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-3"
                  style={{
                    height: '62px',
                    borderRadius: 'var(--radius-sm, 8px)',
                    backgroundColor: 'var(--surface-alt)',
                  }}
                >
                  {/* 文件图标 */}
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-sm, 8px)',
                      backgroundColor: `${getFileTypeColor(item.file.type)}15`,
                    }}
                  >
                    <FileIcon style={{ width: '18px', height: '18px', color: getFileTypeColor(item.file.type) }} />
                  </div>

                  {/* 文件信息 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: 'var(--fg)', fontWeight: 500 }}>
                      {item.file.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                      {formatBytes(item.file.size)}
                    </p>

                    {/* 进度条 */}
                    {item.status === 'uploading' && (
                      <div className="mt-1">
                        <div
                          style={{
                            height: '4px',
                            borderRadius: 'var(--radius-pill, 9999px)',
                            backgroundColor: 'var(--border)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${item.progress}%`,
                              borderRadius: 'var(--radius-pill, 9999px)',
                              backgroundColor: '#f59e0b',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                        <span className="text-xs" style={{ color: '#f59e0b' }}>
                          {item.progress}%
                        </span>
                      </div>
                    )}

                    {item.status === 'error' && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--error)' }}>
                        {item.error || '上传失败'}
                      </p>
                    )}
                  </div>

                  {/* 状态图标 */}
                  <div className="shrink-0">
                    {item.status === 'done' && (
                      <CheckCircle2 style={{ width: '20px', height: '20px', color: 'var(--teal)' }} />
                    )}
                    {item.status === 'uploading' && (
                      <Loader2 className="animate-spin" style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
                    )}
                    {item.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>等待中</span>
                        <button onClick={() => removeFile(item.id)}>
                          <X style={{ width: '16px', height: '16px', color: 'var(--fg-muted)' }} />
                        </button>
                      </div>
                    )}
                    {item.status === 'error' && (
                      <button onClick={() => removeFile(item.id)}>
                        <X style={{ width: '16px', height: '16px', color: 'var(--error)' }} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 底部 */}
        <div
          className="flex items-center justify-end gap-3 px-6 shrink-0"
          style={{
            height: '66px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
            style={{
              borderRadius: 'var(--radius-sm, 8px)',
            }}
          >
            取消
          </Button>
          <Button
            onClick={uploadAll}
            disabled={pendingCount === 0 || isUploading}
            className="text-white"
            style={{
              backgroundColor: 'var(--ds-accent)',
              borderRadius: 'var(--radius-sm, 8px)',
            }}
          >
            {isUploading ? '上传中...' : `全部上传 (${pendingCount})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
