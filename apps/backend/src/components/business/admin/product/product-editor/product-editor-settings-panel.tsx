'use client'

import * as React from 'react'
import {
  CheckCircle2,
  ChevronDown,
  DollarSign,
  Folder,
  Image as ImageIcon,
  Loader2,
  Plus,
  Sparkles,
  X,
} from 'lucide-react'

import { MaterialPicker } from '@/components/business/admin/media/material-picker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

import type { ProductFormState } from './types'

// ==================== 属性接口 ====================

/**
 * 商品编辑器右侧设置面板属性
 */
interface ProductEditorSettingsPanelProps {
  /** 当前表单状态 */
  form: ProductFormState
  /** 表单变更回调 */
  onFormChange: (updates: Partial<ProductFormState>) => void
  /** 分类列表 */
  categories: Array<{ id: string; name: string }>
  /** 分类列表是否加载中 */
  categoriesLoading: boolean
  /** 是否为查看模式 */
  viewing?: boolean
  /** AI 单字段生成回调 */
  onAiFieldGenerate?: (field: string) => void
  /** AI 文本生成功能是否启用 */
  isAiTextEnabled?: boolean
  /** AI 价格建议功能是否启用 */
  isAiPricingEnabled?: boolean
  /** 媒体资源 URL 列表（从 API 加载，编辑模式） */
  apiMediaUrls?: string[]
  /** 获取媒体资源显示 URL 的工具函数 */
  getMediaAssetDisplayUrl?: (asset: {
    provider: string
    bucket: string
    objectKey: string
    url: string | null
  }) => string
}

// ==================== 组件 ====================

/**
 * Function: ProductEditorSettingsPanel
 *
 * Description: 商品编辑器右侧设置面板。
 *              参考文章编辑器 (EditorSettingsPanel) 的风格，采用固定宽度侧边栏 + 可滚动内容区。
 *              包含封面图、商品类型、类目、定价、库存、标签、服务保障、精选推荐、轮播图集、状态等设置项。
 *
 * Parameters:
 *     form(ProductFormState): 当前表单状态
 *     onFormChange(function): 表单字段变更回调
 *     categories(array): 分类列表
 *     ...其他配置属性
 *
 * Returns:
 *     element(React.ReactElement): 设置面板 UI
 */
