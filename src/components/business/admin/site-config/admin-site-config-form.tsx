'use client'

import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/toast'
import { useSiteConfigContext } from '@/components/context/site-config-context'
import { Loader2, Globe, Phone, MessageSquare, Copyright, CheckCircle2, Upload, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SiteConfig, UpdateSiteConfigRequest } from '@/contracts/dtos/admin/site-config.dto'
import { MaterialPicker } from '@/components/business/admin/media/material-picker'
import type { AdminMediaAsset } from '@/contracts/dtos/admin/media-assets.dto'

interface SiteConfigFormProps {
  onSaved?: () => void
}

function toPersistedLogoUrl(asset: AdminMediaAsset): string | null {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  switch (asset.provider) {
    case 'local':
      return `${origin}/api/v1/public/files/${asset.objectKey}`
    case 'aliyun_oss': {
      const uploadHost = process.env.NEXT_PUBLIC_ALIYUN_OSS_UPLOAD_HOST?.replace(/\/$/, '')
      if (uploadHost) return `${uploadHost}/${asset.objectKey}`
      return `https://${asset.bucket}.oss-cn-hangzhou.aliyuncs.com/${asset.objectKey}`
    }
    case 'tencent_cos': {
      const uploadHost = process.env.NEXT_PUBLIC_TENCENT_COS_UPLOAD_HOST?.replace(/\/$/, '')
      if (uploadHost) return `${uploadHost}/${asset.objectKey}`
      return `https://${asset.bucket}.cos.ap-guangzhou.myqcloud.com/${asset.objectKey}`
    }
    default:
      return asset.url
  }
}

/**
 * Component: FormField
 *
 * Description: 表单字段包装组件，提供统一的样式和动画
 */
interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}

function FormField({ label, required, error, children }: FormFieldProps) {
  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Label className={cn(
        'text-sm font-semibold text-foreground/70 transition-colors',
        error && 'text-destructive'
      )}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="text-xs text-destructive"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-card rounded-xl border border-border/20 shadow-sm overflow-hidden"
    >
      {/* 卡片头部 */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border/10 bg-muted/20">
        <div className="text-primary">{icon}</div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>

      {/* 卡片内容 */}
      <div className="p-6 space-y-6">
        {children}
      </div>
    </motion.div>
  )
}

/**
 * Component: ConfigCardSkeleton
 *
 * Description: 配置卡片骨架屏，用于加载状态
 */
function ConfigCardSkeleton() {
  return (
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
  )
}

/**
 * Function: AdminSiteConfigForm
 *
 * Description: 站点配置表单组件，负责编辑站点基础信息
 *
 * Parameters:
 *     props(SiteConfigFormProps): 组件属性
 *
 * Returns:
 *     component(JSX.Element): 表单组件
 */
