'use client'

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/toast'
import { Loader2, Sparkles, Link, Type } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * 跳转类型选项
 */
const LINK_TYPE_OPTIONS = [
  { value: 'none', label: '不跳转' },
  { value: 'product', label: '商品详情' },
  { value: 'ad', label: '广告页面' },
  { value: 'custom', label: '自定义链接' },
] as const

/** 默认配置 */
const DEFAULT_CONFIG = {
  enabled: true,
  title: '年度会员 · 全站畅学',
  subtitle: '128 门精品课程无限次学习',
  linkType: 'none' as const,
  linkUrl: null as string | null,
  productId: null as string | null,
}

interface ShopBannerConfig {
  enabled: boolean
  title: string
  subtitle: string
  linkType: 'product' | 'ad' | 'custom' | 'none'
  linkUrl: string | null
  productId: string | null
}

/**
 * Component: FormField
 *
 * Description: 表单字段包装组件，提供统一的样式和动画
 */
interface FormFieldProps {
  label: string
  description?: string
  required?: boolean
  error?: string
  children: React.ReactNode
}

function FormField({ label, description, required, error, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label className={cn(
        'text-sm font-semibold text-foreground/70 transition-colors',
        error && 'text-destructive'
      )}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {children}
      {error && (
        <p className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Component: ConfigCard
 *
 * Description: 配置卡片组件，提供统一的卡片样式
 */
interface ConfigCardProps {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  delay?: number
}

function ConfigCard({ icon, title, children, delay = 0 }: ConfigCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border/20 shadow-sm overflow-hidden">
      {/* 卡片头部 */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border/10 bg-muted/20">
        <div className="text-primary">{icon}</div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>

      {/* 卡片内容 */}
      <div className="p-6 space-y-6">
        {children}
      </div>
    </div>
  )
}

/**
 * Component: MiniprogramShopConfigForm
 *
 * Description: 商城 VIP Banner 配置表单组件
 * 支持编辑 Banner 标题、副标题、跳转链接等设置
 */
export function MiniprogramShopConfigForm() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // 表单状态
  const [enabled, setEnabled] = React.useState(DEFAULT_CONFIG.enabled)
  const [title, setTitle] = React.useState(DEFAULT_CONFIG.title)
  const [subtitle, setSubtitle] = React.useState(DEFAULT_CONFIG.subtitle)
  const [linkType, setLinkType] = React.useState<ShopBannerConfig['linkType']>(DEFAULT_CONFIG.linkType)
  const [linkUrl, setLinkUrl] = React.useState<string>(DEFAULT_CONFIG.linkUrl ?? '')
  const [productId, setProductId] = React.useState<string>(DEFAULT_CONFIG.productId ?? '')
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // 获取当前配置
  const { data: config, isLoading } = useQuery({
    queryKey: ['miniprogram-shop-config'],
    queryFn: async (): Promise<ShopBannerConfig> => {
      const res = await fetch('/api/v1/admin/miniprogram/shop-config', {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('加载配置失败')
      const json = await res.json()
      return json.data
    },
  })

  // 初始化表单数据
  React.useEffect(() => {
    if (config) {
      setEnabled(config.enabled)
      setTitle(config.title)
      setSubtitle(config.subtitle)
      setLinkType(config.linkType)
      setLinkUrl(config.linkUrl ?? '')
      setProductId(config.productId ?? '')
    }
  }, [config])

  // 保存 Mutation
  const saveMutation = useMutation({
    mutationFn: async (data: ShopBannerConfig): Promise<ShopBannerConfig> => {
      const res = await fetch('/api/v1/admin/miniprogram/shop-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const fallbackMessage = `保存失败: ${res.status}`
        try {
          const json = await res.json()
          const message = (json as { error?: { message?: string } }).error?.message
          throw new Error(message || fallbackMessage)
        } catch {
          throw new Error(fallbackMessage)
        }
      }

      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error.message || '保存失败')
      }

      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miniprogram-shop-config'] })
      toast({
        title: '保存成功',
        description: '商城设置已更新',
        variant: 'default',
      })
    },
    onError: (error: Error) => {
      toast({
        title: '保存失败',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleSave = () => {
    // 验证表单
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = '标题不能为空'
    if (!subtitle.trim()) newErrors.subtitle = '副标题不能为空'
    if (linkType === 'custom' && !linkUrl.trim()) newErrors.linkUrl = '自定义链接不能为空'
    if (linkType === 'product' && !productId.trim()) newErrors.productId = '商品 ID 不能为空'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast({
        title: '校验失败',
        description: '请检查表单中标记为红色的字段',
        variant: 'destructive',
      })
      return
    }

    const payload: ShopBannerConfig = {
      enabled,
      title: title.trim(),
      subtitle: subtitle.trim(),
      linkType,
      linkUrl: linkType === 'custom' ? linkUrl.trim() : null,
      productId: linkType === 'product' ? productId.trim() : null,
    }

    saveMutation.mutate(payload)
  }

  const isSubmitting = saveMutation.isPending

  // 加载骨架屏
  if (isLoading) {
    return (
      <ScrollArea className="flex-1 min-h-0 bg-transparent">
        <div className="p-6 space-y-6">
          <div className="bg-card rounded-xl border border-border/20 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border/10">
              <div className="h-5 w-5 bg-muted/30 rounded animate-pulse" />
              <div className="h-5 w-24 bg-muted/30 rounded animate-pulse" />
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="h-4 w-20 bg-muted/20 rounded animate-pulse" />
                <div className="h-12 w-full bg-muted/10 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    )
  }

  return (
    <ScrollArea className="flex-1 min-h-0 bg-transparent">
      <div className="p-0">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Banner 内容设置 */}
          <ConfigCard
            icon={<Type className="h-5 w-5" />}
            title="Banner 内容"
            delay={0.1}
          >
            {/* 启用开关 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">启用 VIP Banner</Label>
                <p className="text-xs text-muted-foreground">控制商城页面 VIP Banner 的显示与隐藏</p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                disabled={isSubmitting}
              />
            </div>

            {/* 主标题 */}
            <FormField
              label="主标题"
              required
              error={errors.title}
            >
              <Input
                placeholder="例如：年度会员 · 全站畅学"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (errors.title) setErrors(prev => ({ ...prev, title: '' }))
                }}
                disabled={isSubmitting}
                className={cn(
                  'h-12 bg-muted/5 border-border/10',
                  'focus:border-primary/50 focus:ring-2 focus:ring-primary/10',
                  'transition-all duration-200',
                  errors.title && 'border-destructive focus:border-destructive focus:ring-destructive/10'
                )}
              />
            </FormField>

            {/* 副标题 */}
            <FormField
              label="副标题"
              required
              error={errors.subtitle}
            >
              <Input
                placeholder="例如：128 门精品课程无限次学习"
                value={subtitle}
                onChange={(e) => {
                  setSubtitle(e.target.value)
                  if (errors.subtitle) setErrors(prev => ({ ...prev, subtitle: '' }))
                }}
                disabled={isSubmitting}
                className={cn(
                  'h-12 bg-muted/5 border-border/10',
                  'focus:border-primary/50 focus:ring-2 focus:ring-primary/10',
                  'transition-all duration-200',
                  errors.subtitle && 'border-destructive focus:border-destructive focus:ring-destructive/10'
                )}
              />
            </FormField>
          </ConfigCard>

          {/* 跳转设置 */}
          <ConfigCard
            icon={<Link className="h-5 w-5" />}
            title="点击跳转"
            delay={0.2}
          >
            {/* 跳转类型 */}
            <FormField
              label="跳转类型"
              description="选择用户点击 Banner 后的跳转行为"
            >
              <Select
                value={linkType}
                onValueChange={(val) => {
                  setLinkType(val as ShopBannerConfig['linkType'])
                  setErrors({})
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger className="h-12 bg-muted/5 border-border/10">
                  <SelectValue placeholder="选择跳转类型" />
                </SelectTrigger>
                <SelectContent>
                  {LINK_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {/* 商品 ID（仅当 linkType 为 product 时显示） */}
            {linkType === 'product' && (
              <div>
                <FormField
                  label="商品 ID"
                  required
                  error={errors.productId}
                  description="输入要跳转到的商品 ID"
                >
                  <Input
                    placeholder="输入商品 ID..."
                    value={productId}
                    onChange={(e) => {
                      setProductId(e.target.value)
                      if (errors.productId) setErrors(prev => ({ ...prev, productId: '' }))
                    }}
                    disabled={isSubmitting}
                    className={cn(
                      'h-12 bg-muted/5 border-border/10',
                      'focus:border-primary/50 focus:ring-2 focus:ring-primary/10',
                      'transition-all duration-200',
                      errors.productId && 'border-destructive focus:border-destructive focus:ring-destructive/10'
                    )}
                  />
                </FormField>
              </div>
            )}

            {/* 自定义链接（仅当 linkType 为 custom 时显示） */}
            {linkType === 'custom' && (
              <div>
                <FormField
                  label="自定义链接"
                  required
                  error={errors.linkUrl}
                  description="输入完整的跳转链接地址，如小程序页面路径或外部 URL"
                >
                  <Input
                    placeholder="例如：/pages/product/detail?id=xxx 或 https://..."
                    value={linkUrl}
                    onChange={(e) => {
                      setLinkUrl(e.target.value)
                      if (errors.linkUrl) setErrors(prev => ({ ...prev, linkUrl: '' }))
                    }}
                    disabled={isSubmitting}
                    className={cn(
                      'h-12 bg-muted/5 border-border/10',
                      'focus:border-primary/50 focus:ring-2 focus:ring-primary/10',
                      'transition-all duration-200',
                      errors.linkUrl && 'border-destructive focus:border-destructive focus:ring-destructive/10'
                    )}
                  />
                </FormField>
              </div>
            )}
          </ConfigCard>

          {/* 操作按钮区域 */}
          <div className="flex flex-col items-center gap-4 pt-4">
            <div>
              <Button
                onClick={handleSave}
                disabled={isSubmitting}
                size="lg"
                className={cn(
                  'gap-2 px-8 shadow-lg shadow-primary/20',
                  'hover:shadow-xl hover:shadow-primary/30',
                  'transition-all duration-200'
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    保存配置
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
