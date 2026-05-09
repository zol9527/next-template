# 首页 Banner 动态配置实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在后台管理系统中新增首页 Banner 配置功能，使运营人员可以动态设置小程序首页 Banner 的标签、标题、副标题和跳转链接。

**Architecture:** 复用商城 VIP Banner 配置模式，使用 SystemSetting 存储配置数据（key: `miniprogram.home.banner_config`），后台通过 admin API 管理，小程序通过 public API 获取配置并动态渲染。

**Tech Stack:** Next.js App Router, Prisma, Zod, TanStack Query, React Hook Form, Tailwind CSS, Vue 3 (小程序)

---

## Task 1: 新增首页 Banner 配置 DTO

**Files:**
- Create: `src/contracts/dtos/admin/miniprogram-home-config.dto.ts`

- [ ] **Step 1: 创建 DTO 文件**

创建文件 `src/contracts/dtos/admin/miniprogram-home-config.dto.ts`，内容如下：

```typescript
import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// =============================================================================
// Miniprogram Home Banner Config DTOs
// =============================================================================

/**
 * 跳转链接类型枚举
 */
export const HomeBannerLinkTypeEnum = z.enum(['product', 'ad', 'custom', 'none'])

export type HomeBannerLinkType = z.infer<typeof HomeBannerLinkTypeEnum>

/**
 * 跳转链接类型描述映射
 */
export const HomeBannerLinkTypeDescriptions: Record<HomeBannerLinkType, string> = {
  product: '商品详情',
  ad: '广告页面',
  custom: '自定义链接',
  none: '不跳转',
}

/**
 * 首页 Banner 配置 Schema
 */
export const MiniprogramHomeBannerConfigSchema = z
  .object({
    enabled: z.boolean().default(true).openapi({ description: '是否启用首页 Banner' }),
    tagText: z.string().min(1).default('限时免费').openapi({ description: '标签文字' }),
    title: z.string().min(1).default('零基础入门\n数据分析实战课').openapi({ description: 'Banner 主标题' }),
    subtitle: z.string().min(1).default('前 100 名报名免费').openapi({ description: 'Banner 副标题' }),
    linkType: HomeBannerLinkTypeEnum.default('none').openapi({ description: '跳转类型' }),
    linkUrl: z.string().nullable().optional().openapi({ description: '跳转链接（当 linkType 为 custom 时使用）' }),
    productId: z.string().nullable().optional().openapi({ description: '关联商品 ID（当 linkType 为 product 时使用）' }),
  })
  .openapi({ description: '首页 Banner 配置' })

export type MiniprogramHomeBannerConfig = z.infer<typeof MiniprogramHomeBannerConfigSchema>

/**
 * 更新首页 Banner 配置请求 Schema
 */
export const UpdateMiniprogramHomeBannerConfigRequestSchema = MiniprogramHomeBannerConfigSchema.openapi({
  description: '更新首页 Banner 配置请求',
})

export type UpdateMiniprogramHomeBannerConfigRequest = z.infer<typeof UpdateMiniprogramHomeBannerConfigRequestSchema>
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd /Users/loyd/dev/project/nextjs/next-template && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: 无类型错误

- [ ] **Step 3: 提交**

```bash
cd /Users/loyd/dev/project/nextjs/next-template
git add src/contracts/dtos/admin/miniprogram-home-config.dto.ts
git commit -m "feat: add homepage banner config DTO"
```

---

## Task 2: 注册权限 Scope

**Files:**
- Modify: `src/config/access/scope-tree.ts:44-50`

- [ ] **Step 1: 在 miniprogram scope 下新增 home-config 子 scope**

在 `src/config/access/scope-tree.ts` 中，找到 `miniprogram.children` 对象，在 `'shop-config'` 后面添加 `'home-config'`：

```typescript
miniprogram: {
    description: '小程序管理',
    children: {
      carousels: { description: '轮播图管理' },
      'shop-config': { description: '商城设置管理' },
      'home-config': { description: '首页 Banner 配置管理' },
    },
  },
```

- [ ] **Step 2: 提交**

```bash
cd /Users/loyd/dev/project/nextjs/next-template
git add src/config/access/scope-tree.ts
git commit -m "feat: register home-config permission scope"
```

---

## Task 3: 新增后台管理 API

**Files:**
- Create: `src/app/api/v1/admin/miniprogram/home-config/route.ts`

- [ ] **Step 1: 创建 API 路由文件**

创建目录和文件 `src/app/api/v1/admin/miniprogram/home-config/route.ts`，内容如下：

```typescript
import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import { UpdateMiniprogramHomeBannerConfigRequestSchema } from '@/contracts/dtos/admin/miniprogram-home-config.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSystemSettingsRepository } from '@/repositories/factory'
import type { MiniprogramHomeBannerConfig } from '@/contracts/dtos/admin/miniprogram-home-config.dto'

