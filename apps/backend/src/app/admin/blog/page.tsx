'use client'

import * as React from 'react'
import { CheckCircle, FileText, Layers, Plus, Search } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { AdminBlogArticleForm } from '@/components/business/admin/blog/admin-blog-article-form'
import { AdminBlogArticleList } from '@/components/business/admin/blog/admin-blog-article-list'
import { AdminFilterBar } from '@/components/ui/admin-filter-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KpiCard } from '@/components/business/ui/kpi-card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ApiResponse } from '@/contracts/api-response.schema'
import {
  AdminArticleListResponseSchema,
  type AdminArticleListResponse,
  type AdminArticleStatus,
} from '@/contracts/dtos/admin/blog/articles.dto'
import {
  AdminBlogCategoryTreeResponseSchema,
  type AdminBlogCategory,
} from '@/contracts/dtos/admin/blog/categories.dto'
import { useDebounce } from '@/hooks/use-debounce'

type ArticleFormMode = 'idle' | 'create' | 'edit' | 'view'

type BlogArticleKpiStats = {
  totalArticles: number
  publishedCount: number
  draftCount: number
  archivedCount: number
  totalViews: number
}

async function fetchApiData<T>(url: string, schema?: { safeParse: (input: unknown) => { success: true; data: T } | { success: false } }) {
  const response = await fetch(url, {
    credentials: 'include',
  })

  const json = (await response.json()) as ApiResponse<unknown>

  if (!response.ok) {
    throw new Error(json.success === false ? json.error.message : response.statusText)
  }

  if (!json.success) {
    throw new Error(json.error.message)
  }

  if (!schema) {
    return json.data as T
  }

  const parsed = schema.safeParse(json.data)
  if (!parsed.success) {
    throw new Error('响应数据格式不符合预期')
  }

  return parsed.data
}

async function fetchArticleListTotalCount(status?: AdminArticleStatus): Promise<number> {
  const params = new URLSearchParams({ limit: '1' })

  if (status) {
    params.set('status', status)
  }

  const data = await fetchApiData<AdminArticleListResponse>(
    `/api/v1/admin/blog/articles?${params.toString()}`,
    AdminArticleListResponseSchema,
  )

  return data.totalCount
}

