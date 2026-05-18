'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  History,
  Loader2,
  Save,
  SendHorizontal,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'

import { ProductEditor, initialProductFormState, type ProductFormState } from '@/components/business/admin/product/product-editor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { parseApiResponse } from '@/lib/api/parse-response'
import { useFeatureFlag } from '@/hooks/use-feature-flag'
import { useAiGenerationHistory, type AiGenerationRecord } from '@/hooks/use-ai-generation-history'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { AdminCategory } from '@/plugins/ecommerce/contracts/admin-categories.dto'
import {
  AdminUpdateProductRequestSchema,
  type AdminProduct,
  type AdminProductStatus,
} from '@/plugins/ecommerce/contracts/admin-products.dto'

// ==================== 工具函数 ====================

async function readApiErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as ApiResponse<unknown>
    if (!json.success) return json.error.message
  } catch {
    // ignore
  }
  return res.statusText || '请求失败'
}

function getMediaAssetDisplayUrl(asset: {
  provider: string
  bucket: string
  objectKey: string
  url: string | null
}): string {
  if (asset.provider !== 'local' && asset.url) {
    return asset.url
  }
  switch (asset.provider) {
    case 'local':
      return `/api/v1/public/files/${asset.objectKey}`
    case 'aliyun_oss': {
      const uploadHost = process.env.NEXT_PUBLIC_ALIYUN_OSS_UPLOAD_HOST
      if (uploadHost) return `${uploadHost}/${asset.objectKey}`
      return `https://${asset.bucket}.oss-cn-hangzhou.aliyuncs.com/${asset.objectKey}`
    }
    case 'tencent_cos': {
      const uploadHost = process.env.NEXT_PUBLIC_TENCENT_COS_UPLOAD_HOST
      if (uploadHost) return `${uploadHost}/${asset.objectKey}`
      return `https://${asset.bucket}.cos.ap-guangzhou.myqcloud.com/${asset.objectKey}`
    }
    default:
      return asset.url || ''
  }
}

function extractJsonFromContent(content: string): Record<string, unknown> | null {
  const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : content.trim()
  try {
    return JSON.parse(jsonStr)
  } catch {
    return null
  }
}

// ==================== 页面组件 ====================

/**
 * Function: AdminProductsEditPage
 *
 * Description: 编辑商品独立页面。
 *              参考文章编辑页面 (AdminBlogEditPage) 的风格。
 *              加载已有商品数据填充表单，支持保存更改、发布和删除操作。
 *
 * Returns:
 *   element(React.ReactElement): 编辑商品页面
 */
