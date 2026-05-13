'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AdminTabs, AdminTabsContent, AdminTabsList, AdminTabsTrigger } from '@/components/ui/admin-tabs'
import { 
  Package, 
  Image as ImageIcon, 
  Type, 
  DollarSign,
  CheckCircle2,
  Trash2,
  Layers,
  Sparkles,
  History,
  Layout,
  X,
  Plus,
  Search,
  AlertCircle,
  ChevronDown,
  Folder,
  Loader2
} from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { Textarea } from '@/components/ui/textarea'
import type { ApiResponse } from '@/contracts/api-response.schema'
import type { AdminCategory } from '@/plugins/ecommerce/contracts/admin-categories.dto'
import {
  AdminCreateProductRequestSchema,
  AdminUpdateProductRequestSchema,
  type AdminProduct,
  type AdminProductKind,
  type AdminProductStatus,
} from '@/plugins/ecommerce/contracts/admin-products.dto'
import { RichTextEditor } from '../rich-text-editor'
import { MaterialPicker } from '../media/material-picker'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import Image from 'next/image'
import { useFeatureFlag } from '@/hooks/use-feature-flag'
import { useAiGenerationHistory, type AiGenerationRecord } from '@/hooks/use-ai-generation-history'

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
Function: AdminProductForm
<BLANK LINE>
Description: 增强版管理后台商品表单：采用 Tabs 分组展示，深度集成 TipTap 富文本与素材库。支持本地草稿自动保存与恢复。
<BLANK LINE>
Parameters:
	productId(string | null): 编辑模式下的商品 ID；为空时为新建模式
	onSaved(() => void): 保存成功后的回调
	onCancel(() => void): 取消编辑/新建的回调
<BLANK LINE>
Returns:
	element(React.ReactElement): 商品表单 UI