export function AdminSiteConfigForm({ onSaved }: SiteConfigFormProps) {
  const { toast } = useToast()
  const { siteConfig, isLoading, setSiteConfig } = useSiteConfigContext()

  // 表单状态
  const [siteName, setSiteName] = React.useState('')
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null)
  const [contactPhone, setContactPhone] = React.useState('')
  const [contactWechat, setContactWechat] = React.useState('')
  const [icpFiling, setIcpFiling] = React.useState('')
  const [copyright, setCopyright] = React.useState('')
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})

  // 素材选择器状态
  const [isPickerOpen, setIsPickerOpen] = React.useState(false)

  // 初始化表单数据
  React.useEffect(() => {
    if (siteConfig) {
      setSiteName(siteConfig.siteName)
      setLogoUrl(siteConfig.logoUrl ?? null)
      setContactPhone(siteConfig.contactPhone ?? '')
      setContactWechat(siteConfig.contactWechat ?? '')
      setIcpFiling(siteConfig.icpFiling ?? '')
      setCopyright(siteConfig.copyright ?? '')
    }
  }, [siteConfig])

  // 实时验证
  React.useEffect(() => {
    if (touched.siteName) {
      setErrors(prev => ({
        ...prev,
        siteName: siteName.trim() ? '' : '平台名称不能为空'
      }))
    }
  }, [siteName, touched.siteName])

  // 保存 Mutation
  const saveMutation = useMutation({
    mutationFn: async (data: UpdateSiteConfigRequest): Promise<SiteConfig> => {
      const res = await fetch('/api/v1/admin/site-config', {
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
    onSuccess: async (data) => {
      // 立即更新 AdminContext 中的缓存数据
      setSiteConfig(data)

      toast({
        title: '保存成功',
        description: '站点配置已更新',
        variant: 'default',
      })
      onSaved?.()
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
    if (!siteName.trim()) {
      newErrors.siteName = '平台名称不能为空'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setTouched({
        siteName: true,
        logoUrl: true,
        contactPhone: true,
        contactWechat: true,
        icpFiling: true,
        copyright: true,
      })
      toast({
        title: '校验失败',
        description: '请检查表单中标记为红色的字段',
        variant: 'destructive',
      })
      return
    }

    const payload: UpdateSiteConfigRequest = {
      siteName: siteName.trim(),
      logoUrl,
      contactPhone: contactPhone.trim() || null,
      contactWechat: contactWechat.trim() || null,
      icpFiling: icpFiling.trim() || null,
      copyright: copyright.trim() || null,
    }

    saveMutation.mutate(payload)
  }

  // 处理素材选择
  const handleMaterialSelect = (assets: AdminMediaAsset[]) => {
    if (assets.length > 0) {
      setLogoUrl(toPersistedLogoUrl(assets[0]))
    }
  }

  const isSubmitting = saveMutation.isPending

  // 加载骨架屏
  if (isLoading) {
    return (
      <ScrollArea className="flex-1 min-h-0 bg-transparent">
        <div className="p-6 space-y-6">
          <ConfigCardSkeleton />
          <ConfigCardSkeleton />
          <ConfigCardSkeleton />
        </div>
      </ScrollArea>
    )
  }

  return (
    <>
      <ScrollArea className="flex-1 min-h-0 bg-transparent">
        <div className="p-0">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 基础信息卡片 */}
            <ConfigCard
              icon={<Globe className="h-5 w-5" />}
              title="基础信息"
              delay={0.1}
            >
              {/* 平台名称 */}
              <FormField
                label="平台名称"
                required
                error={(touched.siteName && errors.siteName) || undefined}
              >
                <Input
                  placeholder="请输入平台名称..."
                  value={siteName}
                  onChange={(e) => {
                    setSiteName(e.target.value)
                    setTouched(prev => ({ ...prev, siteName: true }))
                  }}
                  onBlur={() => setTouched(prev => ({ ...prev, siteName: true }))}
                  disabled={isSubmitting}
                  className={cn(
                    'h-12 bg-muted/5 border-border/10',
                    'focus:border-primary/50 focus:ring-2 focus:ring-primary/10',
                    'transition-all duration-200',
                    touched.siteName && errors.siteName && 'border-destructive focus:border-destructive focus:ring-destructive/10'
                  )}
                />
              </FormField>

              {/* Logo 选择 */}
              <FormField label="平台 Logo">
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPickerOpen(true)}
                    disabled={isSubmitting}
                    className={cn(
                      'w-full h-24 border-2 border-dashed',
                      'hover:border-primary/50 hover:bg-primary/5',
                      'transition-all duration-200',
                      logoUrl ? 'border-primary/30 bg-primary/5' : 'border-border/20'
                    )}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {logoUrl ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle2 className="h-6 w-6 text-primary" />
                          <span className="text-sm font-medium">更换 Logo</span>
                        </motion.div>
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">选择 Logo</span>
                        </>
                      )}
                    </div>
                  </Button>
                </motion.div>

                {/* Logo 预览 */}
                {logoUrl && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3"
                  >
                    <div className="p-3 bg-muted/5 border border-border/10 rounded-lg flex items-center justify-center group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoUrl}
                        alt="Logo 预览"
                        className="h-16 w-auto object-contain transition-transform group-hover:scale-105 duration-200"
                      />
                    </div>
                  </motion.div>
                )}
              </FormField>
            </ConfigCard>

            {/* 联系方式卡片 */}
            <ConfigCard
              icon={<Phone className="h-5 w-5" />}
              title="联系方式"
              delay={0.2}
            >
              {/* 客服电话 */}
              <FormField label="客服电话">
                <Input
                  type="tel"
                  placeholder="请输入客服电话..."
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  disabled={isSubmitting}
                  className="h-12 bg-muted/5 border-border/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                />
              </FormField>

              {/* 客服微信 */}
              <FormField label="客服微信号">
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="请输入客服微信号..."
                    value={contactWechat}
                    onChange={(e) => setContactWechat(e.target.value)}
                    disabled={isSubmitting}
                    className="h-12 pl-10 bg-muted/5 border-border/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                  />
                </div>
              </FormField>
            </ConfigCard>

            {/* 版权信息卡片 */}
            <ConfigCard
              icon={<Copyright className="h-5 w-5" />}
              title="备案与版权"
              delay={0.3}
            >
              <FormField label="ICP备案信息">
                <Input
                  placeholder="例如：京ICP备12345678号-1"
                  value={icpFiling}
                  onChange={(e) => setIcpFiling(e.target.value)}
                  disabled={isSubmitting}
                  className="h-12 bg-muted/5 border-border/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                />
              </FormField>

              <FormField label="版权声明">
                <Textarea
                  placeholder="请输入版权信息..."
                  value={copyright}
                  onChange={(e) => setCopyright(e.target.value)}
                  disabled={isSubmitting}
                  className="min-h-25 bg-muted/5 border-border/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all duration-200 resize-none"
                />
              </FormField>
            </ConfigCard>

            {/* 操作按钮区域 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="flex flex-col items-center gap-4 pt-4"
            >
              {/* 保存按钮 */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
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
              </motion.div>

              {/* 最后更新时间 */}
              {siteConfig?.updatedAt && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-muted-foreground"
                >
                  最后更新：{new Date(siteConfig.updatedAt).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </motion.p>
              )}
            </motion.div>
          </div>
        </div>
      </ScrollArea>

      {/* 素材选择器 */}
      <MaterialPicker
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        onSelect={handleMaterialSelect}
        multiple={false}
        typeFilter={['image']}
        showOverlay={false}
        disableAnimation
      />
    </>
  )
}
