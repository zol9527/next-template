# 常见问题后台管理 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在后台管理系统中添加"常见问题管理"页面，支持增删改查、排序、启停用；小程序端 FAQ 改为 API 驱动。

**Architecture:** 后台新增 Prisma model + Repository + API 路由 + 管理页面，遵循现有 miniprogram 模块模式（参考 shop-config 和 carousel）。小程序端新增 FAQ 服务，改造 help-feedback 页面从 API 获取数据。

**Tech Stack:** Prisma (ORM), Zod (DTO), React Query, Next.js App Router, uni-app (Vue 3)

**涉及项目:**
- 后台: `/Users/loyd/dev/project/nextjs/next-template`
- 小程序: `/Users/loyd/dev/project/mini-program/shuoboda-miniprograme`

---

## 文件结构总览

### 后台 (Next.js)

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| 修改 | `prisma/schemas/base.prisma` | 新增 MiniProgramFaq 模型 |
| 创建 | `src/contracts/dtos/admin/miniprogram-faq.dto.ts` | Zod DTO 定义 |
| 创建 | `src/plugins/wechat/repositories/interfaces/miniprogram-faq.interface.ts` | Repository 接口 |
| 创建 | `src/plugins/wechat/repositories/prisma/miniprogram-faq.repository.ts` | Prisma 实现 |
| 修改 | `src/repositories/factory/wechat/miniprogram.factory.ts` | 新增 FAQ 工厂函数 |
| 创建 | `src/app/api/v1/admin/miniprogram/faq/route.ts` | 管理端 CRUD API |
| 创建 | `src/app/api/v1/public/miniprogram/faq/route.ts` | 公开 API |
| 创建 | `src/app/admin/miniprogram/faq/page.tsx` | 管理页面 |
| 创建 | `src/components/business/admin/miniprogram/faq-list.tsx` | FAQ 列表组件 |
| 修改 | `src/components/business/admin/miniprogram/miniprogram-sub-sidebar.tsx` | 新增导航项 |
| 修改 | `src/config/access/scope-tree.ts` | 新增权限节点 |

### 小程序 (uni-app)

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| 创建 | `src/services/api/faq.ts` | FAQ 服务 |
| 修改 | `src/services/api/index.ts` | 导出 FAQ 服务 |
| 修改 | `src/subpackages/about/help-feedback/index.vue` | 改为 API 驱动 |

---

## Task 1: 数据库模型 — Prisma Schema

**文件:**
- 修改: `prisma/schemas/base.prisma`

- [ ] **Step 1: 在 `base.prisma` 末尾（枚举定义之前）添加 MiniProgramFaq 模型**

在 `FeedbackReply` 模型之后、枚举定义区域之前，添加：

```prisma
// ============================================================================
// 小程序常见问题
// ============================================================================

model MiniProgramFaq {
  id        String   @id @default(uuid())
  question  String                    // 问题标题
  answer    String   @db.Text         // 问题答案
  sort      Int      @default(0)      // 排序权重，值越小越靠前
  enabled   Boolean  @default(true)   // 是否启用
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("mini_program_faqs")
}
```

- [ ] **Step 2: 运行 Prisma 迁移**

```bash
cd /Users/loyd/dev/project/nextjs/next-template
npx prisma migrate dev --name add_mini_program_faq
```

预期输出：迁移成功，生成新的 migration 文件。

- [ ] **Step 3: 生成 Prisma Client**

```bash
npx prisma generate
```

- [ ] **Step 4: 提交**

```bash
git add prisma/
git commit -m "feat: add MiniProgramFaq model and migration"
```

---

## Task 2: DTO — Zod Schema 定义

**文件:**
- 创建: `src/contracts/dtos/admin/miniprogram-faq.dto.ts`

- [ ] **Step 1: 创建 DTO 文件**

