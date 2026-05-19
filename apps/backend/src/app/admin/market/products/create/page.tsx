'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
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
  AdminCreateProductRequestSchema,
  type AdminProduct,
} from '@/plugins/ecommerce/contracts/admin-products.dto'

// ==================== 工具函数 ====================

/**
 * 从 API 错误响应中提取错误消息
 */
async function readApiErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as ApiResponse<unknown>
    if (!json.success) return json.error.message
  } catch {
    // ignore
  }
  return res.statusText || '请求失败'
}

/**
 * 根据 media asset 数据生成显示 URL
 */
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
      if (uploadHost) {
        return `${uploadHost}/${asset.objectKey}`
      }
      return `https://${asset.bucket}.oss-cn-hangzhou.aliyuncs.com/${asset.objectKey}`
    }
    case 'tencent_cos': {
      const uploadHost = process.env.NEXT_PUBLIC_TENCENT_COS_UPLOAD_HOST
      if (uploadHost) {
        return `${uploadHost}/${asset.objectKey}`
      }
      return `https://${asset.bucket}.cos.ap-guangzhou.myqcloud.com/${asset.objectKey}`
    }
    default:
      return asset.url || ''
  }
}

/**
 * 从 AI 返回的内容中提取 JSON 对象
 * 支持纯 JSON 或被 markdown 代码块包裹的 JSON
 */
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
 * Function: AdminProductsCreatePage
 *
 * Description: 创建商品独立页面。
 *              参考文章写页面 (AdminBlogWritePage) 的风格，采用顶部操作栏 + 左右分栏编辑器布局。
 *              包含 AI 一键生成、单字段生成、草稿自动保存等功能。
 *              创建成功后自动跳转到编辑页面。
 *
 * Returns:
 *   element(React.ReactElement): 创建商品页面
 */
