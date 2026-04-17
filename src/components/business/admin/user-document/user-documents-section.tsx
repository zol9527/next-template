'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  FileText,
  Download,
  Eye,
  Image as ImageIcon,
  FileUp,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ShieldCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

export type DocumentType =
  | 'id_card'
  | 'unemployment_proof'
  | 'medical_insurance'

export interface UserDocument {
  id: string
  userId: string
  documentType: DocumentType
  documentName: string | null
  hasFile: boolean
  fileUrl: string | null
  fileName: string | null
  fileSize: number | null
  mimeType: string | null
  status: string | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface UserDocumentsResponse {
  success: boolean
  data: {
    documents: UserDocument[]
  }
}

export const DocumentTypeLabels: Record<DocumentType, string> = {
  id_card: '身份证',
  unemployment_proof: '失业证明',
  medical_insurance: '医疗保险'
}

export const DocumentTypeIcons: Record<DocumentType, LucideIcon> = {
  id_card: FileText,
  unemployment_proof: FileText,
  medical_insurance: FileText
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return '未知大小'
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function UserDocumentsSection({ userId }: { userId: string }) {
  const {
    data,
    isLoading,
    isError,
    error
  } = useQuery<UserDocumentsResponse>({
    queryKey: ['admin', 'users', userId, 'documents'],
    queryFn: async () => {
      const res = await fetch(`/api/v1/admin/users/${userId}/documents`)

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: '请求失败' }))
        throw new Error(errorData.message || `HTTP ${res.status}`)
      }

      const json = await res.json()

      if (!json.success) {
        throw new Error((json as { error?: { message?: string } }).error?.message || '获取文档失败')
      }

      return json as UserDocumentsResponse
    },
    staleTime: 5 * 60 * 1000,
  })

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 p-6">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">加载失败</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {error instanceof Error ? error.message : '无法加载证件资料'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="mt-2"
        >
          重新加载
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <span className="text-muted-foreground text-sm">正在加载证件资料...</span>
      </div>
    )
  }

  const documents = data?.data?.documents || []

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 p-6">
        <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
          <FileUp className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <div className="text-center max-w-xs">
          <p className="text-sm font-medium text-foreground">暂无证件资料</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            该用户尚未上传任何证件资料
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <DocumentCard key={doc.id} document={doc} />
        ))}
      </div>
    </div>
  )
}