```typescript
import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// =============================================================================
// Miniprogram FAQ DTOs
// =============================================================================

/**
 * FAQ 条目 Schema
 */
export const MiniprogramFaqItemSchema = z
  .object({
    id: z.string().openapi({ description: 'FAQ ID' }),
    question: z.string().openapi({ description: '问题标题' }),
    answer: z.string().openapi({ description: '问题答案' }),
    sort: z.number().int().openapi({ description: '排序权重' }),
    enabled: z.boolean().openapi({ description: '是否启用' }),
    createdAt: z.string().openapi({ description: '创建时间' }),
    updatedAt: z.string().openapi({ description: '更新时间' }),
  })
  .openapi({ description: 'FAQ 条目' })

export type MiniprogramFaqItem = z.infer<typeof MiniprogramFaqItemSchema>

/**
 * 创建 FAQ 请求 Schema
 */
export const CreateMiniprogramFaqRequestSchema = z
  .object({
    question: z.string().min(1, '问题标题不能为空').max(200).openapi({ description: '问题标题' }),
    answer: z.string().min(1, '问题答案不能为空').openapi({ description: '问题答案' }),
    sort: z.number().int().min(0).default(0).openapi({ description: '排序权重' }),
    enabled: z.boolean().default(true).openapi({ description: '是否启用' }),
  })
  .openapi({ description: '创建 FAQ 请求' })

export type CreateMiniprogramFaqRequest = z.infer<typeof CreateMiniprogramFaqRequestSchema>

/**
 * 更新 FAQ 请求 Schema
 */
export const UpdateMiniprogramFaqRequestSchema = z
  .object({
    question: z.string().min(1, '问题标题不能为空').max(200).optional().openapi({ description: '问题标题' }),
    answer: z.string().min(1, '问题答案不能为空').optional().openapi({ description: '问题答案' }),
    sort: z.number().int().min(0).optional().openapi({ description: '排序权重' }),
    enabled: z.boolean().optional().openapi({ description: '是否启用' }),
  })
  .openapi({ description: '更新 FAQ 请求' })

export type UpdateMiniprogramFaqRequest = z.infer<typeof UpdateMiniprogramFaqRequestSchema>
```

- [ ] **Step 2: 提交**

```bash
git add src/contracts/dtos/admin/miniprogram-faq.dto.ts
git commit -m "feat: add miniprogram FAQ DTOs"
```

---

## Task 3: Repository 层 — 接口 + 实现 + 工厂

**文件:**
- 创建: `src/plugins/wechat/repositories/interfaces/miniprogram-faq.interface.ts`
- 创建: `src/plugins/wechat/repositories/prisma/miniprogram-faq.repository.ts`
- 修改: `src/repositories/factory/wechat/miniprogram.factory.ts`

- [ ] **Step 1: 创建 Repository 接口**

文件: `src/plugins/wechat/repositories/interfaces/miniprogram-faq.interface.ts`

```typescript
import type { RepoContext } from '@/types/repo/repo-context'

/**
 * FAQ 条目数据类型
 */
export interface FaqRecord {
  id: string
  question: string
  answer: string
  sort: number
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * 创建 FAQ 参数
 */
export interface CreateFaqParams {
  question: string
  answer: string
  sort?: number
  enabled?: boolean
}

/**
 * 更新 FAQ 参数
 */
export interface UpdateFaqParams {
  question?: string
  answer?: string
  sort?: number
  enabled?: boolean
}

/**
 * Function: MiniProgramFaqRepository
 *
 * Description: 小程序常见问题数据仓储接口
 * 提供对 mini_program_faqs 表的 CRUD 操作
 */
export interface MiniProgramFaqRepository {
  /**
   * 获取所有 FAQ（管理端用，包含禁用的）
   */
  listAll(ctx: RepoContext): Promise<FaqRecord[]>

  /**
   * 获取所有启用的 FAQ（公开 API 用）
   */
  listEnabled(ctx: RepoContext): Promise<FaqRecord[]>

  /**
   * 根据 ID 获取单条 FAQ
   */
  getById(ctx: RepoContext, params: { id: string }): Promise<FaqRecord | null>

  /**
   * 创建 FAQ
   */
  create(ctx: RepoContext, params: CreateFaqParams): Promise<FaqRecord>

  /**
   * 更新 FAQ
   */
  update(ctx: RepoContext, params: { id: string } & UpdateFaqParams): Promise<FaqRecord>

  /**
   * 删除 FAQ
   */
  delete(ctx: RepoContext, params: { id: string }): Promise<void>
}
```

- [ ] **Step 2: 创建 Prisma 实现**

文件: `src/plugins/wechat/repositories/prisma/miniprogram-faq.repository.ts`