export function ProductEditorSettingsPanel({
  form,
  onFormChange,
  categories,
  categoriesLoading = false,
  viewing = false,
  onAiFieldGenerate,
  isAiTextEnabled = false,
  isAiPricingEnabled = false,
  apiMediaUrls = [],
  getMediaAssetDisplayUrl,
}: ProductEditorSettingsPanelProps) {
  // 素材选择器弹窗状态
  const [isCoverPickerOpen, setIsCoverPickerOpen] = React.useState(false)
  const [isGalleryPickerOpen, setIsGalleryPickerOpen] = React.useState(false)

  // 分类选择器搜索词
  const [categorySearchTerm, setCategorySearchTerm] = React.useState('')

  // 轮播图 hover 状态
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null)

  // 定价区折叠状态
  const [isPricingExpanded, setIsPricingExpanded] = React.useState(true)
  // 媒体区折叠状态
  const [isMediaExpanded, setIsMediaExpanded] = React.useState(true)

  // 零价格标记
  const isZeroPrice = React.useMemo(() => {
    if (!form.priceAmount || form.priceAmount.trim() === '') return false
    return parseFloat(form.priceAmount) === 0
  }, [form.priceAmount])

  // 合并显示的轮播图 URL 列表
  const displayUrls = React.useMemo(() => {
    const filteredApiUrls = apiMediaUrls.filter(
      (_, idx) => !form.deletedApiMediaIndices.has(idx),
    )
    return [...filteredApiUrls, ...form.newMediaUrlList]
  }, [apiMediaUrls, form.deletedApiMediaIndices, form.newMediaUrlList])

  // ==================== 价格输入处理 ====================

  /** 处理价格输入变更，限制格式（数字+小数点，最多2位小数） */
  const handlePriceChange = React.useCallback(
    (value: string) => {
      let processed = value.replace(/[^\d.]/g, '')
      const firstDotIndex = processed.indexOf('.')
      if (firstDotIndex !== -1) {
        processed =
          processed.substring(0, firstDotIndex + 1) +
          processed.substring(firstDotIndex + 1).replace(/\./g, '')
      }
      const parts = processed.split('.')
      if (parts.length === 2 && parts[1].length > 2) {
        parts[1] = parts[1].substring(0, 2)
        processed = parts.join('.')
      }
      if (processed.length > 1 && !processed.startsWith('0.')) {
        processed = processed.replace(/^0+/, '') || '0'
      }
      onFormChange({ priceAmount: processed })
    },
    [onFormChange],
  )

  // ==================== 封面图选择处理 ====================

  const handleCoverSelect = React.useCallback(
    (assets: Array<{ id: string; provider: string; bucket: string; objectKey: string; url: string | null }>) => {
      if (assets.length > 0) {
        const asset = assets[0]
        const url = getMediaAssetDisplayUrl
          ? getMediaAssetDisplayUrl(asset)
          : asset.url || `/api/v1/public/files/${asset.objectKey}`
        onFormChange({ coverAssetId: asset.id, coverUrl: url })
      }
      setIsCoverPickerOpen(false)
    },
    [onFormChange, getMediaAssetDisplayUrl],
  )

  // ==================== 轮播图选择处理 ====================

  const handleGallerySelect = React.useCallback(
    (assets: Array<{ id: string; provider: string; bucket: string; objectKey: string; url: string | null }>) => {
      const newIds = assets.map((a) => a.id)
      const newUrls = assets.map((a) =>
        getMediaAssetDisplayUrl
          ? getMediaAssetDisplayUrl(a)
          : a.url || `/api/v1/public/files/${a.objectKey}`,
      )
      onFormChange({
        newMediaAssetIds: [...form.newMediaAssetIds, ...newIds],
        newMediaUrlList: [...form.newMediaUrlList, ...newUrls],
      })
    },
    [form.newMediaAssetIds, form.newMediaUrlList, onFormChange, getMediaAssetDisplayUrl],
  )

  // ==================== 删除轮播图 ====================

  const handleDeleteMedia = React.useCallback(
    (index: number) => {
      const filteredApiUrls = apiMediaUrls.filter(
        (_, idx) => !form.deletedApiMediaIndices.has(idx),
      )
      const isApiItem = index < filteredApiUrls.length

      if (isApiItem) {
        // API 返回的项：添加到已删除索引集合
        const newDeleted = new Set(form.deletedApiMediaIndices)
        newDeleted.add(index)
        onFormChange({ deletedApiMediaIndices: newDeleted })
      } else {
        // 新添加的项：从新列表中删除
        const newIndex = index - filteredApiUrls.length
        onFormChange({
          newMediaUrlList: form.newMediaUrlList.filter((_, i) => i !== newIndex),
          newMediaAssetIds: form.newMediaAssetIds.filter((_, i) => i !== newIndex),
        })
      }
    },
    [apiMediaUrls, form.deletedApiMediaIndices, form.newMediaUrlList, form.newMediaAssetIds, onFormChange],
  )

  // ==================== 渲染 ====================

  return (
    <div className="w-[360px] shrink-0 border-l p-6 overflow-auto space-y-5">
      {/* ========== 封面图设置 ========== */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">封面图</Label>
        {form.coverUrl ? (
          <div className="relative aspect-video rounded-md overflow-hidden border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.coverUrl} alt="封面图" className="w-full h-full object-cover" />
            {!viewing && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={() => onFormChange({ coverAssetId: '', coverUrl: '' })}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ) : null}
        {!viewing && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setIsCoverPickerOpen(true)}
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            {form.coverUrl ? '更换封面' : '选择图片'}
          </Button>
        )}
      </div>

      <Separator />

      {/* ========== 商品类型 ========== */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">商品类型</Label>
        <Select
          value={form.kind}
          onValueChange={(value) => onFormChange({ kind: value as ProductFormState['kind'] })}
          disabled={viewing}
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

      {/* ========== 所属类目 ========== */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">所属类目</Label>
        <Popover>
          <PopoverTrigger asChild>
            <div
              className={cn(
                'flex items-center justify-between px-3 h-10 rounded-lg border cursor-pointer',
                'hover:bg-muted/5 transition-colors',
                viewing && 'cursor-default',
              )}
            >
              <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
                {form.categoryIds.length > 0 ? (
                  <>
                    {categories
                      .filter((c) => form.categoryIds.includes(c.id))
                      .slice(0, 2)
                      .map((c) => (
                        <Badge key={c.id} variant="secondary" className="h-5 px-1.5 text-[10px]">
                          {c.name}
                        </Badge>
                      ))}
                    {form.categoryIds.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{form.categoryIds.length - 2}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {categoriesLoading ? '加载中...' : '选择类目'}
                  </span>
                )}
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
            </div>
          </PopoverTrigger>
          {!viewing && (
            <PopoverContent className="min-w-[300px] p-0 overflow-hidden" align="start">
              {/* 搜索框 */}
              <div className="p-2 border-b">
                <Input
                  placeholder="搜索或新建分类..."
                  className="h-8 border-none bg-transparent focus-visible:ring-0 text-sm"
                  autoFocus
                  value={categorySearchTerm}
                  onChange={(e) => setCategorySearchTerm(e.target.value)}
                />
              </div>
              {/* 分类列表 */}
              <ScrollArea className="max-h-60">
                <div className="p-1">
                  {categories
                    .filter(
                      (c) =>
                        !categorySearchTerm ||
                        c.name.toLowerCase().includes(categorySearchTerm.toLowerCase()),
                    )
                    .map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          const next = form.categoryIds.includes(c.id)
                            ? form.categoryIds.filter((id) => id !== c.id)
                            : [...form.categoryIds, c.id]
                          onFormChange({ categoryIds: next })
                        }}
                        className="flex items-center gap-3 py-2 px-3 cursor-pointer hover:bg-muted/10 rounded-md transition-colors"
                      >
                        <div
                          className={cn(
                            'h-4 w-4 rounded border flex items-center justify-center transition-colors',
                            form.categoryIds.includes(c.id)
                              ? 'bg-primary border-primary'
                              : 'border-border/30',
                          )}
                        >
                          {form.categoryIds.includes(c.id) && (
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <Folder className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-left text-sm">{c.name}</span>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          )}
        </Popover>
      </div>

      <Separator />

      {/* ========== 定价与库存（可折叠） ========== */}
      <div>
        <button
          type="button"
          className="flex w-full items-center justify-between py-2 text-sm font-medium"
          onClick={() => setIsPricingExpanded(!isPricingExpanded)}
        >
          <span className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            定价与库存
          </span>
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', isPricingExpanded && 'rotate-180')}
          />
        </button>

        {isPricingExpanded && (
          <div className="space-y-3 pb-2">
            {/* 销售价格 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  销售价格 (CNY) <span className="text-destructive">*</span>
                </Label>
                {isZeroPrice && (
                  <span className="text-[10px] text-warning">价格为零</span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                  ¥
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.priceAmount}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  disabled={viewing}
                  className={cn(
                    'pl-8 h-10 font-mono font-bold',
                    isZeroPrice && 'border-warning/50',
                  )}
                />
                {isAiPricingEnabled && !viewing && onAiFieldGenerate && (
                  <button
                    onClick={() => onAiFieldGenerate('price')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-primary transition-colors"
                    title="AI 价格建议"
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 划线原价 */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">划线原价</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ¥
                </span>
                <Input
                  placeholder="可选"
                  value={form.originalPriceAmount}
                  onChange={(e) => onFormChange({ originalPriceAmount: e.target.value })}
                  disabled={viewing}
                  className="pl-8 h-10 font-mono text-muted-foreground line-through"
                />
              </div>
            </div>

            {/* 库存数量 */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">库存数量</Label>
              <Input
                type="number"
                placeholder="留空表示无限制"
                value={form.stockQuantity === null ? '' : form.stockQuantity}
                onChange={(e) =>
                  onFormChange({
                    stockQuantity: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                disabled={viewing}
                className="h-10 font-mono"
              />
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* ========== 搜索标签 ========== */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">搜索标签</Label>
        {/* 已选标签 */}
        {form.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {form.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                {!viewing && (
                  <button
                    type="button"
                    onClick={() =>
                      onFormChange({ tags: form.tags.filter((t) => t !== tag) })
                    }
                    className="rounded-full hover:bg-foreground/20 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}
        {/* 添加标签输入 */}
        {!viewing && (
          <Input
            placeholder="输入标签名称，回车添加"
            className="h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const val = e.currentTarget.value.trim()
                if (val && !form.tags.includes(val)) {
                  onFormChange({ tags: [...form.tags, val] })
                }
                e.currentTarget.value = ''
              }
            }}
          />
        )}
      </div>

      {/* ========== 服务保障 ========== */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          服务保障
          <span className="text-xs text-muted-foreground ml-2 font-normal">
            (至少2项，最多4项)
          </span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {['正品保障', '7天无理由', '极速退款', '假一赔四'].map((option) => {
            const isSelected = form.serviceGuarantees.includes(option)
            return (
              <button
                key={option}
                type="button"
                disabled={viewing}
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all',
                  isSelected
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-muted/5 text-muted-foreground border border-border/20 hover:border-border/40',
                  viewing && 'cursor-default',
                )}
                onClick={() => {
                  if (isSelected && form.serviceGuarantees.length > 2) {
                    onFormChange({
                      serviceGuarantees: form.serviceGuarantees.filter((g) => g !== option),
                    })
                  } else if (!isSelected && form.serviceGuarantees.length < 4) {
                    onFormChange({
                      serviceGuarantees: [...form.serviceGuarantees, option],
                    })
                  }
                }}
              >
                {isSelected && <CheckCircle2 className="h-3 w-3" />}
                {option}
              </button>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* ========== 精选推荐 ========== */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">精选推荐</Label>
          <p className="text-[10px] text-muted-foreground">在首页热门板块展示</p>
        </div>
        <Switch
          checked={form.isFeatured}
          onCheckedChange={(checked) => onFormChange({ isFeatured: checked })}
          disabled={viewing}
        />
      </div>

      {/* ========== 商品状态 ========== */}
      {form.productStatus && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">当前状态</span>
          <Badge
            variant={form.productStatus === 'published' ? 'success' : 'secondary'}
          >
            {form.productStatus === 'published' ? '已上架' : '草稿'}
          </Badge>
        </div>
      )}

      <Separator />

      {/* ========== 轮播图集（可折叠） ========== */}
      <div>
        <button
          type="button"
          className="flex w-full items-center justify-between py-2 text-sm font-medium"
          onClick={() => setIsMediaExpanded(!isMediaExpanded)}
        >
          <span className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            轮播图集 ({displayUrls.length})
          </span>
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', isMediaExpanded && 'rotate-180')}
          />
        </button>

        {isMediaExpanded && (
          <div className="space-y-2 pb-2">
            <div className="grid grid-cols-3 gap-2">
              {/* 已有图片 */}
              {displayUrls.map((url, index) => (
                <div
                  key={`media-${index}`}
                  className="aspect-square rounded-lg border bg-muted/5 overflow-hidden relative group"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`图 ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Hover 遮罩 + 删除按钮 */}
                  {!viewing && hoveredIndex === index && (
                    <>
                      <div className="absolute inset-0 bg-black/30 transition-all" />
                      <button
                        className="absolute inset-0 flex items-center justify-center cursor-pointer z-10"
                        onClick={() => handleDeleteMedia(index)}
                      >
                        <div className="bg-destructive/90 rounded-full p-2">
                          <X className="h-4 w-4 text-white" />
                        </div>
                      </button>
                    </>
                  )}
                </div>
              ))}
              {/* 添加按钮 */}
              {!viewing && displayUrls.length < 8 && (
                <div
                  className="aspect-square rounded-lg border border-dashed border-border/30 bg-muted/5 flex items-center justify-center cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => setIsGalleryPickerOpen(true)}
                >
                  <Plus className="h-4 w-4 text-muted-foreground/40" />
                </div>
              )}
            </div>
            {!viewing && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setIsGalleryPickerOpen(true)}
              >
                管理图集
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ========== 素材选择器弹窗 ========== */}
      <MaterialPicker
        open={isCoverPickerOpen}
        onOpenChange={setIsCoverPickerOpen}
        onSelect={handleCoverSelect}
        multiple={false}
        typeFilter={['image']}
      />

      <MaterialPicker
        open={isGalleryPickerOpen}
        onOpenChange={setIsGalleryPickerOpen}
        onSelect={handleGallerySelect}
        multiple={true}
        typeFilter={['image']}
      />
    </div>
  )
}