*/
export function AdminProductForm({
  productId,
  mode = 'edit',
  onSaved,
  onCancel,
}: {
  productId: string | null
  mode?: 'create' | 'edit' | 'view'
  onSaved: () => void
  onCancel: () => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const editing = mode === 'edit'
  const viewing = mode === 'view'

  // 基础状态
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // 表单数据
  const [name, setName] = React.useState('')
  const [summary, setSummary] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [kind, setKind] = React.useState<AdminProductKind>('course')
  const [priceAmount, setPriceAmount] = React.useState('')
  const [originalPriceAmount, setOriginalPriceAmount] = React.useState('')
  const [stockQuantity, setStockQuantity] = React.useState<number | null>(null)
  const [isFeatured, setIsFeatured] = React.useState(false)
  const [tags, setTags] = React.useState<string[]>([])
  const [serviceGuarantees, setServiceGuarantees] = React.useState<string[]>(['正品保障'])
  const [categoryIds, setCategoryIds] = React.useState<string[]>([])
  const [coverAssetId, setCoverAssetId] = React.useState<string>('')
  const [showZeroPriceConfirm, setShowZeroPriceConfirm] = React.useState(false)
  const [coverUrl, setCoverUrl] = React.useState<string>('')
  const [mediaAssetIds, setMediaAssetIds] = React.useState<string[]>([])
  const [productStatus, setProductStatus] = React.useState<string | null>(null)

  // 辅助状态
  const [isCoverPickerOpen, setIsCoverPickerOpen] = React.useState(false)
  const [isGalleryPickerOpen, setIsGalleryPickerOpen] = React.useState(false)
  const [categorySearchTerm, setCategorySearchTerm] = React.useState('')

  // hover 状态（控制删除按钮显示）
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null)

  // 存储新添加图片的 URL 列表（按添加顺序）
  const [newMediaUrlList, setNewMediaUrlList] = React.useState<string[]>([])
  // 存储新添加图片的 ID 列表（按添加顺序，与 newMediaUrlList 一一对应）
  const [newMediaAssetIds, setNewMediaAssetIds] = React.useState<string[]>([])

  // 已删除的 API 图片索引集合
  const [deletedApiMediaIndices, setDeletedApiMediaIndices] = React.useState<Set<number>>(new Set())

  // AI 相关状态
  const [aiGenerationOpen, setAiGenerationOpen] = React.useState(false)
  const [aiGenerationPrompt, setAiGenerationPrompt] = React.useState('')
  const [aiGenerationProgress, setAiGenerationProgress] = React.useState<string | null>(null)
  const [aiGenerationStream, setAiGenerationStream] = React.useState(false)
  const [aiFieldPreview, setAiFieldPreview] = React.useState<{ field: string; value: string; type: 'text' | 'image' | 'pricing' } | null>(null)
  const [aiFieldPreviewOpen, setAiFieldPreviewOpen] = React.useState(false)

  // AI 生成历史相关
  const { history, addRecord, deleteRecord, clearHistory } = useAiGenerationHistory()
  const [aiHistoryOpen, setAiHistoryOpen] = React.useState(false)
  const aiGenerationResultRef = React.useRef<Partial<AiGenerationRecord>>({})

  // 使用 useQuery 获取分类列表
  const { data: categoriesData } = useQuery<{ items: AdminCategory[] }>({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/categories', { credentials: 'include' })
      if (!res.ok) {
        throw new Error(`Failed to fetch categories: ${res.statusText}`)
      }
      const json = await res.json() as ApiResponse<{ items: AdminCategory[] }>
      if (!json.success) {
        throw new Error(json.error.message)
      }
      return { items: json.data.items }
    },
    staleTime: 5 * 60 * 1000, // 5 分钟内数据视为新鲜
  })

  const categories = categoriesData?.items ?? []

  // 使用 useQuery 获取商品详情（仅编辑模式）
  const { data: productData, isLoading: loading } = useQuery<AdminProduct>({
    queryKey: ['admin', 'products', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required')

      const res = await fetch(`/api/v1/admin/products/${productId}`, { credentials: 'include' })
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res))
      }

      const json = await res.json() as ApiResponse<AdminProduct>
      if (!json.success) {
        throw new Error(json.error.message)
      }

      return json.data
    },
    enabled: !!productId && (editing || viewing),
  })

  // 当商品详情数据加载成功后，初始化表单状态
  React.useEffect(() => {
    if (productData) {
      setName(productData.name)
      setSummary(productData.summary ?? '')
      setDescription(productData.description ?? '')
      setKind(productData.kind)
      setPriceAmount(productData.price.amount)
      setOriginalPriceAmount(productData.originalPrice?.amount ?? '')
      setStockQuantity(productData.stockQuantity)
      setIsFeatured(productData.isFeatured)
      setTags(productData.tags)
      setServiceGuarantees(productData.serviceGuarantees ?? ['正品保障'])
      setCategoryIds(productData.categoryIds ?? [])
      setCoverAssetId(productData.coverAssetId ?? '')
      setCoverUrl(productData.coverUrl ?? '')
      setMediaAssetIds(productData.mediaAssetIds ?? [])
      setProductStatus(productData.status)
    }
  }, [productData])

  // 创建分类的 mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/v1/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res))
      }
      const json = await res.json() as ApiResponse<AdminCategory>
      if (!json.success) {
        throw new Error(json.error.message)
      }
      return json.data
    },
    onSuccess: (newCategory) => {
      // 更新分类列表缓存
      queryClient.setQueryData(['admin', 'categories'], (old: { items: AdminCategory[] } | undefined) => {
        if (!old) return { items: [newCategory] }
        return { items: [...old.items, newCategory] }
      })
      setCategoryIds(prev => [...prev, newCategory.id])
      setCategorySearchTerm('')
      toast({ title: '分类已创建并选择' })
    },
    onError: (error) => {
      toast({ title: '创建分类失败', description: error instanceof Error ? error.message : '网络错误', variant: 'destructive' })
    },
  })

  const handleCreateCategory = (name: string) => {
    if (!name.trim() || createCategoryMutation.isPending) return
    createCategoryMutation.mutate(name)
  }

  /**
  Function: getMediaAssetDisplayUrl
  Description: 根据媒体资产数据生成显示 URL
  */
  function getMediaAssetDisplayUrl(asset: { provider: string; bucket: string; objectKey: string; url: string | null }): string {
    // 云存储：如果数据库中已有 URL，直接返回
    if (asset.provider !== 'local' && asset.url) {
      return asset.url
    }

    // 根据 provider 生成 URL
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

  // AI 功能相关
  const { isEnabled: isAiTextGenerationEnabled } = useFeatureFlag('ai_text_generation')
  const { isEnabled: isAiPricingSuggestionEnabled } = useFeatureFlag('ai_pricing_suggestion')

// AI 一键生成处理
  const handleAiGenerate = async () => {
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

      // 启动流式处理
      setAiGenerationStream(true)
      processAiStream(reader)
    } catch (error) {
      toast({ title: 'AI 生成失败', description: error instanceof Error ? error.message : '网络错误', variant: 'destructive' })
      setAiGenerationProgress(null)
      setAiGenerationStream(false)
    }
  }

  /**
   * Function: extractJsonFromContent
   * 从 AI 返回的内容中提取 JSON 对象
   * 支持纯 JSON 或被 markdown 代码块包裹的 JSON
   */
  const extractJsonFromContent = (content: string): Record<string, unknown> | null => {
    // 尝试从 markdown 代码块中提取 JSON
    const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
    const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : content.trim()
    try {
      return JSON.parse(jsonStr)
    } catch {
      return null
    }
  }

  /**
   * Function: processAiStream
   * 处理后端 SSE 事件流，解析各步骤结果并更新表单
   * 后端格式: pipeline_start → step_complete(text) → step_complete(image) → step_complete(pricing) → pipeline_complete
   */
  const processAiStream = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        setAiGenerationStream(false)
        break
      }

      buffer += new TextDecoder().decode(value)

      // 标准 SSE 解析：按双换行分割事件块
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
            } catch { /* skip malformed JSON */ }
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
              // 文本步骤完成：从 content 中提取 JSON 并填充表单
              setAiGenerationProgress('正在解析商品信息...')
              const parsed = extractJsonFromContent(stepData.content as string)
              if (parsed) {
                const textName = (parsed.name as string) || ''
                const textSummary = (parsed.summary as string) || ''
                const textDescription = (parsed.description as string) || ''

                if (textName) {
                  setName(textName)
                  aiGenerationResultRef.current.name = textName
                }
                if (textSummary) {
                  setSummary(textSummary)
                  aiGenerationResultRef.current.summary = textSummary
                }
                if (textDescription) {
                  setDescription(textDescription)
                  aiGenerationResultRef.current.description = textDescription
                }
                setAiGenerationProgress('已生成商品文本信息')
              }
            } else if (step === 'image' && stepData?.url) {
              // 图片步骤完成
              const url = stepData.url as string
              const assetId = (stepData.assetId as string) || ''
              setCoverUrl(url)
              setCoverAssetId(assetId)
              setAiGenerationProgress('已生成封面图')
              aiGenerationResultRef.current.coverUrl = url
              aiGenerationResultRef.current.coverAssetId = assetId
            } else if (step === 'pricing' && stepData?.suggestedPrice !== undefined) {
              // 价格步骤完成
              const price = String(stepData.suggestedPrice)
              setPriceAmount(price)
              setAiGenerationProgress('已生成价格建议')
              aiGenerationResultRef.current.priceAmount = price
            }
            break
          }

          case 'step_error': {
            const errorStep = eventData.step as string | undefined
            const errorMessage = eventData.error as string | undefined
            // 图片生成失败是可接受的（可能未配置 image model），仅提示
            if (errorStep === 'image') {
              setAiGenerationProgress('图片生成跳过（未配置）')
            } else if (errorMessage) {
              toast({ title: 'AI 步骤错误', description: errorMessage, variant: 'destructive' })
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
            toast({ title: 'AI 生成错误', description: (eventData.message as string) || '未知错误', variant: 'destructive' })
            setAiGenerationProgress(null)
            setAiGenerationStream(false)
            break
        }
      }
    }
  }

  // 单字段 AI 生成处理
  const handleAiFieldGenerate = async (field: string) => {
    let endpoint = ''
    let previewValue = ''
    let requestBody: Record<string, unknown> = {}

    switch (field) {
      case 'name':
        endpoint = '/api/v1/admin/ai/generate/text'
        previewValue = '生成商品名称...'
        requestBody = { kind: 'name', prompt: `为商品生成名称。${name ? `现有名称参考：${name}` : ''}${summary ? `摘要：${summary}` : ''}` }
        break
      case 'summary':
        endpoint = '/api/v1/admin/ai/generate/text'
        previewValue = '生成营销摘要...'
        requestBody = { kind: 'summary', prompt: `为商品生成营销摘要。${name ? `商品名称：${name}` : ''}${description ? `详细描述：${description.substring(0, 200)}` : ''}` }
        break
      case 'description':
        endpoint = '/api/v1/admin/ai/generate/text'
        previewValue = '生成详细描述...'
        requestBody = { kind: 'description', prompt: `为商品生成详细描述。${name ? `商品名称：${name}` : ''}${summary ? `摘要：${summary}` : ''}` }
        break
      case 'cover':
        endpoint = '/api/v1/admin/ai/generate/image'
        previewValue = '生成封面图...'
        requestBody = { prompt: `商品封面图。${name ? `商品：${name}` : ''}${summary ? ` ${summary}` : ''}` }
        break
      case 'price':
        endpoint = '/api/v1/admin/ai/generate/pricing'
        previewValue = '生成价格建议...'
        requestBody = { prompt: `为商品生成价格建议。${name ? `商品名称：${name}` : ''}${summary ? `摘要：${summary}` : ''}` }
        break
      default:
        return
    }

    setAiFieldPreview({ field, value: previewValue, type: field === 'cover' ? 'image' : field === 'price' ? 'pricing' : 'text' })
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

      // 所有 AI 端点都是 SSE 流式响应，需要解析事件流
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
              try { eventData = JSON.parse(line.slice(6)) } catch { /* skip */ }
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
        setAiFieldPreview(prev => prev ? { ...prev, value: imageUrl } : null)
      } else if (field === 'price' && priceValue) {
        setAiFieldPreview(prev => prev ? { ...prev, value: priceValue } : null)
      } else if (accumulatedText) {
        setAiFieldPreview(prev => prev ? { ...prev, value: accumulatedText } : null)
      } else {
        throw new Error('未收到生成结果')
      }
    } catch (error) {
      toast({ title: 'AI 生成失败', description: error instanceof Error ? error.message : '网络错误', variant: 'destructive' })
      setAiFieldPreview(null)
      setAiFieldPreviewOpen(false)
    }
  }

  // 采纳 AI 预览值
  const adoptAiPreview = () => {
    if (!aiFieldPreview) return

    switch (aiFieldPreview.field) {
      case 'name':
        setName(aiFieldPreview.value as string)
        break
      case 'summary':
        setSummary(aiFieldPreview.value as string)
        break
      case 'description':
        setDescription(aiFieldPreview.value as string)
        break
      case 'cover':
        setCoverUrl(aiFieldPreview.value as string)
        setCoverAssetId('ai-generated')
        break
      case 'price':
        setPriceAmount(aiFieldPreview.value as string)
        break
    }

    setAiFieldPreview(null)
    setAiFieldPreviewOpen(false)
  }

  // 保存商品的 mutation
  const saveProductMutation = useMutation({
    mutationFn: async () => {
      // 计算最终的 mediaAssetIds：过滤掉已删除的 API 图片，并移除已删除的新图片
      const apiMediaIds = productData?.mediaAssetIds || []
      const finalMediaAssetIds = [
        ...apiMediaIds.filter((_, idx) => !deletedApiMediaIndices.has(idx)),
        ...newMediaAssetIds,
      ]

      const payload = {
        name,
        kind,
        ...(!editing ? { status: 'published' as AdminProductStatus } : {}),
        summary: summary.trim() === '' ? null : summary,
        description: description.trim() === '' ? null : description,
        priceAmount,
        originalPriceAmount: originalPriceAmount.trim() === '' ? null : originalPriceAmount,
        stockQuantity,
        isFeatured,
        tags,
        serviceGuarantees,
        categoryIds,
        coverAssetId: coverAssetId.trim() === '' ? null : coverAssetId,
        mediaAssetIds: finalMediaAssetIds,
      }

      const validator = editing ? AdminUpdateProductRequestSchema : AdminCreateProductRequestSchema
      const parsed = validator.safeParse(payload)

      if (!parsed.success) {
        const newErrors: Record<string, string> = {}
        parsed.error.issues.forEach(issue => {
          if (issue.path.length > 0) {
            newErrors[issue.path[0].toString()] = issue.message
          }
        })
        throw new Error(JSON.stringify(newErrors))
      }

      const url = editing ? `/api/v1/admin/products/${productId}` : '/api/v1/admin/products'
      const method = editing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
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
      localStorage.removeItem(cacheKey) // 成功后清除草稿
      // 使商品列表缓存失效
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      // 如果是编辑模式，也使当前商品详情缓存失效
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'products', productId] })
      }
      toast({ title: '保存成功', variant: 'default' })
      onSaved()
    },
    onError: (error) => {
      // 检查是否是验证错误
      try {
        const errorObj = JSON.parse(error.message)
        setErrors(errorObj)
        toast({ title: '校验失败', description: '请检查表单中标记为红色的字段', variant: 'destructive' })
      } catch {
        toast({ title: '保存失败', description: error.message, variant: 'destructive' })
      }
    },
  })

  // 删除商品的 mutation
  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error('Product ID is required')

      const res = await fetch(`/api/v1/admin/products/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res))
      }
      return true
    },
    onSuccess: () => {
      // 使商品列表缓存失效
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      // 使当前商品详情缓存失效
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'products', productId] })
      }
      toast({ title: '删除成功', variant: 'default' })
      onSaved()
    },
    onError: (error) => {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' })
    },
  })

  // 派生状态：是否为零价格（避免重复计算 parseFloat）
  const isZeroPrice = React.useMemo(() => {
    if (!priceAmount || priceAmount.trim() === '') return false
    return parseFloat(priceAmount) === 0
  }, [priceAmount])

  const submitProduct = React.useCallback(() => {
    setErrors({})
    saveProductMutation.mutate()
  }, [saveProductMutation])

  // 表单提交处理：零价格仅在保存时触发确认
  const onSubmit = React.useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    if (isZeroPrice) {
      setShowZeroPriceConfirm(true)
      return
    }
    submitProduct()
  }, [isZeroPrice, submitProduct])

  // 删除处理
  const onDelete = () => {
    if (!productId || !confirm('确定要删除这个商品吗？此操作不可撤销。')) return
    deleteProductMutation.mutate()
  }

  // 计算提交状态
  const isSubmitting = saveProductMutation.isPending || deleteProductMutation.isPending

  // 草稿缓存 key（直接计算，不需要 useMemo）
  const cacheKey = `product_draft_${productId || 'new'}`

  React.useEffect(() => {
    // 自动保存
    if (loading || isSubmitting) return
    const timer = setTimeout(() => {
      const draft = {
        name, summary, description, kind, priceAmount, originalPriceAmount,
        stockQuantity, isFeatured, tags, serviceGuarantees, categoryIds, coverAssetId, newMediaAssetIds
      }
      localStorage.setItem(cacheKey, JSON.stringify(draft))
    }, 1000)
    return () => clearTimeout(timer)
  }, [name, summary, description, kind, priceAmount, originalPriceAmount, stockQuantity, isFeatured, tags, serviceGuarantees, categoryIds, coverAssetId, newMediaAssetIds, cacheKey, loading, isSubmitting])

  const restoreDraft = () => {
    const saved = localStorage.getItem(cacheKey)
    if (!saved) return
    try {
      const draft = JSON.parse(saved)
      setName(draft.name)
      setSummary(draft.summary)
      setDescription(draft.description)
      setKind(draft.kind)
      setPriceAmount(draft.priceAmount)
      setOriginalPriceAmount(draft.originalPriceAmount)
      setStockQuantity(draft.stockQuantity)
      setIsFeatured(draft.isFeatured)
      setTags(draft.tags)
      setServiceGuarantees(draft.serviceGuarantees ?? ['正品保障'])
      setCategoryIds(draft.categoryIds)
      setCoverAssetId(draft.coverAssetId)
      // 恢复新添加的媒体资产 IDs 和 URLs（如果草稿中有）
      if (draft.newMediaAssetIds) {
        setNewMediaAssetIds(draft.newMediaAssetIds)
      }
      if (draft.newMediaUrlList) {
        setNewMediaUrlList(draft.newMediaUrlList)
      }
      // 注意：mediaAssetIds 不再从草稿恢复，因为新图片通过 newMediaAssetIds 管理
      toast({ title: '草稿已恢复', description: '已从本地缓存中加载您之前的编辑内容', variant: 'default' })
    } catch { /* ignore */ }
  }

  /**
   * Function: handlePriceChange
   *
   * Description: 处理价格输入变更，包含实时验证
   *
   * Parameters:
   *   value(string): 用户输入的价格值
   *
   * Returns:
   *   void
   */
  const handlePriceChange = React.useCallback((value: string) => {
    // 移除非数字和小数点的字符
    let processed = value.replace(/[^\d.]/g, '')

    // 防止多个小数点：只保留第一个小数点
    const firstDotIndex = processed.indexOf('.')
    if (firstDotIndex !== -1) {
      processed = processed.substring(0, firstDotIndex + 1) +
                  processed.substring(firstDotIndex + 1).replace(/\./g, '')
    }

    // 限制小数点后最多两位
    const parts = processed.split('.')
    if (parts.length === 2 && parts[1].length > 2) {
      parts[1] = parts[1].substring(0, 2)
      processed = parts.join('.')
    }

    // 移除前导零（保留 "0." 和单个 "0"）
    if (processed.length > 1 && !processed.startsWith('0.')) {
      processed = processed.replace(/^0+/, '') || '0'
    }

    setPriceAmount(processed)
  }, [])

  /**
   * Function: confirmZeroPrice
   *
   * Description: 确认零价格
   *
   * Parameters:
   *   无
   *
   * Returns:
   *   void
   */
  const confirmZeroPrice = React.useCallback(() => {
    setShowZeroPriceConfirm(false)
    submitProduct()
  }, [submitProduct])

  /**
   * Function: cancelZeroPrice
   *
   * Description: 取消零价格，清空价格输入
   *
   * Parameters:
   *   无
   *
   * Returns:
   *   void
   */
  const cancelZeroPrice = React.useCallback(() => {
    setShowZeroPriceConfirm(false)
    setPriceAmount('')
  }, [])

  return (
    <Dialog modal={false} open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent
        showCloseButton={false}
        showOverlay={false}
        className="max-w-[98vw] w-full xl:max-w-400 h-[90vh] flex flex-col overflow-hidden p-5 !duration-0 !data-[state=open]:animate-none !data-[state=closed]:animate-none"
        // modal={false} 下点击外部会触发关闭，这里阻止所有外部交互引起的关闭
        // 表单关闭只能通过"取消"按钮或保存回调
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e: KeyboardEvent) => e.preventDefault()}
      >
        {/* 编辑、查看表格标题部分 */}
        <DialogHeader className="flex flex-row items-center justify-between border-b space-y-0 shrink-0 pb-5">
          <div className="flex items-center gap-4">
            <div className="bg-primary/20 text-primary p-3 shadow-lg ring-1 ring-primary/30">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                {viewing ? '商品详情' : editing ? '编辑商品信息' : '创建新商品'}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {viewing ? '查看商品的完整配置与状态' : '请填写商品的核心信息，确保内容准确无误'}
                </span>
                {productId && (
                  <code className="text-[10px] bg-muted/5 px-1.5 py-0.5 rounded text-muted-foreground">
                    ID: {productId}
                  </code>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!viewing && (
              <Button variant="outline" size="sm" onClick={restoreDraft} className="text-xs h-9 gap-1.5">
                <History className="h-3.5 w-3.5" />
                恢复草稿
              </Button>
            )}
            {(editing || viewing) && (
              <Badge variant={productStatus === 'published' ? 'success' : 'secondary'} className="px-3 py-1 text-xs font-medium rounded-full">
                {productStatus === 'published' ? '已上架' : '草稿状态'}
              </Badge>
            )}
{isAiTextGenerationEnabled && !viewing && (
  <>
    <Button
      variant="outline"
      size="sm"
      onClick={() => setAiGenerationOpen(true)}
      className="text-xs h-9 gap-1.5"
    >
      <Sparkles className="h-3.5 w-3.5" />
      ✨ AI 一键生成
    </Button>
    {history.length > 0 && (
      <Button variant="ghost" size="sm" onClick={() => setAiHistoryOpen(true)} className="text-xs h-9 gap-1.5 text-muted-foreground">
        <History className="h-3.5 w-3.5" />
        历史 ({history.length})
      </Button>
    )}
  </>
)}
          </div>
        </DialogHeader>

        {/* 内容部分 */}
        <ScrollArea className="flex-1 min-h-0 pr-5">
          <div className="">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Main Content */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* Product Details Card */}
                <Card className="overflow-hidden">
                  <CardHeader className="border-b">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                       <Type className="h-5 w-5 text-primary" /> 商品详情
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {aiGenerationStream && (
                      <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-5 w-5 shrink-0">
                            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-primary">{aiGenerationProgress || '正在生成...'}</p>
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
                              <div className="h-full animate-pulse rounded-full bg-primary" style={{ width: '60%' }} />
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">AI 生成中</span>
                        </div>
                      </div>
                    )}
                    {!viewing && !productStatus && (
                      <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start gap-3 text-warning-foreground mb-6">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        <p className="text-sm">该商品目前处于草稿状态，完善信息后即可发布。</p>
                      </div>
                    )}

                    {/* AI 一键生成对话框 */}
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
                          <Button
                            variant="outline"
                            onClick={() => setAiGenerationOpen(false)}
                          >
                            取消
                          </Button>
                          <Button onClick={handleAiGenerate} disabled={!!aiGenerationStream}>
                            {aiGenerationStream ? '生成中...' : '开始生成'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* AI 生成历史对话框 */}
                    <Dialog open={aiHistoryOpen} onOpenChange={setAiHistoryOpen}>
                      <DialogContent className="max-w-lg max-h-[80vh]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <History className="h-5 w-5 text-primary" />
                            AI 生成历史
                          </DialogTitle>
                          <DialogDescription>选择一条历史记录应用到当前表单</DialogDescription>
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
                                      <p className="text-sm font-medium truncate">{record.name || '未命名生成'}</p>
                                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{record.prompt}</p>
                                      <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(record.timestamp).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {record.priceAmount && <span className="text-xs text-primary font-medium">¥{record.priceAmount}</span>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button variant="outline" size="sm" className="h-7 px-3 text-xs" onClick={() => {
                                        // 应用记录到表单
                                        if (record.name) setName(record.name)
                                        if (record.summary) setSummary(record.summary)
                                        if (record.description) setDescription(record.description)
                                        if (record.priceAmount) setPriceAmount(record.priceAmount)
                                        if (record.coverUrl) { setCoverUrl(record.coverUrl); if (record.coverAssetId) setCoverAssetId(record.coverAssetId) }
                                        setAiHistoryOpen(false)
                                        toast({ title: '已应用', description: '历史记录已填入表单' })
                                      }}>
                                        应用
                                      </Button>
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
                        {history.length > 0 && (
                          <div className="flex justify-end border-t pt-3">
                            <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={() => { clearHistory(); toast({ title: '已清空' }) }}>
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                              清空全部
                            </Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-semibold text-foreground/70">
                          商品名称 <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            placeholder="这里输入商品名称..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={viewing}
                            className={cn(
                              "h-12 bg-muted/10 border-border/30",
                              "hover:bg-muted/15 hover:border-border/40",
                              "focus:bg-transparent focus:border-transparent focus:ring-2 focus:ring-primary/20",
                              "transition-all duration-200",
                              errors.name && "focus:ring-destructive/50"
                            )}
                          />
                          {isAiTextGenerationEnabled && !viewing && (
                            <button
                              onClick={() => handleAiFieldGenerate('name')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-primary transition-colors"
                              title="AI 生成名称"
                            >
                              <Sparkles className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-semibold text-foreground/70">
                          营销摘要
                        </Label>
                        <div className="relative">
                          <Input
                            placeholder="简单概括商品核心卖点，展示在列表页..."
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            disabled={viewing}
                            className={cn(
                              "h-12 bg-muted/10 border-border/30",
                              "hover:bg-muted/15 hover:border-border/40",
                              "focus:bg-transparent focus:border-transparent focus:ring-2 focus:ring-primary/20",
                              "transition-all duration-200"
                            )}
                          />
                          {isAiTextGenerationEnabled && !viewing && (
                            <button
                              onClick={() => handleAiFieldGenerate('summary')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-primary transition-colors"
                              title="AI 生成摘要"
                            >
                              <Sparkles className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label className="text-sm font-semibold text-foreground/70">
                          商品类型 <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={kind}
                          onValueChange={(value) => setKind(value as AdminProductKind)}
                          disabled={editing || viewing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择商品类型" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="course">在线课程 (Course)</SelectItem>
                            <SelectItem value="certificate">专业证书 (Certificate)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label className="text-sm font-semibold text-foreground/70">所属类目</Label>

                        {/* 类目选择 Popover */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <div
                              className={cn(
                                "flex items-center justify-between px-4 h-11 rounded-xl bg-muted/10 border border-border/30 cursor-pointer hover:bg-muted/15 transition-all w-full",
                                viewing && "cursor-default hover:bg-muted/10"
                              )}
                            >

                              {/* 显示已选类目 */}
                              <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
                                {/* 如果有已选类目，并且少于等于2个，显示它们，剩下的显示数量 */}
                                {categoryIds.length > 0 ? (
                                  <>
                                    {/* 显示已选类目中的前两个,显示 dom */}
                                    {categories
                                      .filter(c => categoryIds.includes(c.id))
                                      .slice(0, 2)
                                      .map(c => (
                                        <Badge key={c.id} variant="default" className="h-6 px-2 text-[10px] bg-primary/20 border-primary/30 text-primary-foreground shrink-0">
                                          {c.name}
                                        </Badge>
                                      ))}
                                    {/* 显示剩余未显示的类目数量 */}
                                    {categoryIds.length > 2 && (
                                      <Badge variant="secondary" className="h-6 px-2 text-[10px] bg-muted/20 border-border/20 text-muted-foreground shrink-0">
                                        +{categoryIds.length - 2}
                                      </Badge>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-muted-foreground text-sm truncate">选择所属类目</span>
                                )}
                              </div>
                              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                            </div>
                          </PopoverTrigger>
                          {/* 如果不是查看模式，显示 Popover 内容 */}
                          {!viewing && (
                            <PopoverContent 
                              className="min-w-[320px] p-0 overflow-hidden shadow-2xl z-100" 
                              align="start"
                            >
                              {/* 搜索输入框 */}
                              <div className="p-2 border-b border-border/10 bg-muted/5">
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                  <Input
                                    placeholder="搜索或输入新分类..."
                                    className={cn(
                                      "h-9 pl-8 pr-8 bg-transparent border-none focus-visible:ring-0 text-sm",
                                      "focus:bg-muted/5 transition-colors"
                                    )}
                                    autoFocus
                                    value={categorySearchTerm}
                                    onChange={(e) => setCategorySearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && categorySearchTerm.trim()) {
                                        e.preventDefault()
                                        const exists = categories.find(c => c.name.toLowerCase() === categorySearchTerm.trim().toLowerCase())
                                        if (exists) {
                                          if (!categoryIds.includes(exists.id)) setCategoryIds([...categoryIds, exists.id])
                                          setCategorySearchTerm('')
                                        } else {
                                          handleCreateCategory(categorySearchTerm)
                                        }
                                      }
                                    }}
                                  />
                                  {categorySearchTerm && (
                                    <button 
                                      onClick={() => setCategorySearchTerm('')}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted/20 rounded-full transition-colors"
                                    >
                                      <X className="h-3 w-3 text-muted-foreground" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* 显示类别列表 */}
                              <ScrollArea className="max-h-72">
                                <div className="p-1">
                                  {categories
                                    .filter(c => !categorySearchTerm || c.name.toLowerCase().includes(categorySearchTerm.toLowerCase()))
                                    .map((c) => (
                                      <div 
                                        key={c.id}
                                        onClick={() => {
                                          const next = categoryIds.includes(c.id)
                                            ? categoryIds.filter(id => id !== c.id)
                                            : [...categoryIds, c.id]
                                          setCategoryIds(next)
                                        }}
                                        className="flex items-center gap-3 py-2.5 px-3 cursor-pointer hover:bg-muted/20 rounded-md transition-colors"
                                      >
                                        <div className={cn(
                                          "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                                          categoryIds.includes(c.id)
                                            ? "bg-success border-success"
                                            : "border-border/20 bg-transparent"
                                        )}>
                                          {categoryIds.includes(c.id) && <CheckCircle2 className="h-3 w-3 text-white" />}
                                        </div>
                                        <Folder className="h-4 w-4 text-primary/60" />
                                        <span className="flex-1 text-left text-sm">{c.name}</span>
                                      </div>
                                    ))}
                                
                                  {categorySearchTerm.trim() && !categories.some(c => c.name.toLowerCase() === categorySearchTerm.toLowerCase()) && (
                                    <div
                                      className="flex items-center gap-3 py-2.5 px-3 cursor-pointer hover:bg-primary/10 text-primary transition-colors border-t border-border/5 mt-1 rounded-md"
                                      onClick={() => {
                                        handleCreateCategory(categorySearchTerm)
                                      }}
                                    >
                                      {createCategoryMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Plus className="h-4 w-4" />
                                      )}
                                      <span className="flex-1 text-left text-sm font-medium">
                                        创建并选择 &quot;{categorySearchTerm}&quot;
                                      </span>
                                    </div>
                                  )}

                                  {categorySearchTerm && categories.filter(c => !c.name.toLowerCase().includes(categorySearchTerm.toLowerCase())).length === categories.length && !createCategoryMutation.isPending && (
                                    <div className="py-8 text-center">
                                      <p className="text-xs text-muted-foreground">未找到匹配分类</p>
                                    </div>
                                  )}
                                </div>
                              </ScrollArea>
                            </PopoverContent>
                          )}
                        </Popover>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground/70">详细图文描述(可以为空，小程序暂时不会使用)</Label>
                      <div className="border border-border/30 overflow-hidden bg-muted/10 rounded-xl hover:bg-muted/15 transition-colors">
                        <RichTextEditor value={description} onChange={setDescription} readOnly={viewing} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground/70">搜索标签</Label>
                      <div className="flex flex-wrap gap-2 p-3 bg-muted/10 border-border/30 rounded-xl hover:bg-muted/15 transition-colors">
                        {tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="pl-2 pr-1 h-8 flex items-center gap-1 bg-muted/20 hover:bg-muted/30 border-none text-foreground/80">
                            {tag}
                            {!viewing && (
                              <X className="h-3 w-3 cursor-pointer opacity-40 hover:opacity-100" onClick={() => setTags(prev => prev.filter(t => t !== tag))} />
                            )}
                          </Badge>
                        ))}
                        {!viewing && (
                          <Input
                            placeholder="+ 添加标签"
                            className={cn(
                              "h-8 w-28 text-xs bg-transparent border-dashed border-border/20",
                              "focus:border-primary/50 focus:ring-0 transition-all"
                            )}
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                const val = e.currentTarget.value.trim()
                                if (val && !tags.includes(val)) setTags([...tags, val])
                                e.currentTarget.value = ''
                              }
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* 服务保障标签 */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground/70">
                        服务保障
                        <span className="text-xs text-muted-foreground ml-2 font-normal">（至少选择2项，最多4项）</span>
                      </Label>
                      <div className="flex flex-wrap gap-2 p-3 bg-muted/10 border-border/30 rounded-xl">
                        {['正品保障', '7天无理由', '极速退款', '假一赔四'].map((option) => {
                          const isSelected = serviceGuarantees.includes(option)
                          return (
                            <button
                              key={option}
                              type="button"
                              disabled={viewing}
                              className={cn(
                                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all',
                                isSelected
                                  ? 'bg-primary/15 text-primary border border-primary/30'
                                  : 'bg-muted/20 text-muted-foreground border border-border/20 hover:border-border/40',
                                viewing && 'cursor-default'
                              )}
                              onClick={() => {
                                if (isSelected) {
                                  // 至少保留2个
                                  if (serviceGuarantees.length > 2) {
                                    setServiceGuarantees(prev => prev.filter(g => g !== option))
                                  }
                                } else {
                                  // 最多4个
                                  if (serviceGuarantees.length < 4) {
                                    setServiceGuarantees(prev => [...prev, option])
                                  }
                                }
                              }}
                            >
                              {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                              {option}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between border-b">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                       <Layers className="h-5 w-5 text-primary" /> 规格管理 (没有启用)
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <Layout className="h-3.5 w-3.5 mr-1" /> 规格生成器
                      </Button>
                      <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90">
                        <Plus className="h-3.5 w-3.5 mr-1" /> 添加单规格
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <AdminTabs defaultValue="grid" className="w-full">
                      <AdminTabsList className="mb-6">
                        <AdminTabsTrigger value="grid" className="text-xs px-4">规格列表</AdminTabsTrigger>
                        <AdminTabsTrigger value="matrix" className="text-xs px-4">规格矩阵</AdminTabsTrigger>
                        <AdminTabsTrigger value="legacy" className="text-xs px-4">传统视图</AdminTabsTrigger>
                      </AdminTabsList>
                      <AdminTabsContent value="grid" className="space-y-4">
                        <div className="border border-border/30 bg-muted/10 p-8 text-center rounded-xl">
                          <Layers className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
                          <h3 className="text-sm font-medium text-foreground/60">暂无多规格配置</h3>
                          <p className="text-xs text-muted-foreground mt-1">该商品目前为单规格商品，您可以在右侧设置价格与库存。</p>
                        </div>
                      </AdminTabsContent>
                    </AdminTabs>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Sidebar */}
              <div className="lg:col-span-4 space-y-8">
                
                {/* Status & Metadata */}
                <Card className="overflow-hidden">
                  <CardHeader className="border-b">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                       <Sparkles className="h-4 w-4 text-primary" /> 商品元数据
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between bg-muted/10 border-border/30 p-4 rounded-xl">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-medium">精选推荐</Label>
                        <p className="text-[10px] text-muted-foreground">在首页热门板块展示</p>
                      </div>
                      <Switch checked={isFeatured} onCheckedChange={setIsFeatured} disabled={viewing} />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">当前状态</span>
                        <Badge variant={productStatus === 'published' ? 'success' : 'secondary'}>
                          {productStatus === 'published' ? '已发布' : '草稿'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing & Inventory */}
                <Card className="overflow-hidden">
                  <CardHeader className="border-b">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                       <DollarSign className="h-4 w-4 text-primary" /> 库存与定价
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/10 p-4 border border-border/30 rounded-xl">
                        <p className="text-[10px] text-muted-foreground mb-1">总库存</p>
                        <p className="text-2xl font-bold font-mono">{stockQuantity ?? '∞'}</p>
                      </div>
                      <div className="bg-muted/10 p-4 border border-border/30 rounded-xl">
                        <p className="text-[10px] text-muted-foreground mb-1">价格区间</p>
                        <p className="text-xl font-bold font-mono text-primary">¥{priceAmount || '0'}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-foreground/70">
                            销售价格 (CNY)
                            <span className="text-destructive ml-1">*</span>
                          </Label>
                          {isZeroPrice && (
                            <span className="text-[10px] text-warning flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              价格为零
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">¥</span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            required
                            className={cn(
                              "pl-8 h-11 bg-muted/10 border-border/30 text-lg font-mono font-bold text-primary",
                              "hover:bg-muted/15 hover:border-border/40",
                              "focus:bg-transparent focus:border-transparent focus:ring-2 focus:ring-primary/20",
                              "transition-all duration-200",
                              errors.priceAmount && "focus:ring-destructive/50",
                              isZeroPrice && "border-warning/50 focus:ring-warning/20"
                            )}
                            value={priceAmount}
                            onChange={(e) => handlePriceChange(e.target.value)}
                            disabled={viewing}
                          />
                          {isAiPricingSuggestionEnabled && !viewing && (
                            <button
                              onClick={() => handleAiFieldGenerate('price')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-primary transition-colors"
                              title="AI 价格建议"
                            >
                              <Sparkles className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          请输入商品的销售价格，支持最多两位小数
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-foreground/70">划线原价</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                          <Input
                            placeholder="可选"
                            className={cn(
                              "pl-8 h-11 text-muted-foreground line-through font-mono bg-muted/10 border-border/30",
                              "hover:bg-muted/15 hover:border-border/40",
                              "focus:bg-transparent focus:border-transparent focus:ring-2 focus:ring-primary/20",
                              "focus:text-foreground transition-all duration-200"
                            )}
                            value={originalPriceAmount}
                            onChange={(e) => setOriginalPriceAmount(e.target.value)}
                            disabled={viewing}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-foreground/70">库存数量</Label>
                        <Input
                          type="number"
                          placeholder="留空表示无限制"
                          className={cn(
                            "h-11 font-mono bg-muted/10 border-border/30",
                            "hover:bg-muted/15 hover:border-border/40",
                            "focus:bg-transparent focus:border-transparent focus:ring-2 focus:ring-primary/20",
                            "transition-all duration-200"
                          )}
                          value={stockQuantity === null ? '' : stockQuantity}
                          onChange={(e) => setStockQuantity(e.target.value === '' ? null : Number(e.target.value))}
                          disabled={viewing}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Media Assets */}
                <Card className="overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between border-b">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                       <ImageIcon className="h-4 w-4 text-primary" /> 媒体资产
                    </CardTitle>
                    {!viewing && (
                      <Button variant="ghost" size="sm" onClick={() => setIsGalleryPickerOpen(true)} className="h-7 text-[10px]">
                        管理图集
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Label className="text-xs font-medium text-muted-foreground">商品封面</Label>
                      <div
                        className={cn(
                          "relative group aspect-video border-2 border-dashed border-border/30 bg-muted/10",
                          "hover:border-primary/50 hover:bg-muted/15",
                          "flex items-center justify-center overflow-hidden transition-all rounded-xl",
                          !viewing && "cursor-pointer"
                        )}
                        onClick={() => !viewing && setIsCoverPickerOpen(true)}
                      >
                        {coverAssetId && coverUrl ? (
                          <div className="w-full h-full relative">
                            <Image src={coverUrl} alt="Cover Preview" fill className="object-cover" unoptimized />
                            {!viewing && (
                              <div className="absolute inset-0 flex items-center justify-center bg-card/60 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="secondary" size="sm" className="h-8" onClick={(e) => { e.stopPropagation(); setCoverAssetId(''); setCoverUrl(''); }}>更换封面</Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center space-y-2 opacity-40">
                            <Plus className="h-8 w-8 mx-auto" />
                            <p className="text-[10px]">点击上传封面</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-medium text-muted-foreground">
                        轮播图集 ({(productData?.mediaAssetIds?.filter((_, idx) => !deletedApiMediaIndices.has(idx)).length || 0) + newMediaAssetIds.length})
                      </Label>
                      <div className="grid grid-cols-4 gap-2">
                        {/* 合并 API 返回的 URLs 和新添加的 URLs */}
                        {(() => {
                          const apiUrls = productData?.mediaUrls || []
                          // 过滤掉已删除的 API 图片
                          const filteredApiUrls = apiUrls.filter((_, idx) => !deletedApiMediaIndices.has(idx))
                          const displayUrls = [...filteredApiUrls, ...newMediaUrlList]

                          return displayUrls.map((url, index) => {
                            const isApiItem = index < filteredApiUrls.length

                            return (
                              <div
                                key={isApiItem ? `api-${index}` : `new-${index}`}
                                className={cn(
                                  "aspect-square rounded-xl bg-muted/10 border border-border/30",
                                  "hover:border-primary/50 hover:bg-muted/15",
                                  "flex items-center justify-center relative overflow-hidden group transition-all"
                                )}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                              >
                                <Image
                                  src={url}
                                  alt={`Gallery ${index + 1}`}
                                  fill
                                  unoptimized
                                  className={cn(
                                    "object-cover pointer-events-none transition-all duration-300",
                                    hoveredIndex === index && "blur-sm scale-110"
                                  )}
                                />

                                {/* hover 时显示深色遮罩 */}
                                {!viewing && hoveredIndex === index && (
                                  <div className="absolute inset-0 bg-black/40 transition-all duration-300" />
                                )}

                                {/* 删除按钮：hover 时显示，更大的红色图标 */}
                                {!viewing && hoveredIndex === index && (
                                  <button
                                    className="absolute inset-0 flex items-center justify-center cursor-pointer z-10"
                                    onClick={() => {
                                      if (isApiItem) {
                                        // API 返回的项：添加到已删除索引集合
                                        setDeletedApiMediaIndices(prev => {
                                          const next = new Set(prev)
                                          next.add(index)
                                          return next
                                        })
                                      } else {
                                        // 新添加的项：从 newMediaUrlList 和 newMediaAssetIds 删除
                                        const newIndex = index - filteredApiUrls.length
                                        setNewMediaUrlList(prev => prev.filter((_, i) => i !== newIndex))
                                        setNewMediaAssetIds(prev => prev.filter((_, i) => i !== newIndex))
                                      }
                                    }}
                                  >
                                    <div className="bg-destructive/90 rounded-full p-4 shadow-2xl shadow-destructive/50 transform transition-all duration-200 hover:scale-110 hover:bg-destructive">
                                      <Trash2 className="h-6 w-6 text-white" />
                                    </div>
                                  </button>
                                )}
                              </div>
                            )
                          })
                        })()}
                        {!viewing && mediaAssetIds.length < 7 && (
                          <div
                            className={cn(
                              "aspect-square rounded-xl border border-dashed border-border/30 bg-muted/10",
                              "hover:border-primary/50 hover:bg-muted/15",
                              "flex items-center justify-center cursor-pointer transition-all"
                            )}
                            onClick={() => setIsGalleryPickerOpen(true)}
                          >
                            <Plus className="h-4 w-4 opacity-20" />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Activity Log Placeholder */}
                <Card className="overflow-hidden">
                  <CardHeader className="border-b">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                       <History className="h-4 w-4 text-primary" /> 操作日志 (未启用)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { user: '系统', action: '状态变更为草稿', time: '5小时前' },
                        { user: '管理员', action: '更新了商品名称', time: '2天前' },
                      ].map((log, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted/10 border border-border/30 flex items-center justify-center shrink-0">
                            <History className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium">{log.action}</p>
                            <p className="text-[10px] text-muted-foreground">{log.user} • {log.time}</p>
                          </div>
                        </div>
                      ))}
                      <Button variant="link" className="text-[10px] p-0 h-auto text-primary">查看完整历史 →</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* 底部操作栏 */}
        <div className="px-8 py-6 border-t flex flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
             {editing && !viewing && (
               <Button variant="destructive" className="gap-2 h-12 px-6" onClick={onDelete} disabled={isSubmitting}>
                 <Trash2 className="h-4 w-4" /> 删除商品
               </Button>
             )}
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onCancel} disabled={isSubmitting} className="h-12 px-8 font-medium">
              {viewing ? '关闭' : '取消'}
            </Button>
            {!viewing && (
              <Button
                onClick={() => onSubmit()}
                disabled={isSubmitting || loading}
                className="h-12 px-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl shadow-primary/40 gap-2 font-bold transition-all active:scale-95"
              >
                {isSubmitting ? '正在保存...' : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    {editing ? '保存更改' : '立即发布'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      <MaterialPicker
        open={isCoverPickerOpen}
        onOpenChange={setIsCoverPickerOpen}
        onSelect={(assets) => {
          if (assets[0]) {
            setCoverAssetId(assets[0].id)
            setCoverUrl(getMediaAssetDisplayUrl(assets[0]))
          }
        }}
      />
      <MaterialPicker
        open={isGalleryPickerOpen}
        onOpenChange={setIsGalleryPickerOpen}
        multiple={true}
        typeFilter={['image']}
        onSelect={(assets) => {
          const newIds = assets.map(a => a.id)
          const newUrls = assets.map(a => getMediaAssetDisplayUrl(a))
          // 新添加的图片只保存到 newMediaAssetIds，保存时会合并到最终列表
          setNewMediaAssetIds(prev => [...prev, ...newIds])
          setNewMediaUrlList(prev => [...prev, ...newUrls])
        }}
      />

      {/* AI 预览对话框 */}
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
              <div>
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
                      <img 
                        src={aiFieldPreview.value as string} 
                        alt="AI 生成预览" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-primary">
                      {aiFieldPreview.value}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setAiFieldPreviewOpen(false)}
              >
                取消
              </Button>
              <Button onClick={adoptAiPreview}>
                采纳
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 零价格确认对话框 */}
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
                onClick={cancelZeroPrice}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                重新设置
              </Button>
              <Button
                onClick={confirmZeroPrice}
                className="gap-2 bg-warning hover:bg-warning/90"
              >
                <CheckCircle2 className="h-4 w-4" />
                确认价格
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