```typescript
import type { RepoContext } from '@/types/repo/repo-context'
import type {
  MiniProgramFaqRepository,
  FaqRecord,
  CreateFaqParams,
  UpdateFaqParams,
} from '../interfaces/miniprogram-faq.interface'
import { prisma } from '@/lib/prisma'

/**
 * Function: toFaqRecord
 *
 * Description: 将 Prisma 模型转换为 FaqRecord 类型
 */
function toFaqRecord(raw: {
  id: string
  question: string
  answer: string
  sort: number
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}): FaqRecord {
  return {
    id: raw.id,
    question: raw.question,
    answer: raw.answer,
    sort: raw.sort,
    enabled: raw.enabled,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

/**
 * Function: createPrismaMiniProgramFaqRepository
 *
 * Description: 创建基于 Prisma 的 FAQ 仓储实现
 */
export function createPrismaMiniProgramFaqRepository(): MiniProgramFaqRepository {
  return {
    async listAll(ctx: RepoContext): Promise<FaqRecord[]> {
      const records = await prisma.miniProgramFaq.findMany({
        orderBy: { sort: 'asc' },
      })
      return records.map(toFaqRecord)
    },

    async listEnabled(ctx: RepoContext): Promise<FaqRecord[]> {
      const records = await prisma.miniProgramFaq.findMany({
        where: { enabled: true },
        orderBy: { sort: 'asc' },
      })
      return records.map(toFaqRecord)
    },

    async getById(ctx: RepoContext, params: { id: string }): Promise<FaqRecord | null> {
      const raw = await prisma.miniProgramFaq.findUnique({
        where: { id: params.id },
      })
      return raw ? toFaqRecord(raw) : null
    },

    async create(ctx: RepoContext, params: CreateFaqParams): Promise<FaqRecord> {
      const raw = await prisma.miniProgramFaq.create({
        data: {
          question: params.question,
          answer: params.answer,
          sort: params.sort ?? 0,
          enabled: params.enabled ?? true,
        },
      })
      return toFaqRecord(raw)
    },

    async update(ctx: RepoContext, params: { id: string } & UpdateFaqParams): Promise<FaqRecord> {
      const { id, ...data } = params
      const raw = await prisma.miniProgramFaq.update({
        where: { id },
        data,
      })
      return toFaqRecord(raw)
    },

    async delete(ctx: RepoContext, params: { id: string }): Promise<void> {
      await prisma.miniProgramFaq.delete({
        where: { id: params.id },
      })
    },
  }
}
```

- [ ] **Step 3: 在工厂文件中添加 FAQ 工厂函数**

在 `src/repositories/factory/wechat/miniprogram.factory.ts` 末尾追加：

```typescript
import type { MiniProgramFaqRepository } from '@/plugins/wechat/repositories/interfaces/miniprogram-faq.interface'
import { createPrismaMiniProgramFaqRepository } from '@/plugins/wechat/repositories/prisma/miniprogram-faq.repository'

/**
 * Function: createMiniprogramFaqRepository
 *
 * Description: 创建小程序常见问题仓储实例，根据配置选择数据库提供商
 *
 * Returns:
 * 	repository(Promise<MiniProgramFaqRepository>): MiniProgramFaqRepository 实例
 */
export async function createMiniprogramFaqRepository(): Promise<MiniProgramFaqRepository> {
	const provider = getProvider()

	if (provider === PROVIDER_NAMES.PRISMA) {
		return createPrismaMiniProgramFaqRepository()
	}

	if (provider === PROVIDER_NAMES.SUPABASE) {
		const { createSupabaseMiniProgramFaqRepository } = await import(
			/* @vite-ignore */ '@/plugins/wechat/repositories/supabase/miniprogram-faq.repository'
		)
		return createSupabaseMiniProgramFaqRepository()
	}

	throw new Error(`Unsupported database provider: ${provider}`)
}
```

- [ ] **Step 4: 提交**

```bash
git add src/plugins/wechat/repositories/ src/repositories/factory/wechat/miniprogram.factory.ts
git commit -m "feat: add miniprogram FAQ repository layer"
```

---

## Task 4: 管理端 API 路由

**文件:**
- 创建: `src/app/api/v1/admin/miniprogram/faq/route.ts`

- [ ] **Step 1: 创建管理端 API 路由**

文件: `src/app/api/v1/admin/miniprogram/faq/route.ts`