/**
Function: AdminBlogArticlesPage

Description: 后台博客文章管理首页，整合 KPI 指标、关键词/状态/分类筛选、文章列表与文章表单弹窗。

Returns:
	element(React.ReactElement): 博客文章管理页面
*/
export default function AdminBlogArticlesPage() {
  const queryClient = useQueryClient()
  const [activeArticleId, setActiveArticleId] = React.useState<string | null>(null)
  const [mode, setMode] = React.useState<ArticleFormMode>('idle')

  const [keyword, setKeyword] = React.useState('')
  const [status, setStatus] = React.useState<string>('all')
  const [categoryId, setCategoryId] = React.useState<string>('all')

  const [statusSelectOpen, setStatusSelectOpen] = React.useState(false)
  const [categorySelectOpen, setCategorySelectOpen] = React.useState(false)
  const isSelectingRef = React.useRef(false)

  const debouncedKeyword = useDebounce(keyword, 500)

  const filters = React.useMemo(
    () => ({
      keyword: debouncedKeyword || undefined,
      status: status === 'all' ? undefined : status,
      categoryId: categoryId === 'all' ? undefined : categoryId,
    }),
    [categoryId, debouncedKeyword, status],
  )

  const { data: categoriesData } = useQuery<{ items: AdminBlogCategory[] }>({
    queryKey: ['admin', 'blog-categories'],
    queryFn: async () => fetchApiData('/api/v1/admin/blog/categories', AdminBlogCategoryTreeResponseSchema),
    staleTime: 5 * 60 * 1000,
  })

  const { data: stats } = useQuery<BlogArticleKpiStats>({
    queryKey: ['admin', 'blog-articles', 'kpis'],
    queryFn: async () => {
      const [totalArticles, publishedCount, draftCount, archivedCount] = await Promise.all([
        fetchArticleListTotalCount(),
        fetchArticleListTotalCount('PUBLISHED'),
        fetchArticleListTotalCount('DRAFT'),
        fetchArticleListTotalCount('ARCHIVED'),
      ])

      return {
        totalArticles,
        publishedCount,
        draftCount,
        archivedCount,
        totalViews: 0,
      }
    },
    staleTime: 60 * 1000,
  })

  const categories = categoriesData?.items ?? []

  // 使用 useCallback 稳定化回调引用，防止子组件 columns useMemo 无限重建导致重渲染循环
  const refreshList = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'blog-articles'] })
  }, [queryClient])

  const handleSelectArticle = React.useCallback((articleId: string) => {
    setActiveArticleId(articleId)
    setMode('edit')
  }, [])

  const handleViewArticle = React.useCallback((articleId: string) => {
    setActiveArticleId(articleId)
    setMode('view')
  }, [])

  const handleFormSaved = React.useCallback(() => {
    refreshList()
    setMode('idle')
    setActiveArticleId(null)
  }, [refreshList])

  const handleFormCancel = React.useCallback(() => {
    setMode('idle')
    setActiveArticleId(null)
  }, [])

  return (
    <div className="flex animate-in fade-in duration-500 flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="总文章数" value={stats?.totalArticles ?? 0} icon={<FileText className="h-4 w-4" />} />
        <KpiCard label="已发布数" value={stats?.publishedCount ?? 0} icon={<CheckCircle className="h-4 w-4" />} />
        <KpiCard label="草稿数" value={stats?.draftCount ?? 0} icon={<FileText className="h-4 w-4" />} />
        <KpiCard label="总阅读量" value={stats?.totalViews ?? 0} icon={<Layers className="h-4 w-4" />} />
      </div>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div />

        <div className="flex items-center gap-3">
          <Button
            type="button"
            className="gap-2 shadow-lg shadow-primary/20"
            onClick={() => {
              setActiveArticleId(null)
              setMode('create')
            }}
          >
            <Plus className="h-4 w-4" />
            新建文章
          </Button>
        </div>
      </div>

      <AdminFilterBar>
        <div className="relative min-w-60 max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <Input
            placeholder="搜索文章标题..."
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="h-10 border-none bg-muted/5 pl-10 shadow-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={status}
            onValueChange={(value) => {
              isSelectingRef.current = true
              setStatus(value)
              setStatusSelectOpen(true)
              setTimeout(() => {
                isSelectingRef.current = false
              }, 0)
            }}
            open={statusSelectOpen}
            onOpenChange={(open) => {
              if (!open && isSelectingRef.current) {
                return
              }
              setStatusSelectOpen(open)
            }}
          >
            <SelectTrigger className="h-10 w-32 border-border/30 bg-muted/20 hover:bg-muted/10 data-[state=open]:bg-muted/10">
              <SelectValue placeholder="所有状态" />
            </SelectTrigger>
            <SelectContent className="border border-border/40 bg-card">
              <SelectGroup>
                <SelectLabel>状态</SelectLabel>
                <Separator className="my-1" />
                <SelectItem value="all">所有状态</SelectItem>
                <SelectItem value="DRAFT">草稿</SelectItem>
                <SelectItem value="PUBLISHED">已发布</SelectItem>
                <SelectItem value="ARCHIVED">已归档</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            value={categoryId}
            onValueChange={(value) => {
              isSelectingRef.current = true
              setCategoryId(value)
              setCategorySelectOpen(true)
              setTimeout(() => {
                isSelectingRef.current = false
              }, 0)
            }}
            open={categorySelectOpen}
            onOpenChange={(open) => {
              if (!open && isSelectingRef.current) {
                return
              }
              setCategorySelectOpen(open)
            }}
          >
            <SelectTrigger className="h-10 w-40 border-border/30 bg-muted/20 hover:bg-muted/10 data-[state=open]:bg-muted/10">
              <SelectValue placeholder="所有分类" />
            </SelectTrigger>
            <SelectContent className="border border-border/40 bg-card">
              <SelectGroup>
                <SelectLabel>分类</SelectLabel>
                <Separator className="my-1" />
                <SelectItem value="all">所有分类</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {(keyword || status !== 'all' || categoryId !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setKeyword('')
                setStatus('all')
                setCategoryId('all')
              }}
              className="h-10 whitespace-nowrap text-foreground/40 hover:bg-muted/20 hover:text-foreground"
              style={{ writingMode: 'horizontal-tb' }}
            >
              重置
            </Button>
          )}
        </div>
      </AdminFilterBar>

      <AdminBlogArticleList
        filters={filters}
        onSelect={handleSelectArticle}
        onView={handleViewArticle}
      />

      {mode !== 'idle' && (
        <AdminBlogArticleForm
          articleId={activeArticleId}
          mode={mode}
          onSaved={handleFormSaved}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  )
}