export default function AdminProductsEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const productId = params.id

  // ==================== 表单状态 ====================
  const [form, setForm] = React.useState<ProductFormState>(initialProductFormState)
  const [isInitialized, setIsInitialized] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  /** 合并表单变更 */
  const handleFormChange = React.useCallback((updates: Partial<ProductFormState>) => {
    setForm((prev) => ({ ...prev, ...updates }))
  }, [])

  // ==================== AI 相关状态 ====================
  const [aiGenerationOpen, setAiGenerationOpen] = React.useState(false)
  const [aiGenerationPrompt, setAiGenerationPrompt] = React.useState('')
  const [aiGenerationProgress, setAiGenerationProgress] = React.useState<string | null>(null)
  const [aiGenerationStream, setAiGenerationStream] = React.useState(false)
  const [aiFieldPreview, setAiFieldPreview] = React.useState<{
    field: string
    value: string
    type: 'text' | 'image' | 'pricing'
  } | null>(null)
  const [aiFieldPreviewOpen, setAiFieldPreviewOpen] = React.useState(false)

  const { history, addRecord, deleteRecord, clearHistory } = useAiGenerationHistory()
  const [aiHistoryOpen, setAiHistoryOpen] = React.useState(false)
  const aiGenerationResultRef = React.useRef<Partial<AiGenerationRecord>>({})

  const [showZeroPriceConfirm, setShowZeroPriceConfirm] = React.useState(false)

  const { isEnabled: isAiTextGenerationEnabled } = useFeatureFlag('ai_text_generation')
  const { isEnabled: isAiPricingSuggestionEnabled } = useFeatureFlag('ai_pricing_suggestion')

  // ==================== 数据查询 ====================

  /** 获取分类列表 */
  const { data: categoriesData } = useQuery<{ items: AdminCategory[] }>({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/categories', { credentials: 'include' })
      if (!res.ok) throw new Error(`Failed to fetch categories: ${res.statusText}`)
      const json = (await res.json()) as ApiResponse<{ items: AdminCategory[] }>
      if (!json.success) throw new Error(json.error.message)
      return { items: json.data.items }
    },
    staleTime: 5 * 60 * 1000,
  })

  const categories = categoriesData?.items ?? []

  /** 获取商品详情 */
  const { data: productData, isLoading: loading } = useQuery<AdminProduct>({
    queryKey: ['admin', 'products', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required')
      const res = await fetch(`/api/v1/admin/products/${productId}`, { credentials: 'include' })
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      const json = (await res.json()) as ApiResponse<AdminProduct>
      if (!json.success) throw new Error(json.error.message)
      return json.data
    },
    enabled: !!productId,
  })

  // 当商品数据加载完成后，填充表单
  React.useEffect(() => {
    if (productData && !isInitialized) {
      setForm({
        name: productData.name,
        summary: productData.summary ?? '',
        description: productData.description ?? '',
        kind: productData.kind,
        priceAmount: productData.price.amount,
        originalPriceAmount: productData.originalPrice?.amount ?? '',
        stockQuantity: productData.stockQuantity,
        isFeatured: productData.isFeatured,
        tags: productData.tags,
        serviceGuarantees: productData.serviceGuarantees ?? ['正品保障'],
        categoryIds: productData.categoryIds ?? [],
        coverAssetId: productData.coverAssetId ?? '',
        coverUrl: productData.coverUrl ?? '',
        mediaAssetIds: productData.mediaAssetIds ?? [],
        newMediaAssetIds: [],
        newMediaUrlList: [],
        deletedApiMediaIndices: new Set(),
        productStatus: productData.status as AdminProductStatus | null,
      })
      setIsInitialized(true)
    }
  }, [productData, isInitialized])

  // ==================== 草稿自动保存 ====================

  const cacheKey = `product_draft_${productId}`
  const isMutating = false

  React.useEffect(() => {
    if (!isInitialized) return
    const timer = setTimeout(() => {
      const draft = {
        name: form.name,
        summary: form.summary,
        description: form.description,
        kind: form.kind,
        priceAmount: form.priceAmount,
        originalPriceAmount: form.originalPriceAmount,
        stockQuantity: form.stockQuantity,
        isFeatured: form.isFeatured,
        tags: form.tags,
        serviceGuarantees: form.serviceGuarantees,
        categoryIds: form.categoryIds,
        coverAssetId: form.coverAssetId,
        newMediaAssetIds: form.newMediaAssetIds,
      }
      localStorage.setItem(cacheKey, JSON.stringify(draft))
    }, 1000)
    return () => clearTimeout(timer)
  }, [form, cacheKey, isInitialized])

  const restoreDraft = React.useCallback(() => {
    const saved = localStorage.getItem(cacheKey)
    if (!saved) return
    try {
      const draft = JSON.parse(saved)
      handleFormChange({
        name: draft.name ?? '',
        summary: draft.summary ?? '',
        description: draft.description ?? '',
        kind: draft.kind ?? 'course',
        priceAmount: draft.priceAmount ?? '',
        originalPriceAmount: draft.originalPriceAmount ?? '',
        stockQuantity: draft.stockQuantity ?? null,
        isFeatured: draft.isFeatured ?? false,
        tags: draft.tags ?? [],
        serviceGuarantees: draft.serviceGuarantees ?? ['正品保障'],
        categoryIds: draft.categoryIds ?? [],
        coverAssetId: draft.coverAssetId ?? '',
        newMediaAssetIds: draft.newMediaAssetIds ?? [],
      })
      toast({ title: '草稿已恢复', description: '已从本地缓存中加载您之前的编辑内容' })
    } catch {
      /* ignore */
    }
  }, [cacheKey, handleFormChange, toast])

  // ==================== 提交处理 ====================

  /** 更新商品 mutation */
  const updateMutation = useMutation({
    mutationFn: async () => {
      const apiMediaIds = productData?.mediaAssetIds || []
      const finalMediaAssetIds = [
        ...apiMediaIds.filter((_, idx) => !form.deletedApiMediaIndices.has(idx)),
        ...form.newMediaAssetIds,
      ]

      const payload = {
        name: form.name,
        kind: form.kind,
        summary: form.summary.trim() === '' ? null : form.summary,
        description: form.description.trim() === '' ? null : form.description,
        priceAmount: form.priceAmount,
        originalPriceAmount: form.originalPriceAmount.trim() === '' ? null : form.originalPriceAmount,
        stockQuantity: form.stockQuantity,
        isFeatured: form.isFeatured,
        tags: form.tags,
        serviceGuarantees: form.serviceGuarantees,
        categoryIds: form.categoryIds,
        coverAssetId: form.coverAssetId.trim() === '' ? null : form.coverAssetId,
        mediaAssetIds: finalMediaAssetIds,
      }

      const parsed = AdminUpdateProductRequestSchema.safeParse(payload)
      if (!parsed.success) {
        const newErrors: Record<string, string> = {}
        parsed.error.issues.forEach((issue) => {
          if (issue.path.length > 0) {
            newErrors[issue.path[0].toString()] = issue.message
          }
        })
        throw new Error(JSON.stringify(newErrors))
      }

      const res = await fetch(`/api/v1/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(parsed.data),
      })

      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res))
      }

      return parsed.data
    },
    onSuccess: () => {
      localStorage.removeItem(cacheKey)
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'products', productId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'products', 'stats'] })
      toast({ title: '保存成功', description: `商品「${form.name}」已更新` })
    },
    onError: (error) => {
      try {
        const errorObj = JSON.parse(error.message)
        setErrors(errorObj)
        toast({ title: '校验失败', description: '请检查表单中标记为红色的字段', variant: 'destructive' })
      } catch {
        toast({ title: '保存失败', description: error.message, variant: 'destructive' })
      }
    },
  })

  /** 删除商品 mutation */
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error('Product ID is required')
      const res = await fetch(`/api/v1/admin/products/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(await readApiErrorMessage(res))
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'products', 'stats'] })
      toast({ title: '删除成功' })
      router.push('/admin/products')
    },
    onError: (error) => {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' })
    },
  })

  /** 保存更改 */
  const handleSave = React.useCallback(() => {
    if (!form.name.trim()) {
      toast({ title: '请输入商品名称', variant: 'destructive' })
      return
    }
    // 零价格确认
    if (form.priceAmount && parseFloat(form.priceAmount) === 0) {
      setShowZeroPriceConfirm(true)
      return
    }
    setErrors({})
    updateMutation.mutate()
  }, [form.name, form.priceAmount, updateMutation, toast])

  /** 删除商品 */
  const handleDelete = React.useCallback(() => {
    if (!confirm('确定要删除这个商品吗？此操作不可撤销。')) return
    deleteMutation.mutate()
  }, [deleteMutation])

  /** 返回列表 */
  const handleGoBack = React.useCallback(() => {
    router.push('/admin/products')
  }, [router])

  const isSubmitting = updateMutation.isPending || deleteMutation.isPending

  // ==================== AI 功能（与创建页面相同，此处省略重复注释） ====================

  const handleAiGenerate = React.useCallback(async () => {
    if (!aiGenerationPrompt.trim()) return
    setAiGenerationProgress('正在生成商品信息...')
    setAiGenerationOpen(false)

    try {
      const response = await fetch('/api/v1/admin/ai/generate/product-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ kind: 'product', prompt: aiGenerationPrompt }),
      })
      if (!response.ok) throw new Error(await readApiErrorMessage(response))
      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法读取响应流')
      setAiGenerationStream(true)

      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) { setAiGenerationStream(false); break }
        buffer += new TextDecoder().decode(value)
        const eventBlocks = buffer.split('\n\n')
        buffer = eventBlocks.pop() || ''

        for (const block of eventBlocks) {
          if (!block.trim()) continue
          let eventType = ''
          let eventData: Record<string, unknown> = {}
          for (const line of block.split('\n')) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim()
            else if (line.startsWith('data: ')) { try { eventData = JSON.parse(line.slice(6)) } catch { /* skip */ } }
          }

          if (eventType === 'pipeline_start') { setAiGenerationProgress('开始生成流程...') }
          else if (eventType === 'step_complete') {
            const step = eventData.step as string | undefined
            const stepData = eventData.data as Record<string, unknown> | undefined
            if (step === 'text' && stepData?.content) {
              const parsed = extractJsonFromContent(stepData.content as string)
              if (parsed) {
                const updates: Partial<ProductFormState> = {}
                if (parsed.name) { updates.name = parsed.name as string; aiGenerationResultRef.current.name = parsed.name as string }
                if (parsed.summary) { updates.summary = parsed.summary as string; aiGenerationResultRef.current.summary = parsed.summary as string }
                if (parsed.description) { updates.description = parsed.description as string; aiGenerationResultRef.current.description = parsed.description as string }
                if (Object.keys(updates).length > 0) handleFormChange(updates)
                setAiGenerationProgress('已生成商品文本信息')
              }
            } else if (step === 'image' && stepData?.url) {
              handleFormChange({ coverUrl: stepData.url as string, coverAssetId: (stepData.assetId as string) || '' })
              setAiGenerationProgress('已生成封面图')
            } else if (step === 'pricing' && stepData?.suggestedPrice !== undefined) {
              handleFormChange({ priceAmount: String(stepData.suggestedPrice) })
              setAiGenerationProgress('已生成价格建议')
            }
          } else if (eventType === 'pipeline_complete') {
            setAiGenerationProgress('生成完成'); setAiGenerationStream(false)
            addRecord({ prompt: aiGenerationPrompt, ...aiGenerationResultRef.current })
            aiGenerationResultRef.current = {}
            setTimeout(() => setAiGenerationProgress(null), 2000)
          } else if (eventType === 'error') {
            toast({ title: 'AI 生成错误', description: (eventData.message as string) || '未知错误', variant: 'destructive' })
            setAiGenerationProgress(null); setAiGenerationStream(false)
          }
        }
      }
    } catch (error) {
      toast({ title: 'AI 生成失败', description: error instanceof Error ? error.message : '网络错误', variant: 'destructive' })
      setAiGenerationProgress(null); setAiGenerationStream(false)
    }
  }, [aiGenerationPrompt, handleFormChange, addRecord, toast])

  const handleAiFieldGenerate = React.useCallback(async (field: string) => {
    let endpoint = ''
    let previewValue = ''
    let requestBody: Record<string, unknown> = {}
    switch (field) {
      case 'name':
        endpoint = '/api/v1/admin/ai/generate/text'; previewValue = '生成商品名称...'
        requestBody = { kind: 'name', prompt: `为商品生成名称。${form.name ? `现有名称参考：${form.name}` : ''}${form.summary ? `摘要：${form.summary}` : ''}` }; break
      case 'summary':
        endpoint = '/api/v1/admin/ai/generate/text'; previewValue = '生成营销摘要...'
        requestBody = { kind: 'summary', prompt: `为商品生成营销摘要。${form.name ? `商品名称：${form.name}` : ''}` }; break
      case 'description':
        endpoint = '/api/v1/admin/ai/generate/text'; previewValue = '生成详细描述...'
        requestBody = { kind: 'description', prompt: `为商品生成详细描述。${form.name ? `商品名称：${form.name}` : ''}${form.summary ? `摘要：${form.summary}` : ''}` }; break
      case 'price':
        endpoint = '/api/v1/admin/ai/generate/pricing'; previewValue = '生成价格建议...'
        requestBody = { prompt: `为商品生成价格建议。${form.name ? `商品名称：${form.name}` : ''}` }; break
      default: return
    }
    setAiFieldPreview({ field, value: previewValue, type: field === 'price' ? 'pricing' : 'text' })
    setAiFieldPreviewOpen(true)
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(requestBody) })
      if (!response.ok) throw new Error(await readApiErrorMessage(response))
      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法读取响应流')
      let buffer = ''; let accumulatedText = ''; let priceValue = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buffer += new TextDecoder().decode(value)
        const eventBlocks = buffer.split('\n\n'); buffer = eventBlocks.pop() || ''
        for (const block of eventBlocks) {
          if (!block.trim()) continue
          let eventType = ''; let eventData: Record<string, unknown> = {}
          for (const line of block.split('\n')) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim()
            else if (line.startsWith('data: ')) { try { eventData = JSON.parse(line.slice(6)) } catch { /* skip */ } }
          }
          if (eventType === 'text_delta') accumulatedText += (eventData.delta as string) || ''
          else if (eventType === 'step_complete') {
            const stepData = eventData.data as Record<string, unknown> | undefined
            if (stepData?.content) accumulatedText = stepData.content as string
            else if (stepData?.suggestedPrice !== undefined) priceValue = String(stepData.suggestedPrice)
          } else if (eventType === 'error') throw new Error((eventData.message as string) || '生成失败')
        }
      }
      if (field === 'price' && priceValue) setAiFieldPreview((prev) => (prev ? { ...prev, value: priceValue } : null))
      else if (accumulatedText) setAiFieldPreview((prev) => (prev ? { ...prev, value: accumulatedText } : null))
      else throw new Error('未收到生成结果')
    } catch (error) {
      toast({ title: 'AI 生成失败', description: error instanceof Error ? error.message : '网络错误', variant: 'destructive' })
      setAiFieldPreview(null); setAiFieldPreviewOpen(false)
    }
  }, [form.name, form.summary, toast])

  const adoptAiPreview = React.useCallback(() => {
    if (!aiFieldPreview) return
    const updates: Partial<ProductFormState> = {}
    switch (aiFieldPreview.field) {
      case 'name': updates.name = aiFieldPreview.value; break
      case 'summary': updates.summary = aiFieldPreview.value; break
      case 'description': updates.description = aiFieldPreview.value; break
      case 'cover': updates.coverUrl = aiFieldPreview.value; updates.coverAssetId = 'ai-generated'; break
      case 'price': updates.priceAmount = aiFieldPreview.value; break
    }
    if (Object.keys(updates).length > 0) handleFormChange(updates)
    setAiFieldPreview(null); setAiFieldPreviewOpen(false)
  }, [aiFieldPreview, handleFormChange])

  // ==================== API 媒体 URLs ====================

  const apiMediaUrls = React.useMemo(() => productData?.mediaUrls ?? [], [productData?.mediaUrls])

  // ==================== 渲染 ====================

  // 加载中状态
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">正在加载商品数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* ==================== 顶部操作栏 ==================== */}
      <div className="flex h-[60px] shrink-0 items-center justify-between border-b bg-white px-7">
        {/* 左侧：标题 + 状态 */}
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">编辑商品</h2>
          {form.productStatus && (
            <Badge
              variant={form.productStatus === 'published' ? 'success' : 'secondary'}
              className="px-2 py-0.5 text-xs"
            >
              {form.productStatus === 'published' ? '已上架' : '草稿'}
            </Badge>
          )}
          <code className="text-[10px] bg-muted/5 px-1.5 py-0.5 rounded text-muted-foreground">
            ID: {productId}
          </code>

          {/* AI 生成进度条 */}
          {aiGenerationStream && aiGenerationProgress && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20">
              <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span className="text-xs text-primary font-medium">{aiGenerationProgress}</span>
            </div>
          )}
        </div>

        {/* 右侧：操作按钮组 */}
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" className="gap-2" onClick={handleGoBack} disabled={isSubmitting}>
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>

          <Button type="button" variant="outline" className="gap-2" onClick={restoreDraft} disabled={isSubmitting}>
            <History className="h-4 w-4" />
            恢复草稿
          </Button>

          {isAiTextGenerationEnabled && (
            <>
              <Button type="button" variant="outline" className="gap-2" onClick={() => setAiGenerationOpen(true)} disabled={isSubmitting}>
                <Sparkles className="h-4 w-4" />
                AI 生成
              </Button>
              {history.length > 0 && (
                <Button type="button" variant="ghost" className="gap-2 text-muted-foreground" onClick={() => setAiHistoryOpen(true)}>
                  <History className="h-4 w-4" />
                  历史 ({history.length})
                </Button>
              )}
            </>
          )}

          <Button type="button" variant="destructive" className="gap-2" onClick={handleDelete} disabled={isSubmitting}>
            <Trash2 className="h-4 w-4" />
            删除
          </Button>

          <Button type="button" variant="outline" className="gap-2" onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            保存
          </Button>

          <Button type="button" className="gap-2 shadow-lg shadow-primary/20" onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            发布
          </Button>
        </div>
      </div>

      {/* ==================== 编辑器主体 ==================== */}
      {isInitialized && (
        <div className="flex-1 overflow-hidden">
          <ProductEditor
            form={form}
            onFormChange={handleFormChange}
            categories={categories}
            categoriesLoading={categoriesData === undefined}
            onAiFieldGenerate={isAiTextGenerationEnabled ? handleAiFieldGenerate : undefined}
            isAiTextEnabled={isAiTextGenerationEnabled}
            isAiPricingEnabled={isAiPricingSuggestionEnabled}
            apiMediaUrls={apiMediaUrls}
            getMediaAssetDisplayUrl={getMediaAssetDisplayUrl}
          />
        </div>
      )}

      {/* ==================== AI 一键生成对话框 ==================== */}
      <Dialog open={aiGenerationOpen} onOpenChange={setAiGenerationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI 一键生成商品信息
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">生成提示</Label>
              <Textarea
                placeholder="描述您想要生成的商品..."
                value={aiGenerationPrompt}
                onChange={(e) => setAiGenerationPrompt(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setAiGenerationOpen(false)}>取消</Button>
            <Button onClick={handleAiGenerate} disabled={!!aiGenerationStream}>
              {aiGenerationStream ? '生成中...' : '开始生成'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== AI 历史对话框 ==================== */}
      <Dialog open={aiHistoryOpen} onOpenChange={setAiHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              AI 生成历史
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-2">
            {history.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">暂无生成记录</div>
            ) : (
              <div className="space-y-3">
                {history.map((record) => (
                  <Card key={record.id} className="p-3 hover:border-primary/40 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{record.name || '未命名'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{record.prompt}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="outline" size="sm" className="h-7 px-3 text-xs" onClick={() => {
                          const updates: Partial<ProductFormState> = {}
                          if (record.name) updates.name = record.name
                          if (record.summary) updates.summary = record.summary
                          if (record.description) updates.description = record.description
                          if (record.priceAmount) updates.priceAmount = record.priceAmount
                          if (Object.keys(updates).length > 0) handleFormChange(updates)
                          setAiHistoryOpen(false)
                          toast({ title: '已应用' })
                        }}>应用</Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive" onClick={() => deleteRecord(record.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ==================== AI 预览对话框 ==================== */}
      <Dialog open={aiFieldPreviewOpen} onOpenChange={setAiFieldPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI 生成预览
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {aiFieldPreview && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                <p className="text-sm text-primary font-medium mb-2">
                  {aiFieldPreview.field === 'name' && '商品名称预览'}
                  {aiFieldPreview.field === 'summary' && '营销摘要预览'}
                  {aiFieldPreview.field === 'description' && '详细描述预览'}
                  {aiFieldPreview.field === 'price' && '价格建议预览'}
                </p>
                <p className="text-sm text-primary">{aiFieldPreview.value}</p>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setAiFieldPreviewOpen(false)}>取消</Button>
              <Button onClick={adoptAiPreview}>采纳</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== 零价格确认对话框 ==================== */}
      <Dialog open={showZeroPriceConfirm} onOpenChange={setShowZeroPriceConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              确认商品价格
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
              <p className="text-sm text-warning font-medium mb-2">您设置的商品价格为 ¥0.00</p>
              <p className="text-xs text-warning">价格为零的商品可能是免费的促销品或赠品。请确认是否继续？</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setShowZeroPriceConfirm(false); handleFormChange({ priceAmount: '' }) }} className="gap-2">
                <X className="h-4 w-4" /> 重新设置
              </Button>
              <Button onClick={() => { setShowZeroPriceConfirm(false); setErrors({}); updateMutation.mutate() }} className="gap-2 bg-warning hover:bg-warning/90">
                <CheckCircle2 className="h-4 w-4" /> 确认价格
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