```typescript
import type { NextRequest } from 'next/server'

import type { Action, Scope } from '@/config/access'
import { ok } from '@/contracts/api-response.schema'
import {
  CreateMiniprogramFaqRequestSchema,
  UpdateMiniprogramFaqRequestSchema,
} from '@/contracts/dtos/admin/miniprogram-faq.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMiniprogramFaqRepository } from '@/repositories/factory'

/** 格式化 FAQ 条目为 API 响应格式 */
function formatFaq(raw: {
  id: string
  question: string
  answer: string
  sort: number
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: raw.id,
    question: raw.question,
    answer: raw.answer,
    sort: raw.sort,
    enabled: raw.enabled,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  }
}

/**
 * GET /api/v1/admin/miniprogram/faq
 * 获取所有 FAQ 列表（按 sort 排序）
 */
export const GET = withV1Route({
  action: 'admin:miniprogram:faq:view',
  requireAccess: { action: 'read' as Action, scope: 'miniprogram.faq' as Scope },
  handler: async ({ req, serviceContext }) => {
    const repo = await createMiniprogramFaqRepository()

    const repoCtx = {
      traceId: serviceContext.traceId,
      logger: serviceContext.logger.child({ layer: 'repository' }),
    }

    const faqs = await repo.listAll(repoCtx)
    const data = faqs.map(formatFaq)

    return createJsonApiResponse(req, ok(data))
  },
})

/**
 * POST /api/v1/admin/miniprogram/faq
 * 新增 FAQ 条目
 */
export const POST = withV1Route({
  action: 'admin:miniprogram:faq:create',
  requireAccess: { action: 'write' as Action, scope: 'miniprogram.faq' as Scope },
  schemas: { body: CreateMiniprogramFaqRequestSchema },
  handler: async ({ req, serviceContext, body }) => {
    const repo = await createMiniprogramFaqRepository()

    const repoCtx = {
      traceId: serviceContext.traceId,
      logger: serviceContext.logger.child({ layer: 'repository' }),
    }

    const faq = await repo.create(repoCtx, {
      question: body!.question,
      answer: body!.answer,
      sort: body!.sort,
      enabled: body!.enabled,
    })

    serviceContext.logger.info({
      action: 'admin_miniprogram_faq.create',
      faqId: faq.id,
    })

    return createJsonApiResponse(req, ok(formatFaq(faq)), 201)
  },
})

/**
 * PUT /api/v1/admin/miniprogram/faq?id=xxx
 * 更新指定 FAQ 条目
 */
export const PUT = withV1Route({
  action: 'admin:miniprogram:faq:update',
  requireAccess: { action: 'write' as Action, scope: 'miniprogram.faq' as Scope },
  schemas: { body: UpdateMiniprogramFaqRequestSchema },
  handler: async ({ req, serviceContext, body }) => {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return createJsonApiResponse(req, { success: false, error: { code: 'MISSING_ID', message: '缺少 id 参数' } }, 400)
    }

    const repo = await createMiniprogramFaqRepository()

    const repoCtx = {
      traceId: serviceContext.traceId,
      logger: serviceContext.logger.child({ layer: 'repository' }),
    }

    const faq = await repo.update(repoCtx, { id, ...body! })

    serviceContext.logger.info({
      action: 'admin_miniprogram_faq.update',
      faqId: id,
    })

    return createJsonApiResponse(req, ok(formatFaq(faq)))
  },
})

/**
 * DELETE /api/v1/admin/miniprogram/faq?id=xxx
 * 删除指定 FAQ 条目
 */
export const DELETE = withV1Route({
  action: 'admin:miniprogram:faq:delete',
  requireAccess: { action: 'write' as Action, scope: 'miniprogram.faq' as Scope },
  handler: async ({ req, serviceContext }) => {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return createJsonApiResponse(req, { success: false, error: { code: 'MISSING_ID', message: '缺少 id 参数' } }, 400)
    }

    const repo = await createMiniprogramFaqRepository()

    const repoCtx = {
      traceId: serviceContext.traceId,
      logger: serviceContext.logger.child({ layer: 'repository' }),
    }

    await repo.delete(repoCtx, { id })

    serviceContext.logger.info({
      action: 'admin_miniprogram_faq.delete',
      faqId: id,
    })

    return createJsonApiResponse(req, ok({ deleted: true }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
```

- [ ] **Step 2: 提交**

```bash
git add src/app/api/v1/admin/miniprogram/faq/
git commit -m "feat: add admin FAQ API route (CRUD)"
```

---

## Task 5: 公开 API 路由

**文件:**
- 创建: `src/app/api/v1/public/miniprogram/faq/route.ts`

- [ ] **Step 1: 创建公开 API 路由**

文件: `src/app/api/v1/public/miniprogram/faq/route.ts`

```typescript
import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMiniprogramFaqRepository } from '@/repositories/factory'

/** 格式化 FAQ 条目为公开 API 响应格式（不含管理信息） */
function formatPublicFaq(raw: {
  id: string
  question: string
  answer: string
  sort: number
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: raw.id,
    question: raw.question,
    answer: raw.answer,
  }
}

/**
 * GET /api/v1/public/miniprogram/faq
 * 获取所有启用的常见问题（按 sort 排序），无需认证
 */
export const GET = withV1Route({
  action: 'public:miniprogram:faq:list',
  handler: async ({ req, serviceContext }) => {
    const repo = await createMiniprogramFaqRepository()

    const repoCtx = {
      traceId: serviceContext.traceId,
      logger: serviceContext.logger.child({ layer: 'repository' }),
    }

    const faqs = await repo.listEnabled(repoCtx)
    const data = faqs.map(formatPublicFaq)

    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
```