/** SystemSetting 中存储首页 Banner 配置的 key */
const HOME_BANNER_CONFIG_KEY = 'miniprogram.home.banner_config'

/** 默认配置 */
const DEFAULT_CONFIG: MiniprogramHomeBannerConfig = {
  enabled: true,
  tagText: '限时免费',
  title: '零基础入门\n数据分析实战课',
  subtitle: '前 100 名报名免费',
  linkType: 'none',
  linkUrl: null,
  productId: null,
}

/**
 * GET /api/v1/admin/miniprogram/home-config
 *
 * 获取首页 Banner 配置
 */
export const GET = withV1Route({
  action: 'admin:miniprogram:home:config:view',
  requireAccess: { action: 'read' as Action, scope: 'miniprogram.home-config' as Scope },
  handler: async ({ req, serviceContext }) => {
    const repo = await createSystemSettingsRepository()

    const repoCtx = {
      traceId: serviceContext.traceId,
      logger: serviceContext.logger.child({ layer: 'repository' }),
    }

    const raw = await repo.getSetting<string>(repoCtx, { key: HOME_BANNER_CONFIG_KEY })

    // 如果没有存储的配置，返回默认值
    const config: MiniprogramHomeBannerConfig = raw ? JSON.parse(raw) : DEFAULT_CONFIG

    return createJsonApiResponse(req, ok(config))
  },
})

/**
 * PUT /api/v1/admin/miniprogram/home-config
 *
 * 更新首页 Banner 配置
 */
