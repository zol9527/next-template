'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Send,
  MessageSquare,
  Clock,
  User,
  Tag,
  CheckCircle2,
  Circle,
  PlayCircle,
  XCircle,
  Loader2,
  ExternalLink,
  History,
  Phone,
  Smartphone,
} from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

import type { FeedbackDetail, FeedbackStatus } from '@/contracts/dtos/feedback.dto'
import type { UpdateFeedbackStatusRequest, CreateReplyRequest } from '@/contracts/dtos/admin-feedback.dto'

const getStatusConfig = (status: FeedbackStatus) => {
  switch (status) {
    case 'pending':
      return { label: '待处理', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Circle }
    case 'processing':
      return { label: '处理中', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: PlayCircle }
    case 'resolved':
      return { label: '已解决', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle2 }
    case 'closed':
      return { label: '已关闭', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20', icon: XCircle }
    default:
      return { label: status, color: 'bg-slate-500/10 text-slate-500 border-slate-500/20', icon: Circle }
  }
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'suggestion':
      return '建议'
    case 'bug':
      return '缺陷'
    case 'other':
      return '其他'
    default:
      return type
  }
}

export default function AdminFeedbackDetailPage() {
  const { id } = useParams()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [replyContent, setReplyContent] = React.useState('')

  const { data: response, isLoading, error } = useQuery<{ success: boolean; data: FeedbackDetail }>({
    queryKey: ['admin', 'feedback', id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/admin/feedback/${id}`)
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData?.error?.message || `获取详情失败 (${res.status})`)
      }
      return res.json()
    },
  })

  const feedback = response?.data

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: FeedbackStatus) => {
      const body: UpdateFeedbackStatusRequest = { status: newStatus }
      const res = await fetch(`/api/v1/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData?.error?.message || `更新状态失败 (${res.status})`)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feedback', id] })
      toast({ title: '状态已更新', variant: 'default' })
    },
    onError: (err: Error) => {
      toast({ title: '操作失败', description: err.message, variant: 'destructive' })
    },
  })

  const submitReplyMutation = useMutation({
    mutationFn: async (content: string) => {
      const body: CreateReplyRequest = { content }
      const res = await fetch(`/api/v1/admin/feedback/${id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData?.error?.message || `提交回复失败 (${res.status})`)
      }
      return res.json()
    },
    onSuccess: () => {
      setReplyContent('')
      queryClient.invalidateQueries({ queryKey: ['admin', 'feedback', id] })
      toast({ title: '回复已发送', variant: 'default' })
    },
    onError: (err: Error) => {
      toast({ title: '发送失败', description: err.message, variant: 'destructive' })
    },
  })

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim()) return
    submitReplyMutation.mutate(replyContent)
  }

  const getAllowedTransitions = (currentStatus?: FeedbackStatus): FeedbackStatus[] => {
    if (!currentStatus) return []
    const transitions: Record<FeedbackStatus, FeedbackStatus[]> = {
      pending: ['processing', 'closed'],
      processing: ['resolved', 'closed'],
      resolved: ['closed'],
      closed: [],
    }
    return transitions[currentStatus] || []
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">加载中...</span>
      </div>
    )
  }

  if (error || !feedback) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <XCircle className="h-12 w-12 text-destructive/50" />
        <p className="text-muted-foreground">{error instanceof Error ? error.message : '未找到反馈详情'}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/feedback">返回列表</Link>
        </Button>
      </div>
    )
  }

  const statusConfig = getStatusConfig(feedback.status)
  const allowedTransitions = getAllowedTransitions(feedback.status)
  const feedbackUser = feedback.user
  const feedbackUserName = feedbackUser?.nickname || feedbackUser?.username || '未设置姓名'
  const feedbackUserPhone = feedbackUser?.phone || '暂无手机号'

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/admin/feedback">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{feedback.title}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>ID: {feedback.id}</span>
              <Separator orientation="vertical" className="h-3" />
              <span>提交于 {format(new Date(feedback.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className={cn("gap-2 border shadow-sm", statusConfig.color)}>
                <statusConfig.icon className="h-4 w-4" />
                {statusConfig.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="right" className="w-40">
              {allowedTransitions.length > 0 ? (
                allowedTransitions.map((status) => {
                  const config = getStatusConfig(status)
                  return (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => updateStatusMutation.mutate(status)}
                      className="gap-2 cursor-pointer"
                    >
                      <config.icon className="h-4 w-4" />
                      变更至 {config.label}
                    </DropdownMenuItem>
                  )
                })
              ) : (
                <div className="px-2 py-1.5 text-xs text-muted-foreground italic text-center">无可用状态流转</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="border-border/40 shadow-sm overflow-hidden bg-muted/5">
            <CardHeader className="pb-3 border-b border-border/10 bg-muted/10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary/70" />
                  反馈内容
                </CardTitle>
                <Badge variant="outline" className="font-medium bg-background">
                  {getTypeLabel(feedback.type)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
                  {feedback.content}
                </p>
              </div>

              {feedback.images && feedback.images.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-sm font-semibold mb-4 text-muted-foreground flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    附件图片 ({feedback.images.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {feedback.images.map((img, idx) => (
                      <a
                        key={idx}
                        href={img}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative aspect-square rounded-xl overflow-hidden border border-border/20 bg-muted/20 hover:ring-2 hover:ring-primary/20 transition-all"
                      >
                        <img
                          src={img}
                          alt={`Feedback image ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ExternalLink className="h-5 w-5 text-white" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              回复记录
            </h2>
            
            <div className="space-y-4">
              {feedback.replies && feedback.replies.length > 0 ? (
                feedback.replies.map((reply) => (
                  <div key={reply.id} className="flex gap-4">
                    <div className="flex-none pt-1">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1.5 bg-muted/10 p-4 rounded-2xl border border-border/20 relative shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-primary">管理员回复</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                          {format(new Date(reply.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {reply.content}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 bg-muted/5 border border-dashed border-border/40 rounded-3xl gap-3">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">暂无回复记录</p>
                </div>
              )}
            </div>

            {feedback.status !== 'closed' && (
              <div className="mt-4 pt-6 border-t border-border/10">
                <form onSubmit={handleReplySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground ml-1">快速回复</label>
                    <Textarea
                      placeholder="输入回复内容..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="min-h-[120px] rounded-2xl bg-muted/5 border-border/30 focus:border-primary/50 transition-all resize-none shadow-inner"
                      disabled={submitReplyMutation.isPending}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      className="rounded-xl px-6 py-5 h-auto font-bold gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                      disabled={!replyContent.trim() || submitReplyMutation.isPending}
                    >
                      {submitReplyMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      提交回复
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="border-border/40 shadow-sm bg-muted/5">
            <CardHeader className="pb-3 border-b border-border/10 bg-muted/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-primary/70" />
                元数据信息
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  提交用户
                </p>
                <div className="flex items-start gap-3 mt-2 p-3 bg-background border border-border/20 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-[10px] font-bold">
                    {feedbackUser?.avatarUrl ? (
                      <img src={feedbackUser.avatarUrl} alt="" className="h-full w-full rounded-lg object-cover" />
                    ) : (
                      'USER'
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold truncate">{feedbackUserName}</span>
                      <Badge variant="outline" className="gap-1 border-emerald-500/20 bg-emerald-500/10 text-[10px] font-medium text-emerald-600">
                        <Smartphone className="h-3 w-3" />
                        {feedbackUser?.sourcePlatform || '未知来源'}
                      </Badge>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {feedbackUserPhone}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70 truncate">{feedback.userId}</span>
                    <Link 
                      href={`/admin/users?keyword=${feedback.userId}`}
                      className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-0.5"
                    >
                      查看详情 <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    <Tag className="h-3.5 w-3.5" />
                    反馈类型
                  </div>
                  <Badge variant="outline" className="bg-background">{getTypeLabel(feedback.type)}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    <Clock className="h-3.5 w-3.5" />
                    创建时间
                  </div>
                  <span className="text-xs font-medium">{format(new Date(feedback.createdAt), 'yyyy-MM-dd HH:mm')}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    <History className="h-3.5 w-3.5" />
                    最后更新
                  </div>
                  <span className="text-xs font-medium">{format(new Date(feedback.updatedAt), 'yyyy-MM-dd HH:mm')}</span>
                </div>
              </div>

              <Separator className="bg-border/20" />

              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">状态轨迹</p>
                <div className="relative pl-4 space-y-6 before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-px before:bg-border/60">
                  <div className="relative">
                    <div className={cn("absolute -left-[18.5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-background", statusConfig.color.split(' ')[0])} />
                    <p className="text-xs font-bold">{statusConfig.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">当前状态</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[18.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-border ring-4 ring-background" />
                    <p className="text-xs font-bold text-muted-foreground">已创建</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(feedback.createdAt), 'yyyy-MM-dd HH:mm')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm bg-primary/5 border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                <Shield className="h-4 w-4" />
                管理提示
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                请务必在充分理解用户诉求后进行回复。如果问题已解决，请及时更新状态至「已解决」。对于违规或重复反馈，可直接选择「已关闭」。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Shield(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  )
}