- [ ] **Step 2: 提交**

```bash
git add src/app/api/v1/public/miniprogram/faq/
git commit -m "feat: add public FAQ API route for miniprogram"
```

---

## Task 6: 侧边栏导航 + 权限配置

**文件:**
- 修改: `src/components/business/admin/miniprogram/miniprogram-sub-sidebar.tsx`
- 修改: `src/config/access/scope-tree.ts`

- [ ] **Step 1: 在侧边栏导航中添加"常见问题管理"**

在 `miniprogramNavItems` 数组中，在"商城设置"项之后添加：

```typescript
{
  name: '常见问题',
  href: '/admin/miniprogram/faq',
  icon: HelpCircle,  // 需要从 lucide-react 导入
  description: '常见问题管理',
},
```

同时在文件顶部的 import 行中添加 `HelpCircle`：

```typescript
import { Home, Image as ImageIcon, Settings, ShoppingBag, Smartphone, HelpCircle } from 'lucide-react'
```

- [ ] **Step 2: 在 scope-tree.ts 中添加权限节点**

在 `miniprogram` 的 `children` 中添加：

```typescript
faq: { description: '常见问题管理' },
```

即 `miniprogram` 部分变为：

```typescript
miniprogram: {
  description: '小程序管理',
  children: {
    carousels: { description: '轮播图管理' },
    'shop-config': { description: '商城设置管理' },
    'home-config': { description: '首页 Banner 配置管理' },
    faq: { description: '常见问题管理' },
  },
},
```

- [ ] **Step 3: 提交**

```bash
git add src/components/business/admin/miniprogram/miniprogram-sub-sidebar.tsx src/config/access/scope-tree.ts
git commit -m "feat: add FAQ nav item and permission scope"
```

---

## Task 7: 管理页面 + 列表组件

**文件:**
- 创建: `src/app/admin/miniprogram/faq/page.tsx`
- 创建: `src/components/business/admin/miniprogram/faq-list.tsx`

- [ ] **Step 1: 创建页面组件**

文件: `src/app/admin/miniprogram/faq/page.tsx`

```typescript
import { MiniprogramFaqList } from '@/components/business/admin/miniprogram/faq-list'

/**
 * Page: AdminMiniprogramFaqPage
 *
 * Description: 小程序常见问题管理页面
 * 管理小程序帮助与反馈中的常见问题条目
 */
export default function AdminMiniprogramFaqPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">常见问题管理</h2>
        <p className="text-muted-foreground mt-1">
          管理微信小程序帮助与反馈页面中的常见问题条目
        </p>
      </div>
      <MiniprogramFaqList />
    </div>
  )
}
```

- [ ] **Step 2: 创建 FAQ 列表组件**

文件: `src/components/business/admin/miniprogram/faq-list.tsx`

