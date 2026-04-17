'use client'

import * as React from 'react'
import { FileText, Download, Eye, Trash2, ImageIcon, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useUserDocuments, type UserDocument } from './use-user-documents'
import { useDocumentFile } from './use-document-file'
import { DocumentTypeIcons } from '@/components/business/admin/user-document/user-documents-section'

interface DocumentCardProps {
  document: UserDocument | null
  typeLabel: string
}

export function DocumentCard({ document, typeLabel }: DocumentCardProps) {
  const { deleteDocument } = useUserDocuments()
  const { blobUrl, isLoading: isFileLoading, error: fileError, refetch: refetchFile } = useDocumentFile(document)
  const [showActions, setShowActions] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isDownloading, setIsDownloading] = React.useState(false)

  // 当 document 变化时重新获取文件
  React.useEffect(() => {
    if (document?.hasFile) {
      refetchFile()
    }
  }, [document?.id, document?.hasFile, refetchFile])

  const handleDelete = async () => {
    if (!document || !confirm(`确定要删除${typeLabel}吗？此操作不可撤销。`)) {
      return
    }

    try {
      setIsDeleting(true)
      await deleteDocument.mutateAsync(document.id)
    } catch (error) {
      console.error('删除失败:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePreview = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleDownload = async () => {
    if (!document?.id) return

    try {
      setIsDownloading(true)

      // 直接从内部 API 下载文件
      const res = await fetch(`/api/v1/internal/user-documents/${document.id}/file`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('下载失败')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const anchor = globalThis.document.createElement('a')
      anchor.href = url
      anchor.download = document.fileName || `${typeLabel}.jpg`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('下载失败:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  const getStatusBadge = () => {
    if (!document?.status) {
      return null
    }

    const statusMap: Record<string, {
      label: string
      variant: 'success' | 'destructive' | 'secondary'
      icon: React.ElementType
      className: string
    }> = {
      pending: {
        label: '待审核',
        variant: 'secondary',
        icon: Clock,
        className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      },
      approved: {
        label: '已通过',
        variant: 'success',
        icon: CheckCircle,
        className: 'bg-green-500/10 text-green-500 border-green-500/20',
      },
      rejected: {
        label: '已拒绝',
        variant: 'destructive',
        icon: AlertCircle,
        className: 'bg-red-500/10 text-red-500 border-red-500/20',
      },
    }

    const config = statusMap[document.status] || statusMap.pending

    const StatusIcon = config.icon

    return (
      <Badge variant={config.variant} className={cn("px-2 py-0.5 text-[10px] font-medium gap-1", config.className)}>
        <StatusIcon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  if (!document || !document.hasFile) {
    return (
      <div className="rounded-2xl border border-border/10 bg-card/20 backdrop-blur-xl p-8 flex flex-col items-center justify-center gap-4 min-h-[200px]">
        <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground mb-1">未上传</p>
          <p className="text-xs text-muted-foreground">
            请在左侧上传{typeLabel}
          </p>
        </div>
      </div>
    )
  }

  const Icon = DocumentTypeIcons[document.documentType] || FileText

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl",
        "bg-card/20 backdrop-blur-xl border border-border/10 shadow-xl",
        "transition-all duration-300",
        "hover:shadow-2xl hover:border-border/20",
        "hover:-translate-y-0.5"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative p-4 pb-3 flex items-center gap-3 border-b border-border/5">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          "bg-muted/20 border border-border/10",
          "group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors"
        )}>
          <Icon className="h-5 w-5 text-foreground/70 group-hover:text-primary transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {document.documentName || typeLabel}
          </p>
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium">
            {typeLabel}
          </p>
        </div>
        {getStatusBadge()}
      </div>

      <div className="relative aspect-[4/3] bg-muted/10 overflow-hidden">
        {/* 加载状态 */}
        {isFileLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        )}

        {/* 文件加载成功 */}
        {!isFileLoading && blobUrl && !fileError && (
          <>
            <img
              src={blobUrl}
              alt={document.documentName || typeLabel}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            <div className={cn(
              "absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-2 transition-opacity",
              showActions ? "opacity-100" : "opacity-0"
            )}>
              <Button
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 border-white/20"
                onClick={handlePreview}
                title="预览"
                disabled={isDeleting}
              >
                <Eye className="h-4 w-4 text-white" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 border-white/20"
                onClick={handleDownload}
                title="下载"
                disabled={isDeleting || isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                ) : (
                  <Download className="h-4 w-4 text-white" />
                )}
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="h-10 w-10 rounded-full bg-destructive/90 hover:bg-destructive border-white/20"
                onClick={handleDelete}
                title="删除"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-white" />
                )}
              </Button>
            </div>

            <div className="absolute top-2 right-2">
              <Badge
                variant="secondary"
                className="bg-black/50 backdrop-blur-md text-white border-0 text-[10px]"
              >
                {document.mimeType?.includes('pdf') ? 'PDF' : '图片'}
              </Badge>
            </div>
          </>
        )}

        {/* 文件加载失败 */}
        {!isFileLoading && fileError && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-destructive/30">
            <AlertCircle className="h-10 w-10" />
            <span className="text-xs">文件无法访问</span>
          </div>
        )}
      </div>

      <div className="relative p-3 bg-muted/5 border-t border-border/5">
        <div className="flex items-center justify-between text-xs">
          {document.fileSize ? (
            <>
              <span className="text-muted-foreground/50">
                {formatFileSize(document.fileSize)}
              </span>
              <span className="text-muted-foreground/50">
                {document.mimeType?.split('/')[1]?.toUpperCase() || 'JPG'}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground/40 italic">
              文件信息不可用
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

