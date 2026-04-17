'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  Search,
  Filter,
  Loader2,
  FileText,
  Image as ImageIcon,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type {
  UserDocument,
  DocumentType,
  DocumentStatus,
} from '@/contracts/dtos/user-document.dto'
import {
  DocumentTypeLabels,
  DocumentStatusLabels,
} from '@/contracts/dtos/user-document.dto'

export const DocumentTypeIcons: Record<DocumentType, LucideIcon> = {
  id_card: FileText,
  unemployment_proof: FileText,
  medical_insurance: FileText,
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
    minute: '2-digit',
  })
}

export function DocumentReviewTab() {
  const { toast } = useToast()
  const query_client = useQueryClient()
  const [search, set_search] = React.useState('')
  const [status_filter, set_status_filter] = React.useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [type_filter, set_type_filter] = React.useState<'all' | DocumentType | undefined>('all')
  const [page, set_page] = React.useState(1)
  const limit = 12

  // Review dialog state
  const [selected_doc, set_selected_doc] = React.useState<UserDocument | null>(null)
  const [show_review_dialog, set_show_review_dialog] = React.useState(false)
  const [review_status, set_review_status] = React.useState<'approved' | 'rejected'>('approved')
  const [rejection_reason, set_rejection_reason] = React.useState('')

  const debounced_search = useDebounce(search, 500)

  // Fetch documents
  const { data, isLoading, isPlaceholderData } = useQuery<{
    documents: UserDocument[]
    total: number
  }>({
    queryKey: ['admin', 'documents', { search: debounced_search, statusFilter: status_filter, typeFilter: type_filter, page }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
      })
      if (debounced_search) params.append('search', debounced_search)
      if (status_filter !== 'all') params.append('status', status_filter)
      if (type_filter && type_filter !== 'all') params.append('documentType', type_filter)

      const res = await fetch(`/api/v1/admin/documents?${params.toString()}`)
      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to fetch documents')
      }
      return json.data
    },
    placeholderData: (prev) => prev,
  })

  // Review mutation
  const review_mutation = useMutation({
    mutationFn: async ({ documentId, status, rejectionReason }: {
      documentId: string
      status: 'approved' | 'rejected'
      rejectionReason?: string
    }) => {
      const res = await fetch(`/api/v1/admin/users/${selected_doc?.userId}/documents/${documentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          rejectionReason: status === 'rejected' ? rejectionReason : undefined,
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || '审核失败')
      }
      return await res.json()
    },
    onSuccess: () => {
      toast({ title: '审核成功', variant: 'default' })
      set_show_review_dialog(false)
      query_client.invalidateQueries({ queryKey: ['admin', 'documents'] })
    },
    onError: (error: unknown) => {
      toast({
        title: '审核失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      })
    },
  })

  const handle_review = async () => {
    if (!selected_doc) return
    await review_mutation.mutateAsync({
      documentId: selected_doc.id,
      status: review_status,
      rejectionReason: rejection_reason,
    })
  }

  const total_pages = Math.ceil((data?.total ?? 0) / limit)

  const get_status_badge = (status: string | null) => {
    if (!status) return null

    const status_map: Record<string, {
      label: string
      icon: LucideIcon
      className: string
    }> = {
      pending: {
        label: '待审核',
        icon: Clock,
        className: 'bg-warning/10 text-warning border-warning/30',
      },
      approved: {
        label: '已通过',
        icon: CheckCircle,
        className: 'bg-success/10 text-success border-success/30',
      },
      rejected: {
        label: '已拒绝',
        icon: XCircle,
        className: 'bg-error/10 text-error border-error/30',
      },
    }

    const config = status_map[status] || status_map.pending
    const StatusIcon = config.icon

    return (
      <Badge className={cn("px-2 py-0.5 text-[10px] font-medium gap-1", config.className)}>
        <StatusIcon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search by user ID or name..."
            value={search}
            onChange={(e) => {
              set_search(e.target.value)
              set_page(1)
            }}
            className="w-full bg-muted/5 border border-border/10 py-3 pl-12 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex bg-muted/5 p-1 border border-border/10">
            {['all', 'pending', 'approved', 'rejected'].map((s) => (
              <button
                key={s}
                onClick={() => {
                  set_status_filter(s as typeof status_filter)
                  set_page(1)
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize",
                  status_filter === s ? "bg-white text-primary shadow-lg" : "text-muted-foreground/60 hover:text-foreground"
                )}
              >
                {s === 'all' ? 'All' : DocumentStatusLabels[s as DocumentStatus]}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <select
            value={type_filter}
            onChange={(e) => {
              set_type_filter(e.target.value as typeof type_filter)
              set_page(1)
            }}
            className="bg-muted/5 border border-border/10 py-2 px-3 rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Types</option>
            <option value="id_card">身份证</option>
            <option value="unemployment_proof">失业证明</option>
            <option value="medical_insurance">医疗保险</option>
          </select>

          <Button variant="ghost" size="icon" className="bg-muted/10 backdrop-blur-xl border border-border shadow-xl text-foreground">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <span className="text-muted-foreground/60 text-sm">Loading documents...</span>
          </div>
        </div>
      ) : data?.documents.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <span className="text-muted-foreground/60 text-sm">No documents found.</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data?.documents.map((doc) => {
              const IconComponent = DocumentTypeIcons[doc.documentType]
              const typeLabel = DocumentTypeLabels[doc.documentType]

              return (
                <div
                  key={doc.id}
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
                        User ID: {doc.userId.slice(0, 8)}...
                      </p>
                    </div>
                    {get_status_badge(doc.status)}
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
                          {doc.status === 'pending' && (
                            <Button
                              onClick={() => {
                                set_selected_doc(doc)
                                set_show_review_dialog(true)
                              }}
                              title="审核"
                              className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90 border-white/20"
                            >
                              <ShieldCheck className="h-4 w-4 text-white" />
                            </Button>
                          )}
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
              )
            })}
          </div>

          {/* Pagination */}
          {total_pages > 1 && (
            <div className="px-8 py-6 flex items-center justify-between border-t border-border/5 bg-muted/[0.02]">
              <p className="text-xs text-muted-foreground/50 font-medium">
                Showing <span className="text-foreground">{(page - 1) * limit + 1}</span> to{' '}
                <span className="text-foreground">{Math.min(page * limit, data?.total || 0)}</span> of{' '}
                <span className="text-foreground">{data?.total}</span> documents
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={page === 1 || isPlaceholderData}
                  onClick={() => set_page(p => p - 1)}
                  className="bg-muted/10 backdrop-blur-xl border border-border shadow-xl h-9 w-9 text-foreground disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground/60 px-3 py-1.5">
                  <span className="text-foreground">{page}</span> / {total_pages}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={page === total_pages || isPlaceholderData}
                  onClick={() => set_page(p => p + 1)}
                  className="bg-muted/10 backdrop-blur-xl border border-border shadow-xl h-9 w-9 text-foreground disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Review Dialog */}
      <Dialog open={show_review_dialog} onOpenChange={set_show_review_dialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>审核证件</DialogTitle>
            <DialogDescription>
              请审核用户上传的 {selected_doc && DocumentTypeLabels[selected_doc.documentType]}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={review_status === 'approved' ? 'solid' : 'outline'}
                onClick={() => set_review_status('approved')}
                className="flex-1"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                通过
              </Button>
              <Button
                type="button"
                variant={review_status === 'rejected' ? 'destructive' : 'outline'}
                onClick={() => set_review_status('rejected')}
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                拒绝
              </Button>
            </div>
            {review_status === 'rejected' && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">拒绝原因</label>
                <Textarea
                  placeholder="请输入拒绝原因..."
                  value={rejection_reason}
                  onChange={(e) => set_rejection_reason(e.target.value)}
                  rows={3}
                />
              </div>
            )}
            {selected_doc?.note && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">备注信息</label>
                <div className="p-3 bg-muted/10 rounded-lg text-sm">
                  {selected_doc.note}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => set_show_review_dialog(false)}>
              取消
            </Button>
            <Button onClick={handle_review} disabled={review_mutation.isPending}>
              {review_mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              提交审核
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DocumentReviewTab