```typescript
'use client'

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * FAQ 条目类型（与 API 响应一致）
 */
interface FaqItem {
  id: string
  question: string
  answer: string
  sort: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 编辑表单数据类型
 */
interface FaqFormData {
  question: string
  answer: string
  sort: number
  enabled: boolean
}

/** 空表单默认值 */
const EMPTY_FORM: FaqFormData = {
  question: '',
  answer: '',
  sort: 0,
  enabled: true,
}

/**
 * Component: MiniprogramFaqList
 *
 * Description: FAQ 列表管理组件
 * 支持新增、编辑、删除、排序调整、启用/禁用切换
 */
export function MiniprogramFaqList() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // 弹窗状态
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<FaqFormData>(EMPTY_FORM)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // 获取 FAQ 列表
  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['miniprogram-faq'],
    queryFn: async (): Promise<FaqItem[]> => {
      const res = await fetch('/api/v1/admin/miniprogram/faq', {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('加载 FAQ 失败')
      const json = await res.json()
      return json.data
    },
  })

  // 新增 FAQ
  const createMutation = useMutation({
    mutationFn: async (data: FaqFormData) => {
      const res = await fetch('/api/v1/admin/miniprogram/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.message || '创建失败')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miniprogram-faq'] })
      toast({ title: '创建成功', description: 'FAQ 条目已添加' })
      closeEditDialog()
    },
    onError: (error: Error) => {
      toast({ title: '创建失败', description: error.message, variant: 'destructive' })
    },
  })

  // 更新 FAQ
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FaqFormData> }) => {
      const res = await fetch(`/api/v1/admin/miniprogram/faq?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.message || '更新失败')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miniprogram-faq'] })
      toast({ title: '更新成功', description: 'FAQ 条目已更新' })
      closeEditDialog()
    },
    onError: (error: Error) => {
      toast({ title: '更新失败', description: error.message, variant: 'destructive' })
    },
  })

  // 删除 FAQ
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/admin/miniprogram/faq?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.message || '删除失败')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miniprogram-faq'] })
      toast({ title: '删除成功', description: 'FAQ 条目已删除' })
      setDeleteDialogOpen(false)
      setDeletingId(null)
    },
    onError: (error: Error) => {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' })
    },
  })

  // 启停用切换
  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch(`/api/v1/admin/miniprogram/faq?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled }),
      })
      if (!res.ok) throw new Error('更新失败')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miniprogram-faq'] })
    },
    onError: (error: Error) => {
      toast({ title: '操作失败', description: error.message, variant: 'destructive' })
    },
  })

  // 排序调整
  const sortMutation = useMutation({
    mutationFn: async ({ id, sort }: { id: string; sort: number }) => {
      const res = await fetch(`/api/v1/admin/miniprogram/faq?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sort }),
      })
      if (!res.ok) throw new Error('排序失败')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miniprogram-faq'] })
    },
  })

  // 打开新增弹窗
  const openCreateDialog = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setEditDialogOpen(true)
  }

  // 打开编辑弹窗
  const openEditDialog = (faq: FaqItem) => {
    setEditingId(faq.id)
    setForm({
      question: faq.question,
      answer: faq.answer,
      sort: faq.sort,
      enabled: faq.enabled,
    })
    setErrors({})
    setEditDialogOpen(true)
  }

  // 关闭编辑弹窗
  const closeEditDialog = () => {
    setEditDialogOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  // 打开删除确认弹窗
  const openDeleteDialog = (id: string) => {
    setDeletingId(id)
    setDeleteDialogOpen(true)
  }

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.question.trim()) newErrors.question = '问题标题不能为空'
    if (!form.answer.trim()) newErrors.answer = '问题答案不能为空'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 提交表单
  const handleSubmit = () => {
    if (!validateForm()) return

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  // 上移
  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const current = faqs[index]
    const prev = faqs[index - 1]
    // 交换 sort 值
    sortMutation.mutate({ id: current.id, sort: prev.sort })
    sortMutation.mutate({ id: prev.id, sort: current.sort })
  }

  // 下移
  const handleMoveDown = (index: number) => {
    if (index === faqs.length - 1) return
    const current = faqs[index]
    const next = faqs[index + 1]
    // 交换 sort 值
    sortMutation.mutate({ id: current.id, sort: next.sort })
    sortMutation.mutate({ id: next.id, sort: current.sort })
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  // 加载骨架屏
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border p-6 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-5 w-5 bg-muted/30 rounded" />
              <div className="h-5 w-48 bg-muted/30 rounded" />
              <div className="ml-auto h-8 w-16 bg-muted/30 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          共 {faqs.length} 条常见问题
        </p>
        <Button onClick={openCreateDialog} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          新增问题
        </Button>
      </div>

      {/* 空状态 */}
      {faqs.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
            <HelpCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">暂无常见问题</h3>
          <p className="text-sm text-muted-foreground mt-1">
            点击上方"新增问题"添加第一条常见问题
          </p>
        </motion.div>
      )}

      {/* FAQ 列表 */}
      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <motion.div
            key={faq.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className={cn(
              'bg-card rounded-xl border border-border/20 shadow-sm overflow-hidden',
              !faq.enabled && 'opacity-60'
            )}
          >
            <div className="flex items-center gap-4 px-5 py-4">
              {/* 排序控制 */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0 || sortMutation.isPending}
                  className="p-0.5 rounded hover:bg-muted/50 disabled:opacity-30 transition-colors"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === faqs.length - 1 || sortMutation.isPending}
                  className="p-0.5 rounded hover:bg-muted/50 disabled:opacity-30 transition-colors"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* 问题内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{faq.question}</span>
                  {!faq.enabled && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      已禁用
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {faq.answer}
                </p>
              </div>

              {/* 启停用开关 */}
              <Switch
                checked={faq.enabled}
                onCheckedChange={(checked) =>
                  toggleMutation.mutate({ id: faq.id, enabled: checked })
                }
                disabled={toggleMutation.isPending}
              />

              {/* 操作按钮 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditDialog(faq)}
                  className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  title="编辑"
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => openDeleteDialog(faq.id)}
                  className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                  title="删除"
                >
                  <Trash2 className="h-4 w-4 text-destructive/60" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 新增/编辑弹窗 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑问题' : '新增问题'}</DialogTitle>
            <DialogDescription>
              {editingId ? '修改常见问题的内容' : '添加一条新的常见问题'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 问题标题 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                问题标题 <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="例如：如何购买课程？"
                value={form.question}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, question: e.target.value }))
                  if (errors.question) setErrors((prev) => ({ ...prev, question: '' }))
                }}
                className={cn(
                  'h-12',
                  errors.question && 'border-destructive'
                )}
              />
              {errors.question && (
                <p className="text-xs text-destructive">{errors.question}</p>
              )}
            </div>

            {/* 问题答案 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                问题答案 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="输入问题的详细答案..."
                value={form.answer}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, answer: e.target.value }))
                  if (errors.answer) setErrors((prev) => ({ ...prev, answer: '' }))
                }}
                rows={4}
                className={cn(
                  'resize-none',
                  errors.answer && 'border-destructive'
                )}
              />
              {errors.answer && (
                <p className="text-xs text-destructive">{errors.answer}</p>
              )}
            </div>

            {/* 排序和启用 */}
            <div className="flex items-center gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">排序权重</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.sort}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, sort: parseInt(e.target.value) || 0 }))
                  }
                  className="w-32 h-10"
                />
                <p className="text-xs text-muted-foreground">值越小越靠前</p>
              </div>

              <div className="flex items-center gap-3 pt-5">
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, enabled: checked }))
                  }
                />
                <Label className="text-sm">启用</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              确认删除
            </DialogTitle>
            <DialogDescription>
              删除后将无法恢复，确定要删除这条常见问题吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  删除中...
                </>
              ) : (
                '确认删除'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 3: 提交**

```bash
git add src/app/admin/miniprogram/faq/ src/components/business/admin/miniprogram/faq-list.tsx
git commit -m "feat: add FAQ management page and list component"
```

---

## Task 8: 小程序 FAQ 服务

**文件:**
- 创建: `src/services/api/faq.ts`
- 修改: `src/services/api/index.ts`

- [ ] **Step 1: 创建 FAQ 服务**

文件: `src/services/api/faq.ts`

```typescript
/**
 * Function: faqService
 *
 * Description: 常见问题 API 服务，处理 FAQ 列表获取
 */

import { httpClient } from '../../core/http-client'
import { logger } from '../../utils/logger'

/**
 * FAQ 条目类型
 */
export interface FaqItem {
  id: string
  question: string
  answer: string
}

/**
 * 常见问题服务类
 */
class FaqService {
  private logger = logger.child({ service: 'faq' })

  /**
   * 缓存 FAQ 数据
   */
  private _cachedFaqs: FaqItem[] | null = null
  private _cacheTimestamp = 0
  /** 缓存有效期：30 分钟 */
  private _cacheTTL = 30 * 60 * 1000

  /**
   * 获取 FAQ 列表（从公开 API 获取启用的条目）
   * @param options.forceRefresh - 是否强制刷新（默认 false）
   * @returns FAQ 列表
   */
  async getFaqList(options: { forceRefresh?: boolean } = {}): Promise<FaqItem[]> {
    const { forceRefresh = false } = options
    this.logger.info('获取 FAQ 列表', { forceRefresh })

    // 使用缓存
    if (!forceRefresh && this._cachedFaqs && Date.now() - this._cacheTimestamp < this._cacheTTL) {
      this.logger.info('使用缓存的 FAQ 列表')
      return this._cachedFaqs
    }

    try {
      const result = await httpClient.get<FaqItem[]>('/public/miniprogram/faq')

      // 更新缓存
      this._cachedFaqs = result
      this._cacheTimestamp = Date.now()

      this.logger.info('获取 FAQ 列表成功', { count: result.length })
      return result
    } catch (error) {
      this.logger.error('获取 FAQ 列表失败', error)

      // 降级：返回缓存数据（即使过期）
      if (this._cachedFaqs) {
        this.logger.warn('使用缓存的 FAQ 列表（降级）')
        return this._cachedFaqs
      }

      throw error
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.logger.info('清除 FAQ 缓存')
    this._cachedFaqs = null
    this._cacheTimestamp = 0
  }
}

/**
 * 导出单例
 */
export const faqService = new FaqService()

export default faqService
```

- [ ] **Step 2: 在 API 入口导出 FAQ 服务**

在 `src/services/api/index.ts` 中添加导出：

在 import 区域添加：
```typescript
// 常见问题服务
import { faqService as _faqService } from './faq'
export { faqService } from './faq'
export type { FaqItem } from './faq'
```

在 `api` 对象中添加：
```typescript
faq: _faqService,
```

- [ ] **Step 3: 提交**

```bash
git add src/services/api/faq.ts src/services/api/index.ts
git commit -m "feat: add FAQ service for miniprogram"
```

---

## Task 9: 小程序帮助页面改造 — API 驱动

**文件:**
- 修改: `src/subpackages/about/help-feedback/index.vue`

- [ ] **Step 1: 改造 script 部分，替换硬编码 FAQ 为 API 获取**

将 `<script setup lang="ts">` 中的内容替换为：

```typescript
import { ref, onMounted, nextTick } from 'vue'
import { faqService } from '@/services/api/faq'
import type { FaqItem } from '@/services/api/faq'
import { logger } from '@/utils/logger'

interface DisplayFaqItem {
  question: string
  answer: string
  expanded: boolean
  answerHeight: number
}

/** 页面加载状态 */
const loading = ref(true)
/** FAQ 列表（展示用） */
const faqList = ref<DisplayFaqItem[]>([])
/** 是否加载失败 */
const loadError = ref(false)

/**
 * 从 API 加载 FAQ 数据并转换为展示格式
 */
async function loadFaqData() {
  loading.value = true
  loadError.value = false

  try {
    const faqs = await faqService.getFaqList()

    faqList.value = faqs.map((item, index) => ({
      question: item.question,
      answer: item.answer,
      expanded: index === 0, // 默认展开第一条
      answerHeight: 0,
    }))

    // 等待 DOM 更新后计算高度
    await nextTick()
    calculateAnswerHeights()
  } catch (error) {
    logger.error('加载 FAQ 数据失败', error as Record<string, unknown>)
    loadError.value = true

    // 降级：使用空列表
    faqList.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 计算每个回答区域的高度，用于展开/收起动画
 */
function calculateAnswerHeights() {
  faqList.value.forEach((_, index) => {
    const query = uni.createSelectorQuery().in(null)
    query.select(`#answer-${index}`).boundingClientRect((data) => {
      if (data) {
        faqList.value[index].answerHeight = (data as any).height
      }
    }).exec()
  })
}