export default function AdminProductsCreatePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // ==================== 表单状态 ====================
  const [form, setForm] = React.useState<ProductFormState>(initialProductFormState)
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

  // AI 生成历史
  const { history, addRecord, deleteRecord, clearHistory } = useAiGenerationHistory()
  const [aiHistoryOpen, setAiHistoryOpen] = React.useState(false)
  const aiGenerationResultRef = React.useRef<Partial<AiGenerationRecord>>({})

  // 零价格确认
  const [showZeroPriceConfirm, setShowZeroPriceConfirm] = React.useState(false)

  // 功能开关
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

  // ==================== 草稿自动保存 ====================

  const cacheKey = 'product_draft_new'
  const isSubmitting = false // 创建页面初始值

  React.useEffect(() => {
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
  }, [form, cacheKey])

  /** 恢复草稿 */
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

  /** 创建商品 mutation */
  const createMutation = useMutation({
    mutationFn: async () => {
      // 计算最终的 mediaAssetIds
      const finalMediaAssetIds = [...form.newMediaAssetIds]

      const payload = {
        name: form.name,
        kind: form.kind,
        status: 'published' as const,
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

      const parsed = AdminCreateProductRequestSchema.safeParse(payload)
      if (!parsed.success) {
        const newErrors: Record<string, string> = {}
        parsed.error.issues.forEach((issue) => {
          if (issue.path.length > 0) {
            newErrors[issue.path[0].toString()] = issue.message
          }
        })
        throw new Error(JSON.stringify(newErrors))
      }

      const res = await fetch('/api/v1/admin/products', {
        method: 'POST',
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'products', 'stats'] })
      toast({ title: '发布成功', description: `商品「${form.name}」已发布` })
      // 跳转到列表页（暂时不跳转到编辑页，因为没有拿到返回的 id）
      router.push('/admin/market/products')
    },
    onError: (error) => {
      try {
        const errorObj = JSON.parse(error.message)
        setErrors(errorObj)
        toast({ title: '校验失败', description: '请检查表单中标记为红色的字段', variant: 'destructive' })
      } catch {
        toast({ title: '发布失败', description: error.message, variant: 'destructive' })
      }
    },
  })

  /** 保存草稿（暂不实现，创建页面直接发布或存为草稿状态） */
  const handleSaveDraft = React.useCallback(() => {
    if (!form.name.trim()) {
      toast({ title: '请输入商品名称', variant: 'destructive' })
      return
    }
    // 创建时保存草稿 = 以 draft 状态保存到后端
    // 暂时使用创建接口 + 草稿提示
    toast({ title: '草稿已自动保存到本地', description: '商品信息已暂存在浏览器中' })
  }, [form.name, toast])

  /** 发布商品 */
  const handlePublish = React.useCallback(() => {
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
    createMutation.mutate()
  }, [form.name, form.priceAmount, createMutation, toast])

  /** 返回列表 */
  const handleGoBack = React.useCallback(() => {
    router.push('/admin/market/products')
  }, [router])

  const isMutating = createMutation.isPending

  // ==================== AI 一键生成 ====================

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

      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response))
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法读取响应流')

      setAiGenerationStream(true)
      processAiStream(reader)
    } catch (error) {
      toast({
        title: 'AI 生成失败',
        description: error instanceof Error ? error.message : '网络错误',
        variant: 'destructive',
      })
      setAiGenerationProgress(null)
      setAiGenerationStream(false)
    }
  }, [aiGenerationPrompt, toast])

  /** 处理 AI SSE 事件流 */
  const processAiStream = React.useCallback(
    async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          setAiGenerationStream(false)
          break
        }

        buffer += new TextDecoder().decode(value)
        const eventBlocks = buffer.split('\n\n')
        buffer = eventBlocks.pop() || ''

        for (const block of eventBlocks) {
          if (!block.trim()) continue

          let eventType = ''
          let eventData: Record<string, unknown> = {}

          for (const line of block.split('\n')) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim()
            } else if (line.startsWith('data: ')) {
              try {
                eventData = JSON.parse(line.slice(6))
              } catch {
                /* skip */
              }
            }
          }

          switch (eventType) {
            case 'pipeline_start':
              setAiGenerationProgress('开始生成流程...')
              break

            case 'step_complete': {
              const step = eventData.step as string | undefined
              const stepData = eventData.data as Record<string, unknown> | undefined

              if (step === 'text' && stepData?.content) {
                setAiGenerationProgress('正在解析商品信息...')
                const parsed = extractJsonFromContent(stepData.content as string)
                if (parsed) {
                  const updates: Partial<ProductFormState> = {}
                  if (parsed.name) {
                    updates.name = parsed.name as string
                    aiGenerationResultRef.current.name = parsed.name as string
                  }
                  if (parsed.summary) {
                    updates.summary = parsed.summary as string
                    aiGenerationResultRef.current.summary = parsed.summary as string
                  }
                  if (parsed.description) {
                    updates.description = parsed.description as string
                    aiGenerationResultRef.current.description = parsed.description as string
                  }
                  if (Object.keys(updates).length > 0) {
                    handleFormChange(updates)
                  }
                  setAiGenerationProgress('已生成商品文本信息')
                }
              } else if (step === 'image' && stepData?.url) {
                handleFormChange({
                  coverUrl: stepData.url as string,
                  coverAssetId: (stepData.assetId as string) || '',
                })
                setAiGenerationProgress('已生成封面图')
                aiGenerationResultRef.current.coverUrl = stepData.url as string
              } else if (step === 'pricing' && stepData?.suggestedPrice !== undefined) {
                const price = String(stepData.suggestedPrice)
                handleFormChange({ priceAmount: price })
                setAiGenerationProgress('已生成价格建议')
                aiGenerationResultRef.current.priceAmount = price
              }
              break
            }

            case 'step_error': {
              const errorStep = eventData.step as string | undefined
              if (errorStep === 'image') {
                setAiGenerationProgress('图片生成跳过（未配置）')
              } else if (eventData.error) {
                toast({
                  title: 'AI 步骤错误',
                  description: eventData.error as string,
                  variant: 'destructive',
                })
              }
              break
            }

            case 'pipeline_complete':
              setAiGenerationProgress('生成完成')
              setAiGenerationStream(false)
              addRecord({
                prompt: aiGenerationPrompt,
                ...aiGenerationResultRef.current,
              })
              aiGenerationResultRef.current = {}
              setTimeout(() => setAiGenerationProgress(null), 2000)
              break

            case 'error':
              toast({
                title: 'AI 生成错误',
                description: (eventData.message as string) || '未知错误',
                variant: 'destructive',
              })
              setAiGenerationProgress(null)
              setAiGenerationStream(false)
              break
          }
        }
      }
    },
    [aiGenerationPrompt, handleFormChange, addRecord, toast],
  )

  // ==================== AI 单字段生成 ====================

  const handleAiFieldGenerate = React.useCallback(
    async (field: string) => {
      let endpoint = ''
      let previewValue = ''
      let requestBody: Record<string, unknown> = {}

      switch (field) {
        case 'name':
          endpoint = '/api/v1/admin/ai/generate/text'
          previewValue = '生成商品名称...'
          requestBody = {
            kind: 'name',
            prompt: `为商品生成名称。${form.name ? `现有名称参考：${form.name}` : ''}${form.summary ? `摘要：${form.summary}` : ''}`,
          }
          break
        case 'summary':
          endpoint = '/api/v1/admin/ai/generate/text'
          previewValue = '生成营销摘要...'
          requestBody = {
            kind: 'summary',
            prompt: `为商品生成营销摘要。${form.name ? `商品名称：${form.name}` : ''}${form.description ? `详细描述：${form.description.substring(0, 200)}` : ''}`,
          }
          break
        case 'description':
          endpoint = '/api/v1/admin/ai/generate/text'
          previewValue = '生成详细描述...'
          requestBody = {
            kind: 'description',
            prompt: `为商品生成详细描述。${form.name ? `商品名称：${form.name}` : ''}${form.summary ? `摘要：${form.summary}` : ''}`,
          }
          break
        case 'cover':
          endpoint = '/api/v1/admin/ai/generate/image'
          previewValue = '生成封面图...'
          requestBody = {
            prompt: `商品封面图。${form.name ? `商品：${form.name}` : ''}${form.summary ? ` ${form.summary}` : ''}`,
          }
          break
        case 'price':
          endpoint = '/api/v1/admin/ai/generate/pricing'
          previewValue = '生成价格建议...'
          requestBody = {
            prompt: `为商品生成价格建议。${form.name ? `商品名称：${form.name}` : ''}${form.summary ? `摘要：${form.summary}` : ''}`,
          }
          break
        default:
          return
      }

      setAiFieldPreview({
        field,
        value: previewValue,
        type: field === 'cover' ? 'image' : field === 'price' ? 'pricing' : 'text',
      })
      setAiFieldPreviewOpen(true)

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          throw new Error(await readApiErrorMessage(response))
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('无法读取响应流')

        let buffer = ''
        let accumulatedText = ''
        let priceValue = ''
        let imageUrl = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += new TextDecoder().decode(value)
          const eventBlocks = buffer.split('\n\n')
          buffer = eventBlocks.pop() || ''

          for (const block of eventBlocks) {
            if (!block.trim()) continue

            let eventType = ''
            let eventData: Record<string, unknown> = {}

            for (const line of block.split('\n')) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim()
              } else if (line.startsWith('data: ')) {
                try {
                  eventData = JSON.parse(line.slice(6))
                } catch {
                  /* skip */
                }
              }
            }

            if (eventType === 'text_delta') {
              accumulatedText += (eventData.delta as string) || ''
            } else if (eventType === 'step_complete') {
              const stepData = eventData.data as Record<string, unknown> | undefined
              if (stepData?.content) {
                accumulatedText = stepData.content as string
              } else if (stepData?.url) {
                imageUrl = stepData.url as string
              } else if (stepData?.suggestedPrice !== undefined) {
                priceValue = String(stepData.suggestedPrice)
              }
            } else if (eventType === 'error') {
              throw new Error((eventData.message as string) || '生成失败')
            }
          }
        }

        if (field === 'cover' && imageUrl) {
          setAiFieldPreview((prev) => (prev ? { ...prev, value: imageUrl } : null))
        } else if (field === 'price' && priceValue) {
          setAiFieldPreview((prev) => (prev ? { ...prev, value: priceValue } : null))
        } else if (accumulatedText) {
          setAiFieldPreview((prev) => (prev ? { ...prev, value: accumulatedText } : null))
        } else {
          throw new Error('未收到生成结果')
        }
      } catch (error) {
        toast({
          title: 'AI 生成失败',
          description: error instanceof Error ? error.message : '网络错误',
          variant: 'destructive',
        })
        setAiFieldPreview(null)
        setAiFieldPreviewOpen(false)
      }
    },
    [form.name, form.summary, form.description, toast],
  )

  /** 采纳 AI 预览值 */
  const adoptAiPreview = React.useCallback(() => {
    if (!aiFieldPreview) return

    const updates: Partial<ProductFormState> = {}
    switch (aiFieldPreview.field) {
      case 'name':
        updates.name = aiFieldPreview.value
        break
      case 'summary':
        updates.summary = aiFieldPreview.value
        break
      case 'description':
        updates.description = aiFieldPreview.value
        break
      case 'cover':
        updates.coverUrl = aiFieldPreview.value
        updates.coverAssetId = 'ai-generated'
        break
      case 'price':
        updates.priceAmount = aiFieldPreview.value
        break
    }

    if (Object.keys(updates).length > 0) {
      handleFormChange(updates)
    }

    setAiFieldPreview(null)
    setAiFieldPreviewOpen(false)
  }, [aiFieldPreview, handleFormChange])

  // ==================== 渲染 ====================

  return (
    <div className="flex h-full flex-col">
      {/* ==================== 顶部操作栏 ==================== */}
      <div className="flex h-[60px] shrink-0 items-center justify-between border-b bg-white px-7">
        {/* 左侧：标题 + AI 功能按钮 */}
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">创建商品</h2>

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
          <Button
            type="button"
            variant="ghost"
            className="gap-2"
            onClick={handleGoBack}
            disabled={isMutating}
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>

          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={restoreDraft}
            disabled={isMutating}
          >
            <History className="h-4 w-4" />
            恢复草稿
          </Button>

          {isAiTextGenerationEnabled && (
            <>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => setAiGenerationOpen(true)}
                disabled={isMutating}
              >
                <Sparkles className="h-4 w-4" />
                AI 生成
              </Button>
              {history.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="gap-2 text-muted-foreground"
                  onClick={() => setAiHistoryOpen(true)}
                >
                  <History className="h-4 w-4" />
                  历史 ({history.length})
                </Button>
              )}
            </>
          )}

          <Button
            type="button"
            className="gap-2 shadow-lg shadow-primary/20"
            onClick={handlePublish}
            disabled={isMutating}
          >
            {isMutating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
            发布
          </Button>
        </div>
      </div>

      {/* ==================== 编辑器主体 ==================== */}
      <div className="flex-1 overflow-hidden">
        <ProductEditor
          form={form}
          onFormChange={handleFormChange}
          categories={categories}
          categoriesLoading={categoriesData === undefined}
          onAiFieldGenerate={isAiTextGenerationEnabled ? handleAiFieldGenerate : undefined}
          isAiTextEnabled={isAiTextGenerationEnabled}
          isAiPricingEnabled={isAiPricingSuggestionEnabled}
          getMediaAssetDisplayUrl={getMediaAssetDisplayUrl}
        />
      </div>

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
                placeholder="描述您想要生成的商品，例如：'一款高级瑜伽垫，环保材料，适合初学者和专业人士使用'"
                value={aiGenerationPrompt}
                onChange={(e) => setAiGenerationPrompt(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
            {aiGenerationProgress && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                <p className="text-sm text-primary">{aiGenerationProgress}</p>
              </div>
            )}
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setAiGenerationOpen(false)}>
              取消
            </Button>
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
                  <Card key={record.id} className="p-3 hover:border-primary/40 transition-colors cursor-pointer group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {record.name || '未命名生成'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {record.prompt}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-muted-foreground">
                            {new Date(record.timestamp).toLocaleString('zh-CN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {record.priceAmount && (
                            <span className="text-xs text-primary font-medium">
                              ¥{record.priceAmount}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-3 text-xs"
                          onClick={() => {
                            const updates: Partial<ProductFormState> = {}
                            if (record.name) updates.name = record.name
                            if (record.summary) updates.summary = record.summary
                            if (record.description) updates.description = record.description
                            if (record.priceAmount) updates.priceAmount = record.priceAmount
                            if (record.coverUrl) {
                              updates.coverUrl = record.coverUrl
                              if (record.coverAssetId) updates.coverAssetId = record.coverAssetId
                            }
                            if (Object.keys(updates).length > 0) handleFormChange(updates)
                            setAiHistoryOpen(false)
                            toast({ title: '已应用', description: '历史记录已填入表单' })
                          }}
                        >
                          应用
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => deleteRecord(record.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
          {history.length > 0 && (
            <div className="flex justify-end border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:text-destructive"
                onClick={() => {
                  clearHistory()
                  toast({ title: '已清空' })
                }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                清空全部
              </Button>
            </div>
          )}
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
                  {aiFieldPreview.field === 'cover' && '封面图预览'}
                  {aiFieldPreview.field === 'price' && '价格建议预览'}
                </p>
                {aiFieldPreview.type === 'image' ? (
                  <div className="w-full h-32 bg-muted/10 rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={aiFieldPreview.value}
                      alt="AI 生成预览"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-primary">{aiFieldPreview.value}</p>
                )}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setAiFieldPreviewOpen(false)}>
                取消
              </Button>
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
              <p className="text-sm text-warning font-medium mb-2">
                您设置的商品价格为 ¥0.00
              </p>
              <p className="text-xs text-warning">
                价格为零的商品可能是免费的促销品或赠品。请确认是否继续？
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowZeroPriceConfirm(false)
                  handleFormChange({ priceAmount: '' })
                }}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                重新设置
              </Button>
              <Button
                onClick={() => {
                  setShowZeroPriceConfirm(false)
                  setErrors({})
                  createMutation.mutate()
                }}
                className="gap-2 bg-warning hover:bg-warning/90"
              >
                <CheckCircle2 className="h-4 w-4" />
                确认价格
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