export const PUT = withV1Route({
  action: 'admin:miniprogram:home:config:update',
  requireAccess: { action: 'write' as Action, scope: 'miniprogram.home-config' as Scope },
  schemas: { body: UpdateMiniprogramHomeBannerConfigRequestSchema },
  handler: async ({ req, serviceContext, body }) => {
    const repo = await createSystemSettingsRepository()

    const repoCtx = {
      traceId: serviceContext.traceId,
      logger: serviceContext.logger.child({ layer: 'repository' }),
    }

    const config = body!
    await repo.updateSetting(repoCtx, {
      key: HOME_BANNER_CONFIG_KEY,
      value: JSON.stringify(config),
    })

    serviceContext.logger.info({
      action: 'admin_miniprogram_home_config.update',
    })

    return createJsonApiResponse(req, ok(config))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
```

- [ ] **Step 2: 提交**

```bash
cd /Users/loyd/dev/project/nextjs/next-template
git add src/app/api/v1/admin/miniprogram/home-config/route.ts
git commit -m "feat: add admin API for homepage banner config"
```

---

## Task 4: 新增公开 API

**Files:**
- Create: `src/app/api/v1/public/miniprogram/home-config/route.ts`

- [ ] **Step 1: 创建公开 API 路由文件**

创建文件 `src/app/api/v1/public/miniprogram/home-config/route.ts`，内容如下：

```typescript
import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createSystemSettingsRepository } from '@/repositories/factory'
import type { MiniprogramHomeBannerConfig } from '@/contracts/dtos/admin/miniprogram-home-config.dto'

/** SystemSetting 中存储首页 Banner 配置的 key */
const HOME_BANNER_CONFIG_KEY = 'miniprogram.home.banner_config'

/** 默认配置（公开接口需要提供兜底值） */
const DEFAULT_CONFIG: MiniprogramHomeBannerConfig = {
	enabled: true,
	tagText: '限时免费',
	title: '零基础入门\n数据分析实战课',
	subtitle: '前 100 名报名免费',
	linkType: 'none',
	linkUrl: null,
	productId: null,
}

/**
 * GET /api/v1/public/miniprogram/home-config
 *
 * Description: 获取首页 Banner 配置（公开接口，无需认证）
 */
export const GET = withV1Route({
	pluginGuard: 'wechat',
	action: 'public:miniprogram:home:config',
	requireAuth: false,
	schemas: {},
	handler: async ({ req, serviceContext }) => {
		const repo = await createSystemSettingsRepository()

		const repoCtx = {
			traceId: serviceContext.traceId,
			logger: serviceContext.logger.child({ layer: 'repository' }),
		}

		const raw = await repo.getSetting<string>(repoCtx, { key: HOME_BANNER_CONFIG_KEY })

		const config: MiniprogramHomeBannerConfig = raw ? JSON.parse(raw) : DEFAULT_CONFIG

		serviceContext.logger.info({
			action: 'public_miniprogram_home_config.get',
		})

		return createJsonApiResponse(req, ok(config))
	},
})

export function OPTIONS(req: NextRequest) {
	return createOptionsResponse(req)
}
```

- [ ] **Step 2: 提交**

```bash
cd /Users/loyd/dev/project/nextjs/next-template
git add src/app/api/v1/public/miniprogram/home-config/route.ts
git commit -m "feat: add public API for homepage banner config"
```

---

## Task 5: 新增后台管理页面

**Files:**
- Create: `src/app/admin/miniprogram/home-config/page.tsx`

- [ ] **Step 1: 创建管理页面**

创建文件 `src/app/admin/miniprogram/home-config/page.tsx`，内容如下：

```typescript
'use client'

import { MiniprogramHomeConfigForm } from '@/components/business/admin/miniprogram/home-config-form'

/**
 * Function: AdminMiniprogramHomeConfigPage
 *
 * Description: 首页 Banner 配置管理页面
 * 管理小程序首页的 Banner 展示内容和跳转链接
 */
export default function AdminMiniprogramHomeConfigPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">首页设置</h2>
        <p className="text-muted-foreground mt-1">
          管理微信小程序首页的 Banner 展示内容与跳转配置
        </p>
      </div>
      <MiniprogramHomeConfigForm />
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
cd /Users/loyd/dev/project/nextjs/next-template
git add src/app/admin/miniprogram/home-config/page.tsx
git commit -m "feat: add homepage banner config admin page"
```

---

## Task 6: 新增表单组件

**Files:**
- Create: `src/components/business/admin/miniprogram/home-config-form.tsx`

这是最大的一个文件，完全复用 `shop-config-form.tsx` 的模式，但适配首页 Banner 配置的字段。

- [ ] **Step 1: 创建表单组件**

创建文件 `src/components/business/admin/miniprogram/home-config-form.tsx`。

参考 `src/components/business/admin/miniprogram/shop-config-form.tsx` 的完整结构，关键差异点：
1. queryKey 改为 `['miniprogram-home-config']`
2. API 路径改为 `/api/v1/admin/miniprogram/home-config`
3. 新增 `tagText` 字段
4. 默认配置使用首页 Banner 的默认值
5. ConfigCard 标题改为"Banner 内容"和"点击跳转"
6. 提交成功提示改为"首页设置已更新"
7. 类型定义使用 `HomeBannerConfig` 接口（包含 `tagText` 字段）

完整代码内容（与 shop-config-form.tsx 结构相同，适配首页配置字段）：

```typescript
'use client'

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
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
  tagText: '限时免费',
  title: '零基础入门\n数据分析实战课',
  subtitle: '前 100 名报名免费',
  linkType: 'none' as const,
  linkUrl: null as string | null,
  productId: null as string | null,
}

interface HomeBannerConfig {
  enabled: boolean
  tagText: string
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
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
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
 * Component: MiniprogramHomeConfigForm
 *
 * Description: 首页 Banner 配置表单组件
 * 支持编辑 Banner 标签、标题、副标题、跳转链接等设置
 */
export function MiniprogramHomeConfigForm() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // 表单状态
  const [enabled, setEnabled] = React.useState(DEFAULT_CONFIG.enabled)
  const [tagText, setTagText] = React.useState(DEFAULT_CONFIG.tagText)
  const [title, setTitle] = React.useState(DEFAULT_CONFIG.title)
  const [subtitle, setSubtitle] = React.useState(DEFAULT_CONFIG.subtitle)
  const [linkType, setLinkType] = React.useState<HomeBannerConfig['linkType']>(DEFAULT_CONFIG.linkType)
  const [linkUrl, setLinkUrl] = React.useState<string>(DEFAULT_CONFIG.linkUrl ?? '')
  const [productId, setProductId] = React.useState<string>(DEFAULT_CONFIG.productId ?? '')
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // 获取当前配置
  const { data: config, isLoading } = useQuery({
    queryKey: ['miniprogram-home-config'],
    queryFn: async (): Promise<HomeBannerConfig> => {
      const res = await fetch('/api/v1/admin/miniprogram/home-config', {
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
      setTagText(config.tagText)
      setTitle(config.title)
      setSubtitle(config.subtitle)
      setLinkType(config.linkType)
      setLinkUrl(config.linkUrl ?? '')
      setProductId(config.productId ?? '')
    }
  }, [config])

  // 保存 Mutation
  const saveMutation = useMutation({
    mutationFn: async (data: HomeBannerConfig): Promise<HomeBannerConfig> => {
      const res = await fetch('/api/v1/admin/miniprogram/home-config', {
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
      queryClient.invalidateQueries({ queryKey: ['miniprogram-home-config'] })
      toast({
        title: '保存成功',
        description: '首页设置已更新',
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
    if (!tagText.trim()) newErrors.tagText = '标签文字不能为空'
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

    const payload: HomeBannerConfig = {
      enabled,
      tagText: tagText.trim(),
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
                <Label className="text-sm font-semibold">启用首页 Banner</Label>
                <p className="text-xs text-muted-foreground">控制首页 Banner 的显示与隐藏</p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                disabled={isSubmitting}
              />
            </div>

            {/* 标签文字 */}
            <FormField
              label="标签文字"
              required
              error={errors.tagText}
              description="Banner 左上角的标签文字，如"限时免费""
            >
              <Input
                placeholder="例如：限时免费"
                value={tagText}
                onChange={(e) => {
                  setTagText(e.target.value)
                  if (errors.tagText) setErrors(prev => ({ ...prev, tagText: '' }))
                }}
                disabled={isSubmitting}
                className={cn(
                  'h-12 bg-muted/5 border-border/10',
                  'focus:border-primary/50 focus:ring-2 focus:ring-primary/10',
                  'transition-all duration-200',
                  errors.tagText && 'border-destructive focus:border-destructive focus:ring-destructive/10'
                )}
              />
            </FormField>

            {/* 主标题 */}
            <FormField
              label="主标题"
              required
              error={errors.title}
              description="使用 \\n 表示换行"
            >
              <Input
                placeholder="例如：零基础入门\n数据分析实战课"
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
                placeholder="例如：前 100 名报名免费"
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
                  setLinkType(val as HomeBannerConfig['linkType'])
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
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
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
              </motion.div>
            )}

            {/* 自定义链接（仅当 linkType 为 custom 时显示） */}
            {linkType === 'custom' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
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
              </motion.div>
            )}
          </ConfigCard>

          {/* 操作按钮区域 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex flex-col items-center gap-4 pt-4"
          >
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
          </motion.div>
        </div>
      </div>
    </ScrollArea>
  )
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd /Users/loyd/dev/project/nextjs/next-template && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: 无类型错误

- [ ] **Step 3: 提交**

```bash
cd /Users/loyd/dev/project/nextjs/next-template
git add src/components/business/admin/miniprogram/home-config-form.tsx
git commit -m "feat: add homepage banner config form component"
```

---

## Task 7: 添加侧边栏导航项

**Files:**
- Modify: `src/components/business/admin/miniprogram/miniprogram-sub-sidebar.tsx:37-56`

- [ ] **Step 1: 在 miniprogramNavItems 数组中添加首页设置导航项**

在 `miniprogramNavItems` 数组中，在 `'商城设置'` 之前添加 `'首页设置'` 导航项。需要从 lucide-react 额外导入 `Home` 图标。

修改导入行：
```typescript
import { Image as ImageIcon, Home, Settings, ShoppingBag, Smartphone } from 'lucide-react'
```

在 `miniprogramNavItems` 数组的第一个元素（轮播图）之后添加：
```typescript
  {
    name: '首页设置',
    href: '/admin/miniprogram/home-config',
    icon: Home,
    description: '首页 Banner 配置',
  },
```

- [ ] **Step 2: 提交**

```bash
cd /Users/loyd/dev/project/nextjs/next-template
git add src/components/business/admin/miniprogram/miniprogram-sub-sidebar.tsx
git commit -m "feat: add homepage config sidebar navigation item"
```

---

## Task 8: 小程序首页 Banner 动态渲染

**Files:**
- Modify: `src/pages/index/index.vue` (小程序项目: `/Users/loyd/dev/project/mini-program/shuoboda-miniprograme`)

- [ ] **Step 1: 新增 Banner 配置类型和状态**

在 `<script>` 部分的 `setup()` 函数中，`dailyCheckinStatus` 之后添加首页 Banner 配置相关代码：

```typescript
    // ====== 首页 Banner 配置 ======
    interface HomeBannerConfig {
      enabled: boolean
      tagText: string
      title: string
      subtitle: string
      linkType: 'product' | 'ad' | 'custom' | 'none'
      linkUrl: string | null
      productId: string | null
    }

    const DEFAULT_HOME_BANNER_CONFIG: HomeBannerConfig = {
      enabled: true,
      tagText: '限时免费',
      title: '零基础入门\n数据分析实战课',
      subtitle: '前 100 名报名免费',
      linkType: 'none',
      linkUrl: null,
      productId: null,
    }

    const homeBannerConfig = ref<HomeBannerConfig>({ ...DEFAULT_HOME_BANNER_CONFIG })

    /** 加载首页 Banner 配置 */
    const loadHomeBannerConfig = async () => {
      try {
        const result = await httpClient.get('/public/miniprogram/home-config')
        if (result) {
          homeBannerConfig.value = { ...DEFAULT_HOME_BANNER_CONFIG, ...result }
        }
      } catch (error) {
        logger.warn('加载首页 Banner 配置失败，使用默认值', error)
      }
    }

    /** 首页 Banner 点击跳转处理 */
    const handleHomeBannerTap = () => {
      const { linkType, linkUrl, productId } = homeBannerConfig.value
      switch (linkType) {
        case 'product':
          if (productId) {
            uni.navigateTo({ url: `/subpackages/product/detail?id=${productId}` })
          }
          break
        case 'ad':
        case 'custom':
          if (linkUrl) {
            uni.navigateTo({ url: linkUrl })
          }
          break
        case 'none':
        default:
          break
      }
    }
```

注意：需要确保 `httpClient` 已在文件顶部导入。查看商城页面的导入方式：
```typescript
import { httpClient } from '@/services/http'
```

如果首页没有导入 `httpClient`，需要在 import 区域添加此导入。

- [ ] **Step 2: 在 onMounted 中并行加载 Banner 配置**

修改 `onMounted` 中的 `Promise.all`，添加 `loadHomeBannerConfig()`：

```typescript
    onMounted(async () => {
      syncTabBar()
      checkMiniProgramUpdate()
      await auth.init()

      // 并行加载：分类、热门推荐商品、站点配置、签到状态、首页 Banner 配置
      await Promise.all([
        loadCategories(),
        products.loadProducts({ featured: true }),
        loadSiteConfig(),
        loadCheckinStatus(),
        loadHomeBannerConfig(),
      ])
    })
```

同样修改 `onPullDownRefresh` 中的 `promises` 数组，添加 `currentPage?.loadHomeBannerConfig?.()`：

```typescript
  onPullDownRefresh() {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1] as any
    const promises: Promise<any>[] = [
        currentPage?.loadFeaturedProducts?.() ?? Promise.resolve(),
        currentPage?.loadSiteConfig?.() ?? Promise.resolve(),
        currentPage?.loadCheckinStatus?.() ?? Promise.resolve(),
        currentPage?.loadHomeBannerConfig?.() ?? Promise.resolve(),
      ]
    Promise.all(promises).finally(() => {
      uni.stopPullDownRefresh()
    })
  },
```

- [ ] **Step 3: 修改 Banner 区域模板**

将现有模板中的静态兜底 Banner 替换为动态配置版本。找到 `<!-- 无商品时的静态兜底 -->` 注释部分（约第 56-69 行），替换为：

```vue
      <!-- 无商品时的动态配置 Banner -->
      <view class="banner-card" v-else-if="homeBannerConfig.enabled" @tap="handleHomeBannerTap">
        <view class="banner-tag">
          <text class="banner-tag-text">{{ homeBannerConfig.tagText }}</text>
        </view>
        <text class="banner-title">{{ homeBannerConfig.title }}</text>
        <text class="banner-subtitle">{{ homeBannerConfig.subtitle }}</text>
        <view class="banner-dots">
          <view class="dot-active" />
          <view class="dot-inactive" />
          <view class="dot-inactive" />
        </view>
        <view class="banner-deco" />
      </view>
```

- [ ] **Step 4: 在 return 对象中导出新变量和方法**

在 `return` 对象中添加：
```typescript
      homeBannerConfig,
      loadHomeBannerConfig,
      handleHomeBannerTap,
```

- [ ] **Step 5: 验证编译**

Run: `cd /Users/loyd/dev/project/mini-program/shuoboda-miniprograme && npx vue-tsc --noEmit 2>&1 | head -20`
Expected: 无类型错误（或确认错误与本改动无关）

- [ ] **Step 6: 提交**

```bash
cd /Users/loyd/dev/project/mini-program/shuoboda-miniprograme
git add src/pages/index/index.vue
git commit -m "feat: homepage banner dynamic config rendering"
```

---

## Task 9: 最终验证

- [ ] **Step 1: 后台项目 TypeScript 编译检查**

Run: `cd /Users/loyd/dev/project/nextjs/next-template && npx tsc --noEmit --pretty`
Expected: 无错误

- [ ] **Step 2: 后台项目 Lint 检查**

Run: `cd /Users/loyd/dev/project/nextjs/next-template && npm run lint 2>&1 | tail -20`
Expected: 无 lint 错误

- [ ] **Step 3: 提交所有剩余变更**

确保所有文件都已提交。