function DocumentCard({ document: doc }: { document: UserDocument }) {
  const IconComponent = DocumentTypeIcons[doc.documentType]
  const typeLabel = DocumentTypeLabels[doc.documentType]
  const [showReviewDialog, setShowReviewDialog] = React.useState(false)
  const [reviewStatus, setReviewStatus] = React.useState<'approved' | 'rejected'>('approved')
  const [rejectionReason, setRejectionReason] = React.useState('')
  const [isReviewing, setIsReviewing] = React.useState(false)

  const handleReview = async () => {
    if (!doc.hasFile) {
      return
    }

    try {
      setIsReviewing(true)
      const res = await fetch(`/api/v1/admin/users/${doc.userId}/documents/${doc.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: reviewStatus,
          rejectionReason: reviewStatus === 'rejected' ? rejectionReason : undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || '审核失败')
      }

      setShowReviewDialog(false)
      window.location.reload()
    } catch (error) {
      alert(error instanceof Error ? error.message : '审核失败')
    } finally {
      setIsReviewing(false)
    }
  }

  const getStatusBadge = () => {
    if (!doc.status) {
      return null
    }

    const statusMap: Record<string, {
      label: string
      variant: 'secondary' | 'success' | 'destructive'
      icon: React.FC<{ className?: string }>
      className: string
    }> = {
      pending: {
        label: '待审核',
        variant: 'secondary',
        icon: Clock,
        className: 'bg-warning/10 text-warning border-warning/30',
      },
      approved: {
        label: '已通过',
        variant: 'success',
        icon: CheckCircle,
        className: 'bg-success/10 text-success border-success/30',
      },
      rejected: {
        label: '已拒绝',
        variant: 'destructive',
        icon: XCircle,
        className: 'bg-error/10 text-error border-error/30',
      },
    }

    const config = statusMap[doc.status] || statusMap.pending
    const StatusIcon = config.icon

    return (
      <Badge variant={config.variant} className={cn("px-2 py-0.5 text-[10px] font-medium gap-1", config.className)}>
        <StatusIcon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <>
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl",
          "bg-card/20 backdrop-blur-xl border border-border/10 shadow-xl",
          "transition-all duration-300",
          "hover:shadow-2xl hover:border-border/20"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="relative p-4 pb-3 flex items-center gap-3 border-b border-border/5">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            "bg-muted/20 border border-border/10",
            "group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors"
          )}>
            <IconComponent className="h-5 w-5 text-foreground/70 group-hover:text-primary transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {doc.documentName || typeLabel}
            </p>
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium">
              {typeLabel}
            </p>
          </div>
          {getStatusBadge()}
        </div>

        <div className="relative aspect-[4/3] bg-muted/10 overflow-hidden">
          {doc.hasFile && doc.fileUrl ? (
            <>
              <img
                src={doc.fileUrl}
                alt={doc.documentName || typeLabel}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9 rounded-full bg-white/20 hover:bg-white/30 border-white/20"
                  onClick={() => doc.fileUrl && window.open(doc.fileUrl, '_blank', 'noopener,noreferrer')}
                  title="预览"
                >
                  <Eye className="h-4 w-4 text-white" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9 rounded-full bg-white/20 hover:bg-white/30 border-white/20"
                  onClick={() => {
                    if (doc.fileUrl) {
                      const anchor = globalThis.document.createElement('a')
                      anchor.href = doc.fileUrl
                      anchor.download = doc.fileName || `${typeLabel}.jpg`
                      anchor.click()
                    }
                  }}
                  title="下载"
                >
                  <Download className="h-4 w-4 text-white" />
                </Button>
                {doc.status !== 'approved' && doc.hasFile && (
                  <Button
                    onClick={() => setShowReviewDialog(true)}
                    title="审核"
                    className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90 border-white/20"
                  >
                    <ShieldCheck className="h-4 w-4 text-white" />
                  </Button>
                )}
              </div>

              <div className="absolute top-2 right-2">
                <Badge
                  variant="secondary"
                  className="bg-black/50 backdrop-blur-md text-white border-0 text-[10px]"
                >
                  {doc.mimeType?.includes('pdf') ? 'PDF' : '图片'}
                </Badge>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/30">
              <ImageIcon className="h-10 w-10" />
              <span className="text-xs">未上传</span>
            </div>
          )}
        </div>

        <div className="relative p-3 bg-muted/5 border-t border-border/5">
          <div className="flex items-center justify-between text-xs">
            {doc.hasFile ? (
              <>
                <span className="text-muted-foreground/50">
                  {formatFileSize(doc.fileSize)}
                </span>
                <span className="text-muted-foreground/50">
                  {formatDate(doc.createdAt)}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground/40 italic">
                等待上传
              </span>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>审核证件</DialogTitle>
            <DialogDescription>
              请审核用户上传的 {typeLabel}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={reviewStatus === 'approved' ? 'solid' : 'outline'}
                onClick={() => setReviewStatus('approved')}
                className="flex-1"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                通过
              </Button>
              <Button
                type="button"
                variant={reviewStatus === 'rejected' ? 'destructive' : 'outline'}
                onClick={() => setReviewStatus('rejected')}
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                拒绝
              </Button>
            </div>
            {reviewStatus === 'rejected' && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">拒绝原因</label>
                <Textarea
                  placeholder="请输入拒绝原因..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}
            {doc.note && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">备注信息</label>
                <div className="p-3 bg-muted/10 rounded-lg text-sm">
                  {doc.note}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              取消
            </Button>
            <Button onClick={handleReview} disabled={isReviewing}>
              {isReviewing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              提交审核
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default UserDocumentsSection