const toggleFaq = (index: number) => {
  faqList.value[index].expanded = !faqList.value[index].expanded
}

const handleFeedback = (type: string) => {
  // TODO: Task 25 Placeholder
  uni.showToast({ title: '功能开发中...', icon: 'none' })
}

onMounted(() => {
  loadFaqData()
})
```

- [ ] **Step 2: 在 template 中添加加载和空状态处理**

在 FAQ section 的 `<view class="faq-list">` 内部，将现有的 `v-for` 循环改为条件渲染：

在 `<view class="faq-list">` 的开始位置添加加载状态：
```html
<!-- 加载中 -->
<view v-if="loading" class="faq-loading">
  <text class="loading-text">加载中...</text>
</view>

<!-- 加载失败 -->
<view v-else-if="loadError" class="faq-error">
  <text class="error-text">加载失败，</text>
  <text class="retry-link" @tap="loadFaqData">点击重试</text>
</view>

<!-- 暂无数据 -->
<view v-else-if="faqList.length === 0" class="faq-empty">
  <text class="empty-text">暂无常见问题</text>
</view>
```

然后在 `v-for` 的 view 上添加 `v-else`：
```html
<template v-else>
  <view 
    v-for="(item, index) in faqList" 
    :key="item.id || index" 
    class="faq-card"
    :class="{ active: item.expanded }"
    @tap="toggleFaq(index)"
  >
    ...（保持原有的 FAQ 卡片内容不变）
  </view>
