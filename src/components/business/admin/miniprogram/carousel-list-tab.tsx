'use client'

import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table/index'
import { Search, Plus, Eye, Pencil, Trash2, ImageOff, Power, RefreshCw, X, Loader2, Link as LinkIcon } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import Image from 'next/image'
import Link from 'next/link'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ApiResponse } from '@/contracts/api-response.schema'

/**
 * 轮播图数据类型
 */
interface Carousel {
  id: string
  title: string
  imageUrl: string
  link?: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
}

interface CarouselListResponse {
  items: Carousel[]
  total: number
}

/**
 * Function: useCarouselColumns
 *
 * Description: 轮播图表格列定义
 *
 * Parameters:
 *   actions(object): 列操作回调集合
 *
 * Returns:
 *   columns(ColumnDef<Carousel>[]): 列定义数组
 */
function useCarouselColumns(actions: {
  togglingCarouselId: string | null
  onToggle: (id: string) => void
  onDelete: (carousel: Carousel) => void
  isDeletePending: boolean
}): ColumnDef<Carousel>[] {
  return useMemo(() => [
    {
      id: 'preview',
      header: '预览',
      size: 96,
      cell: ({ row }) => {
        const carousel = row.original
        return (
          <div className="relative h-16 w-24 rounded-md overflow-hidden bg-muted">
            {carousel.imageUrl ? (
              <Image
                src={carousel.imageUrl}
                alt={carousel.title}
                fill
                className="object-cover"
                sizes="96px"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <ImageOff className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'title',
      header: '标题',
      cell: ({ row }) => <span className="font-medium">{row.getValue('title')}</span>,
    },
    {
      id: 'link',
      header: '跳转链接',
      cell: ({ row }) => {
        const link = row.original.link
        return link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex max-w-60 items-center gap-1 truncate text-sm text-muted-foreground hover:text-foreground"
            title={link}
          >
            <LinkIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{link}</span>
          </a>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )
      },
    },
    {
      accessorKey: 'sortOrder',
      header: '排序',
      size: 80,
      cell: ({ row }) => <Badge variant="outline">#{row.getValue('sortOrder')}</Badge>,
    },
    {
      accessorKey: 'isActive',
      header: '状态',
      size: 100,
      cell: ({ row }) => {
        const isActive = row.getValue('isActive') as boolean
        return (
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? '已启用' : '已禁用'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: '创建时间',
      size: 120,
      cell: ({ row }) => new Date(row.getValue('createdAt') as string).toLocaleDateString('zh-CN'),
    },
    {
      id: 'actions',
      header: () => null,
      size: 144,
      cell: ({ row }) => {
        const carousel = row.original
        return (
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  aria-label="预览轮播图"
                  disabled={!carousel.imageUrl}
                  onClick={() => {
                    if (!carousel.imageUrl) return
                    window.open(carousel.imageUrl, '_blank', 'noopener,noreferrer')
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>预览</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                  <Link href={`/admin/miniprogram/carousels/${carousel.id}/edit`} aria-label="编辑轮播图">
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>编辑</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  aria-label={carousel.isActive ? '禁用轮播图' : '启用轮播图'}
                  disabled={actions.togglingCarouselId === carousel.id}
                  onClick={() => actions.onToggle(carousel.id)}
                >
                  {actions.togglingCarouselId === carousel.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{carousel.isActive ? '禁用' : '启用'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  aria-label="删除轮播图"
                  disabled={actions.isDeletePending}
                  onClick={() => actions.onDelete(carousel)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>删除</TooltipContent>
            </Tooltip>
          </div>
        )
      },
    },
  ], [actions])
}

/**
 * 轮播图列表组件
 * 提供轮播图的列表展示、搜索、预览、编辑和删除功能
 */
export function CarouselListTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [carouselToDelete, setCarouselToDelete] = useState<Carousel | null>(null)
  const [togglingCarouselId, setTogglingCarouselId] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<CarouselListResponse>({
    queryKey: ['admin', 'miniprogram', 'carousels', 'list'],
    queryFn: async () => {
      const params = new URLSearchParams({ page: '1', pageSize: '100' })
      const res = await fetch(`/api/v1/admin/miniprogram/carousels?${params.toString()}`, {
        credentials: 'include',
      })
      const json = (await res.json()) as ApiResponse<CarouselListResponse>

      if (!res.ok) {
        throw new Error(json.success === false ? json.error?.message || '请求失败' : res.statusText)
      }

      if (!json.success) {
        throw new Error(json.error?.message || '获取轮播图失败')
      }

      return json.data
    },
  })

  const carousels = data?.items ?? []

  const deleteMutation = useMutation({
    mutationFn: async (carouselId: string) => {
      const res = await fetch(`/api/v1/admin/miniprogram/carousels/${carouselId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = (await res.json()) as ApiResponse<unknown>

      if (!res.ok) {
        throw new Error(json.success === false ? json.error?.message || '请求失败' : res.statusText)
      }

      if (!json.success) {
        throw new Error(json.error?.message || '删除失败')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'miniprogram', 'carousels', 'list'] })
      toast({
        title: '删除成功',
        description: '轮播图已删除',
        variant: 'default',
      })
    },
    onError: (error) => {
      toast({
        title: '删除失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async (carouselId: string) => {
      const res = await fetch(`/api/v1/admin/miniprogram/carousels/${carouselId}/toggle`, {
        method: 'PATCH',
        credentials: 'include',
      })
      const json = (await res.json()) as ApiResponse<unknown>

      if (!res.ok) {
        throw new Error(json.success === false ? json.error?.message || '请求失败' : res.statusText)
      }

      if (!json.success) {
        throw new Error(json.error?.message || '更新状态失败')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'miniprogram', 'carousels', 'list'] })
      toast({
        title: '状态更新成功',
        description: '轮播图状态已切换',
        variant: 'default',
      })
    },
    onError: (error) => {
      toast({
        title: '状态更新失败',
        description: error instanceof Error ? error.message : '网络错误，请稍后再试',
        variant: 'destructive',
      })
    },
  })

  /** 处理删除操作 */
  const handleDelete = (carousel: Carousel) => {
    setCarouselToDelete(carousel)
    setDeleteDialogOpen(true)
  }

  /** 确认删除 */
  const confirmDelete = async () => {
    if (!carouselToDelete) return
    await deleteMutation.mutateAsync(carouselToDelete.id)
    setDeleteDialogOpen(false)
    setCarouselToDelete(null)
  }

  /** 取消删除 */
  const cancelDelete = () => {
    setDeleteDialogOpen(false)
    setCarouselToDelete(null)
  }

  /** 过滤轮播图列表 */
  const filteredCarousels = carousels.filter((carousel) => carousel.title.toLowerCase().includes(searchQuery.toLowerCase()))

  /** 处理启用/禁用切换 */
  const handleToggle = async (carouselId: string) => {
    try {
      setTogglingCarouselId(carouselId)
      await toggleMutation.mutateAsync(carouselId)
    } finally {
      setTogglingCarouselId(null)
    }
  }

  // 列定义
  const columns = useCarouselColumns({
    togglingCarouselId,
    onToggle: (id) => void handleToggle(id),
    onDelete: handleDelete,
    isDeletePending: deleteMutation.isPending,
  })

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* 操作栏 */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
              <Input
                placeholder="按标题搜索轮播图"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
                aria-label="搜索轮播图"
              />
              {searchQuery ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                  onClick={() => setSearchQuery('')}
                  aria-label="清空搜索"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
            <Badge variant="outline" className="w-fit">
              显示 {filteredCarousels.length} / {carousels.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? '刷新中' : '刷新'}
            </Button>
            <Button asChild>
              <Link href="/admin/miniprogram/carousels/create">
                <Plus className="mr-2 h-4 w-4" />
                新建轮播图
              </Link>
            </Button>
          </div>
        </div>

        {/* 表格 */}
        <DataTable columns={columns} data={filteredCarousels} />

        {/* 删除确认对话框 */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除轮播图「{carouselToDelete?.title}」吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDelete}>取消</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? '删除中...' : '删除'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
