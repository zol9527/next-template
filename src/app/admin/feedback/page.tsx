'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useDebounce } from '@/hooks/use-debounce'
import { AdminFilterBar } from '@/components/ui/admin-filter-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { DataTable } from '@/components/ui/data-table/index'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { PaginationConfig } from '@/components/ui/data-table/pagination'
import type { ColumnDef } from '@tanstack/react-table'

import {
  FeedbackListResponseSchema,
} from '@/contracts/dtos/feedback.dto'
import type { Feedback, FeedbackStatus, FeedbackListResponse } from '@/contracts/dtos/feedback.dto'

/**
 * Component: AdminFeedbackPage
 *
 * Description: 管理员反馈列表页面，提供状态过滤、分页查看用户反馈的功能。
 *
 * Returns:
 *     JSX.Element: 反馈列表页面组件
 */
export default function AdminFeedbackPage() {
  const { toast } = useToast()
  const router = useRouter()
  const query_client = useQueryClient()
  const [search, set_search] = React.useState('')
  const [status_filter, set_status_filter] = React.useState<string>('all')

  const [nextCursor, setNextCursor] = React.useState<string | null>(null)
  const [prevCursors, setPrevCursors] = React.useState<string[]>([])
  const [currentCursor, setCurrentCursor] = React.useState<string | null>(null)
  const [pageSize, setPageSize] = React.useState(20)

  const debounced_search = useDebounce(search, 500)

  // 获取反馈列表数据
  const { data, isLoading, error, refetch } = useQuery<FeedbackListResponse>({
    queryKey: ['admin', 'feedback', { search: debounced_search, statusFilter: status_filter, cursor: currentCursor, pageSize }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
      })
      if (currentCursor) params.append('cursor', currentCursor)
      // 虽然 API 可能暂不支持 keyword 搜索，但为了 UI 交互先行保留逻辑
      if (debounced_search) params.append('keyword', debounced_search)
      if (status_filter !== 'all') params.append('status', status_filter)

      const res = await fetch(`/api/v1/admin/feedback?${params.toString()}`)
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData?.error?.message || `请求失败 (${res.status})`)
      }
      
      const json = await res.json()
      const response = json as { success: boolean; data: unknown; error?: { message: string } }
      
      if (!response.success) {
        throw new Error(response.error?.message || '请求失败')
      }
      
      const parsed = FeedbackListResponseSchema.safeParse(response.data)
      if (!parsed.success) {
        console.error('Data validation error:', parsed.error)
        throw new Error('响应数据格式不符合预期')
      }
      return parsed.data
    },
  })

  // 更新反馈状态的 Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ feedbackId, status }: { feedbackId: string; status: FeedbackStatus }) => {
      const res = await fetch(`/api/v1/admin/feedback/${feedbackId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData?.error?.message || `状态更新失败 (${res.status})`)
      }

      return res.json()
    },
    onSuccess: () => {
      query_client.invalidateQueries({ queryKey: ['admin', 'feedback'] })
      toast({ title: '状态已更新', variant: 'default' })
    },
    onError: (err: Error) => {
      toast({ title: '操作失败', description: err.message, variant: 'destructive' })
    }
  })

  // 同步分页游标
  React.useEffect(() => {
    if (data?.nextCursor !== undefined) {
      setNextCursor(data.nextCursor)
    }
  }, [data])

  // 过滤条件改变时重置分页
  React.useEffect(() => {
    setPrevCursors([])
    setCurrentCursor(null)
  }, [debounced_search, status_filter, pageSize])

  const handleNextPage = React.useCallback(() => {
    if (nextCursor && !isLoading) {
      setPrevCursors((prev) => [...prev, currentCursor ?? ''])
      setCurrentCursor(nextCursor)
    }
  }, [nextCursor, isLoading, currentCursor])

  const handlePrevPage = React.useCallback(() => {
    if (prevCursors.length > 0 && !isLoading) {
      const newPrevCursors = [...prevCursors]
      const prevCursor = newPrevCursors.pop() ?? null
      setPrevCursors(newPrevCursors)
      setCurrentCursor(prevCursor)
    }
  }, [prevCursors, isLoading])

  // 定义表格列
  const columns = React.useMemo<ColumnDef<Feedback>[]>(() => [
    {
      accessorKey: 'title',
      header: '标题',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <Link
            href={`/admin/feedback/${row.original.id}`}
            className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
          >
            {row.original.title}
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <span className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">
            {row.original.content}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: '类型',
      cell: ({ row }) => {
        const type = row.original.type
        const config = {
          suggestion: { label: '建议', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
          bug: { label: '缺陷', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
          other: { label: '其他', className: 'bg-muted/50 text-muted-foreground border-border' },
        }
        const item = config[type as keyof typeof config] || config.other
        return (
          <Badge variant="outline" className={cn("font-medium", item.className)}>
            {item.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => {
        const status = row.original.status
        const config = {
          pending: { label: '待处理', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
          processing: { label: '处理中', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
          resolved: { label: '已解决', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
          closed: { label: '已关闭', className: 'bg-muted/50 text-muted-foreground border-border' },
        }
        const item = config[status as keyof typeof config] || config.pending
        return (
          <Badge variant="outline" className={cn("font-medium", item.className)}>
            {item.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: '提交时间',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(row.original.createdAt), { addSuffix: true, locale: zhCN })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="right">
            <DropdownMenuItem onClick={() => router.push(`/admin/feedback/${row.original.id}`)}>
              查看详情
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => updateStatusMutation.mutate({ feedbackId: row.original.id, status: 'processing' })}
              disabled={row.original.status === 'processing'}
            >
              设为处理中
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => updateStatusMutation.mutate({ feedbackId: row.original.id, status: 'resolved' })}
              disabled={row.original.status === 'resolved'}
            >
              标记已解决
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => updateStatusMutation.mutate({ feedbackId: row.original.id, status: 'closed' })}
              disabled={row.original.status === 'closed'}
            >
              关闭反馈
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [updateStatusMutation, router])

  const pagination = React.useMemo<PaginationConfig>(
    () => ({
      nextCursor,
      prevCursors,
      isLoading,
      onNextPage: handleNextPage,
      onPrevPage: handlePrevPage,
      onPageSizeChange: setPageSize,
      pageSize,
      totalCount: data?.items?.length ?? 0,
      totalRecords: 0, // 假设 API 返回总数，此处先设为 0
    }),
    [nextCursor, prevCursors, isLoading, handleNextPage, handlePrevPage, pageSize, data?.items?.length]
  )

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">反馈管理</h1>
        </div>
      </div>

      <div className="space-y-6">
        <AdminFilterBar>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
            <Input
              type="text"
              placeholder="搜索反馈内容..."
              value={search}
              onChange={(e) => set_search(e.target.value)}
              className="pl-10 h-10 bg-muted/5 border-none shadow-none"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex bg-muted/5 p-1 border border-border/10 rounded-lg">
              {[
                { value: 'all', label: '全部' },
                { value: 'pending', label: '待处理' },
                { value: 'processing', label: '处理中' },
                { value: 'resolved', label: '已解决' },
                { value: 'closed', label: '已关闭' }
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => set_status_filter(s.value)}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-xs font-semibold transition-all",
                    status_filter === s.value 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/10"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <Button variant="ghost" size="icon" className="bg-muted/10 backdrop-blur-xl border border-border shadow-sm text-foreground">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </AdminFilterBar>

        {error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 bg-background rounded-xl border border-border/60 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <span className="text-sm text-destructive font-medium">加载失败</span>
            <span className="text-xs text-muted-foreground/60">
              {error instanceof Error ? error.message : '请稍后重试'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-2"
            >
              重试
            </Button>
          </div>
        ) : isLoading && !data ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-background rounded-xl border border-border/60 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
            <span>正在获取反馈数据...</span>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            pagination={pagination}
          />
        )}
      </div>
    </div>
  )
}