</template>
```

- [ ] **Step 3: 在 style 中添加加载/错误/空状态样式**

在 `<style>` 的 `.faq-list` 之后添加：

```scss
.faq-loading,
.faq-error,
.faq-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background-color: #FFFFFF;
  border: 1px solid #E2EBED;
  border-radius: 16px;
}

.loading-text,
.empty-text {
  font-size: 13px;
  color: #6B8A94;
}

.error-text {
  font-size: 13px;
  color: #6B8A94;
}

.retry-link {
  font-size: 13px;
  color: #009666;
  font-weight: 500;
}
```

- [ ] **Step 4: 提交**

```bash
git add src/subpackages/about/help-feedback/index.vue
git commit -m "feat: update help-feedback page to load FAQ from API"
```

---

## 完成检查清单

实施完成后验证：

- [ ] 后台管理可以正常访问 `/admin/miniprogram/faq` 页面
- [ ] 可以新增、编辑、删除 FAQ 条目
- [ ] 排序调整正常工作
- [ ] 启停用开关正常工作
- [ ] 公开 API `/api/v1/public/miniprogram/faq` 返回启用的 FAQ
- [ ] 小程序帮助页面从 API 加载 FAQ 数据
- [ ] 加载中、空状态、错误状态正确显示
- [ ] FAQ 展开收起动画正常
