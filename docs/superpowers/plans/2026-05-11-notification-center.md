# 通知中心 (Notification Center) 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现完整的通知中心功能——后端 API（含 cursor 分页、未读计数、批量标记已读）+ 微信小程序通知列表页面（无限滚动、分类筛选、下拉刷新）。

**Architecture:** 遵循项目现有分层架构（API Route → Service → Repository → Prisma），新增 Notification / NotificationRead 两个 Prisma 模型。小程序前端使用 uni-app Vue 3 Composition API，复用现有 http-client + cursor 分页模式。通知按需加载（cursor-based pagination），不全量加载。

**Tech Stack:** Next.js 16+ App Router, Prisma (MySQL), Zod, uni-app (Vue 3 + Pinia), TypeScript

---

## 文件结构

### 后端新增/修改文件

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| **Create** | `apps/backend/prisma/schemas/base.prisma` (追加) | Notification + NotificationRead 模型定义 |
| **Create** | `apps/backend/src/contracts/dtos/notification.dto.ts` | Zod schema + TS 类型（查询/响应） |
| **Create** | `apps/backend/src/repositories/interfaces/core/notification.interface.ts` | Notification Repository 接口 |
| **Create** | `apps/backend/src/repositories/prisma/core/notification.repo.ts` | Prisma Repository 实现 |
| **Create** | `apps/backend/src/repositories/factory/core/notification.factory.ts` | Repository 工厂 |
| **Create** | `apps/backend/src/services/core/notification.service.ts` | 通知业务逻辑 |
| **Create** | `apps/backend/src/app/api/v1/user/notifications/route.ts` | GET 通知列表（cursor 分页） |
| **Create** | `apps/backend/src/app/api/v1/user/notifications/unread-count/route.ts` | GET 未读计数 |
| **Create** | `apps/backend/src/app/api/v1/user/notifications/[id]/read/route.ts` | PUT 标记单条已读 |
| **Create** | `apps/backend/src/app/api/v1/user/notifications/read-all/route.ts` | PUT 全部标记已读 |

### 小程序新增/修改文件

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| **Modify** | `apps/miniprograms/wechat/src/pages.json` | 注册 notifications 子包页面路由 |
| **Create** | `apps/miniprograms/wechat/src/services/api/notifications.ts` | 通知 API 服务 |
| **Modify** | `apps/miniprograms/wechat/src/services/api/index.ts` | 导出 notificationService |
| **Modify** | `apps/miniprograms/wechat/src/pages/index/index.vue` | 替换 goToNotifications 占位 |
| **Create** | `apps/miniprograms/wechat/src/subpackages/notifications/index.vue` | 通知中心页面 |

---

## Task 1: 数据库模型 — Prisma Schema

**Files:**
- Modify: `apps/backend/prisma/schemas/base.prisma` (末尾追加)

- [ ] **Step 1: 在 base.prisma 末尾追加 Notification 和 NotificationRead 模型**

在 `apps/backend/prisma/schemas/base.prisma` 文件末尾（`enum FeedbackStatus` 之后），追加：

```prisma
// ============================================================================
// 通知系统
// ============================================================================

/// 通知类型
enum NotificationType {
  SYSTEM     // 系统通知（账号安全、会员权益等）
  COURSE     // 课程通知（更新、打卡等）
  ACTIVITY   // 活动通知（优惠、限时活动等）
  ORDER      // 订单通知（支付成功、发货等）
}

/// 通知主体 — 由后端系统/管理员创建
model Notification {
  id          String           @id @default(uuid())
  type        NotificationType @default(SYSTEM)
  title       String                            // 通知标题
  content     String           @db.Text          // 通知正文
  summary     String?                           // 摘要（用于列表预览）
  icon        String?                           // 图标标识（前端渲染用）
  linkType    String?                           // 关联类型: course / order / product / none
  linkId      String?                           // 关联 ID
  isGlobal    Boolean          @default(false)   // 是否全局广播（所有用户可见）
  targetUser  String?                           // 指定用户 ID（非全局时必填）
  priority    Int              @default(0)       // 优先级（越高越靠前）
  isActive    Boolean          @default(true)    // 是否启用
  createdAt   DateTime         @default(now()) @map("created_at")
  updatedAt   DateTime         @updatedAt @map("updated_at")

  reads       NotificationRead[]

  @@index([type])
  @@index([isGlobal, createdAt])
  @@index([targetUser, createdAt])
  @@index([createdAt])
  @@map("notifications")
}

/// 通知阅读状态 — 跟踪每个用户的已读
model NotificationRead {
  id             String       @id @default(uuid())
  notificationId String       @map("notification_id")
  userId         String       @map("user_id")
  readAt         DateTime     @default(now()) @map("read_at")

  notification   Notification @relation(fields: [notificationId], references: [id], onDelete: Cascade)

  @@unique([notificationId, userId])
  @@index([userId, readAt])
  @@index([userId])
  @@map("notification_reads")
}
```

同时在 User 模型中追加 relation（找到 `feedbacks` 字段后面，在 `// ── 插件 relation 字段占位` 之前）：

```prisma
  notificationReads  NotificationRead[]
```

- [ ] **Step 2: 运行 Prisma 生成客户端**

Run: `cd apps/backend && bunx prisma generate`
Expected: 成功生成新的 Prisma 客户端类型

- [ ] **Step 3: 提交**

```bash
git add apps/backend/prisma/schemas/base.prisma
git commit -m "feat(notification): add Notification and NotificationRead Prisma models"
```

---

## Task 2: DTO — 通知请求/响应 Zod Schema

**Files:**
- Create: `apps/backend/src/contracts/dtos/notification.dto.ts`

- [ ] **Step 1: 创建 notification DTO 文件**

```typescript
/**
 * File: notification.dto.ts
 * Description: 通知系统 DTO — 请求查询参数和响应结构的 Zod Schema
 */

import { z } from 'zod'

// ======================== 请求 Schema ========================

/** 通知列表查询参数 */
export const NotificationListQuerySchema = z.object({
  /** 分页游标（createdAt ISO 字符串） */
  cursor: z.string().nullable().optional(),
  /** 每页数量，默认 20，最大 50 */
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  /** 通知类型筛选（可选） */
  type: z.enum(['SYSTEM', 'COURSE', 'ACTIVITY', 'ORDER']).optional(),
})

/** 标记已读路径参数 */
export const NotificationReadParamsSchema = z.object({
  id: z.string().uuid(),
})

// ======================== 响应类型 ========================

/** 单条通知的响应结构 */
export const NotificationItemSchema = z.object({
  id: z.string(),
  type: z.enum(['SYSTEM', 'COURSE', 'ACTIVITY', 'ORDER']),
  title: z.string(),
  summary: z.string().nullable(),
  icon: z.string().nullable(),
  linkType: z.string().nullable(),
  linkId: z.string().nullable(),
  isRead: z.boolean(),
  createdAt: z.string(),
})

/** 通知列表响应 */
export const NotificationListResponseSchema = z.object({
  items: z.array(NotificationItemSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
})

/** 未读计数响应 */
export const UnreadCountResponseSchema = z.object({
  count: z.number(),
})

// ======================== TS 类型推导 ========================

export type NotificationListQuery = z.infer<typeof NotificationListQuerySchema>
export type NotificationReadParams = z.infer<typeof NotificationReadParamsSchema>
export type NotificationItem = z.infer<typeof NotificationItemSchema>
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>
export type UnreadCountResponse = z.infer<typeof UnreadCountResponseSchema>
```

- [ ] **Step 2: 提交**

```bash
git add apps/backend/src/contracts/dtos/notification.dto.ts
git commit -m "feat(notification): add notification DTO schemas"
```

---

## Task 3: Repository 接口 — Notification Interface

**Files:**
- Create: `apps/backend/src/repositories/interfaces/core/notification.interface.ts`

- [ ] **Step 1: 创建 Repository 接口**

```typescript
/**
 * File: notification.interface.ts
 * Description: 通知 Repository 接口定义
 */

import type { RepoContext } from '@/types/repo/repo-context'
import type { NotificationType } from '@/contracts/dtos/notification.dto'

/** 通知列表查询结果项 */
export type NotificationRow = {
  id: string
  type: NotificationType | string
  title: string
  summary: string | null
  icon: string | null
  linkType: string | null
  linkId: string | null
  isGlobal: boolean
  targetUser: string | null
  createdAt: string
  readAt: string | null // 如果在 notification_reads 中存在则为已读
}

/** 分页结果 */
export type PaginatedResult<T> = {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
}

export interface NotificationRepository {
  /** 获取用户通知列表（cursor 分页，合并全局+定向通知） */
  listByUser(ctx: RepoContext, params: {
    userId: string
    limit: number
    cursor: string | null
    type?: string
  }): Promise<PaginatedResult<NotificationRow>>

  /** 获取用户未读通知数量 */
  getUnreadCount(ctx: RepoContext, params: { userId: string }): Promise<number>

  /** 标记单条通知为已读 */
  markAsRead(ctx: RepoContext, params: { notificationId: string; userId: string }): Promise<void>

  /** 标记所有通知为已读（为每条未读通知创建 read 记录） */
  markAllAsRead(ctx: RepoContext, params: { userId: string }): Promise<number>

  /** 根据 ID 查找通知 */
  findById(ctx: RepoContext, params: { notificationId: string }): Promise<{ id: string; type: string } | null>
}
```

- [ ] **Step 2: 提交**

```bash
git add apps/backend/src/repositories/interfaces/core/notification.interface.ts
git commit -m "feat(notification): add NotificationRepository interface"
```

---

## Task 4: Repository 实现 — Prisma Notification Repo

**Files:**
- Create: `apps/backend/src/repositories/prisma/core/notification.repo.ts`

- [ ] **Step 1: 创建 Prisma Repository 实现**

```typescript
/**
 * File: notification.repo.ts
 * Description: 通知 Repository 的 Prisma 实现
 *
 * 核心查询策略:
 * - 使用 UNION 等价查询：(isGlobal=true OR targetUser=userId)
 * - LEFT JOIN notification_reads 判断已读状态
 * - cursor 基于 createdAt 降序分页
 */

import type { NotificationRepository, NotificationRow, PaginatedResult } from '@/repositories/interfaces/core/notification.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import { prisma } from '@/lib/prisma'

/** 转换数据库行为 DTO */
function transformRow(row: {
  id: string
  type: string
  title: string
  summary: string | null
  icon: string | null
  linkType: string | null
  linkId: string | null
  isGlobal: boolean
  targetUser: string | null
  createdAt: Date
  reads: Array<{ readAt: Date }>
}): NotificationRow {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    summary: row.summary,
    icon: row.icon,
    linkType: row.linkType,
    linkId: row.linkId,
    isGlobal: row.isGlobal,
    targetUser: row.targetUser,
    createdAt: row.createdAt.toISOString(),
    readAt: row.reads.length > 0 ? row.reads[0].readAt.toISOString() : null,
  }
}

export function createPrismaNotificationRepository(): NotificationRepository {
  return {
    async listByUser(ctx, params) {
      const { userId, limit, cursor, type } = params
      const safeLimit = Math.min(Math.max(limit, 1), 50)

      // WHERE 条件: 全局广播 或 指定用户
      const where: Record<string, unknown> = {
        isActive: true,
        OR: [
          { isGlobal: true },
          { targetUser: userId },
        ],
      }

      // 可选类型筛选
      if (type) {
        where.type = type
      }

      // cursor 条件: createdAt < cursorValue（降序分页）
      if (cursor) {
        where.createdAt = { lt: new Date(cursor) }
      }

      // take + 1 模式检测 hasMore
      const rows = await prisma.notification.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        take: safeLimit + 1,
        include: {
          reads: {
            where: { userId },
            select: { readAt: true },
          },
        },
      })

      const hasMore = rows.length > safeLimit
      const data = hasMore ? rows.slice(0, safeLimit) : rows

      return {
        items: data.map(transformRow),
        nextCursor: hasMore
          ? data[data.length - 1].createdAt.toISOString()
          : null,
        hasMore,
      }
    },

    async getUnreadCount(ctx, params) {
      const { userId } = params

      // 获取用户所有可见通知 ID
      const visibleNotifications = await prisma.notification.findMany({
        where: {
          isActive: true,
          OR: [
            { isGlobal: true },
            { targetUser: userId },
          ],
        },
        select: { id: true },
      })

      const visibleIds = visibleNotifications.map(n => n.id)
      if (visibleIds.length === 0) return 0

      // 已读通知 ID
      const readNotificationIds = await prisma.notificationRead.findMany({
        where: {
          userId,
          notificationId: { in: visibleIds },
        },
        select: { notificationId: true },
      })

      const readIdSet = new Set(readNotificationIds.map(r => r.notificationId))
      return visibleIds.filter(id => !readIdSet.has(id)).length
    },

    async markAsRead(ctx, params) {
      const { notificationId, userId } = params

      ctx.logger.info({ notificationId, userId }, 'Marking notification as read')

      await prisma.notificationRead.upsert({
        where: {
          notificationId_userId: { notificationId, userId },
        },
        create: {
          notificationId,
          userId,
        },
        update: {
          readAt: new Date(),
        },
      })
    },

    async markAllAsRead(ctx, params) {
      const { userId } = params

      // 获取用户所有可见但未读的通知
      const visibleNotifications = await prisma.notification.findMany({
        where: {
          isActive: true,
          OR: [
            { isGlobal: true },
            { targetUser: userId },
          ],
        },
        select: { id: true },
      })

      const visibleIds = visibleNotifications.map(n => n.id)
      if (visibleIds.length === 0) return 0

      // 获取已读 ID
      const readRecords = await prisma.notificationRead.findMany({
        where: {
          userId,
          notificationId: { in: visibleIds },
        },
        select: { notificationId: true },
      })

      const readIdSet = new Set(readRecords.map(r => r.notificationId))
      const unreadIds = visibleIds.filter(id => !readIdSet.has(id))

      if (unreadIds.length === 0) return 0

      // 批量创建 read 记录
      await prisma.notificationRead.createMany({
        data: unreadIds.map(notificationId => ({
          notificationId,
          userId,
        })),
        skipDuplicates: true,
      })

      ctx.logger.info({ userId, count: unreadIds.length }, 'Marked all notifications as read')
      return unreadIds.length
    },

    async findById(ctx, params) {
      const row = await prisma.notification.findUnique({
        where: { id: params.notificationId },
        select: { id: true, type: true },
      })
      return row
    },
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add apps/backend/src/repositories/prisma/core/notification.repo.ts
git commit -m "feat(notification): add Prisma notification repository"
```

---

## Task 5: Repository 工厂注册

**Files:**
- Create: `apps/backend/src/repositories/factory/core/notification.factory.ts`
- Modify: `apps/backend/src/repositories/factory/core/index.factory.ts`

- [ ] **Step 1: 创建工厂文件**

`apps/backend/src/repositories/factory/core/notification.factory.ts`:

```typescript
/**
 * File: notification.factory.ts
 * Description: 通知 Repository 工厂
 */

import type { NotificationRepository } from '@/repositories/interfaces/core/notification.interface'
import { createPrismaNotificationRepository } from '@/repositories/prisma/core/notification.repo'

export async function createNotificationRepository(): Promise<NotificationRepository> {
  return createPrismaNotificationRepository()
}
```

- [ ] **Step 2: 在 index.factory.ts 中追加导出**

在 `apps/backend/src/repositories/factory/core/index.factory.ts` 末尾追加：

```typescript
export * from './notification.factory'
```

- [ ] **Step 3: 提交**

```bash
git add apps/backend/src/repositories/factory/core/notification.factory.ts apps/backend/src/repositories/factory/core/index.factory.ts
git commit -m "feat(notification): register notification repository factory"
```

---

## Task 6: Service — 通知业务逻辑层

**Files:**
- Create: `apps/backend/src/services/core/notification.service.ts`

- [ ] **Step 1: 创建 Service**

```typescript
/**
 * File: notification.service.ts
 * Description: 通知业务逻辑 Service
 *
 * 遵循项目工厂函数 + DI 模式：
 * - Service 通过 Repository 接口访问数据
 * - RepoContext 传播 traceId + logger
 */

import type { NotificationRepository } from '@/repositories/interfaces/core/notification.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import type { NotificationListQuery, NotificationItem, UnreadCountResponse } from '@/contracts/dtos/notification.dto'

export function createNotificationService(
  deps: {
    notification: NotificationRepository
  },
  ctx: ServiceContext
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  return {
    /**
     * 获取用户通知列表（cursor 分页）
     *
     * 合并全局广播通知 + 定向通知，按 priority + createdAt 降序排列。
     * 通过 LEFT JOIN notification_reads 判断已读状态。
     */
    async listNotifications(userId: string, query: NotificationListQuery): Promise<{
      items: NotificationItem[]
      nextCursor: string | null
      hasMore: boolean
    }> {
      logger.info({ userId, limit: query.limit, type: query.type }, 'Listing notifications')

      const result = await deps.notification.listByUser(repoCtx, {
        userId,
        limit: query.limit,
        cursor: query.cursor ?? null,
        type: query.type,
      })

      // 转换为 DTO：isRead = readAt !== null
      const items: NotificationItem[] = result.items.map(row => ({
        id: row.id,
        type: row.type as NotificationItem['type'],
        title: row.title,
        summary: row.summary,
        icon: row.icon,
        linkType: row.linkType,
        linkId: row.linkId,
        isRead: row.readAt !== null,
        createdAt: row.createdAt,
      }))

      return {
        items,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      }
    },

    /**
     * 获取未读通知计数
     */
    async getUnreadCount(userId: string): Promise<UnreadCountResponse> {
      logger.info({ userId }, 'Getting unread notification count')

      const count = await deps.notification.getUnreadCount(repoCtx, { userId })

      return { count }
    },

    /**
     * 标记单条通知为已读
     *
     * 先验证通知存在，再创建/更新 read 记录。
     */
    async markAsRead(userId: string, notificationId: string): Promise<void> {
      logger.info({ userId, notificationId }, 'Marking notification as read')

      // 验证通知存在
      const notification = await deps.notification.findById(repoCtx, { notificationId })
      if (!notification) {
        logger.warn({ notificationId }, 'Notification not found')
        return // 幂等：不存在则忽略
      }

      await deps.notification.markAsRead(repoCtx, { notificationId, userId })
    },

    /**
     * 标记所有通知为已读
     *
     * 返回实际标记的数量（可能为 0）
     */
    async markAllAsRead(userId: string): Promise<{ markedCount: number }> {
      logger.info({ userId }, 'Marking all notifications as read')

      const markedCount = await deps.notification.markAllAsRead(repoCtx, { userId })

      return { markedCount }
    },
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add apps/backend/src/services/core/notification.service.ts
git commit -m "feat(notification): add notification service layer"
```

---

## Task 7: API 路由 — GET 通知列表

**Files:**
- Create: `apps/backend/src/app/api/v1/user/notifications/route.ts`

- [ ] **Step 1: 创建通知列表 API 路由**

```typescript
/**
 * File: route.ts
 * Description: GET /api/v1/user/notifications — 获取当前用户的通知列表（cursor 分页）
 */

import { ok } from '@/contracts/api-response.schema'
import { NotificationListQuerySchema } from '@/contracts/dtos/notification.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createNotificationRepository } from '@/repositories/factory'
import { createNotificationService } from '@/services/core/notification.service'
import type { NextRequest } from 'next/server'

/**
 * GET /api/v1/user/notifications
 *
 * 获取当前用户的通知列表，支持 cursor 分页和类型筛选。
 *
 * Query 参数:
 *   cursor - 分页游标（createdAt ISO 字符串），首次请求不传
 *   limit  - 每页数量，默认 20
 *   type   - 通知类型筛选: SYSTEM | COURSE | ACTIVITY | ORDER
 *
 * 响应:
 *   { success: true, data: { items, nextCursor, hasMore } }
 */
export const GET = withV1Route({
  requireAuth: true,
  action: 'user:notification:list',
  schemas: {
    query: NotificationListQuerySchema,
  },
  handler: async ({ req, serviceContext, userId, query }) => {
    const repo = await createNotificationRepository()
    const service = createNotificationService(
      { notification: repo },
      serviceContext,
    )

    const data = await service.listNotifications(userId!, query)

    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
```

- [ ] **Step 2: 提交**

```bash
git add apps/backend/src/app/api/v1/user/notifications/route.ts
git commit -m "feat(notification): add GET /user/notifications API route"
```

---

## Task 8: API 路由 — GET 未读计数

**Files:**
- Create: `apps/backend/src/app/api/v1/user/notifications/unread-count/route.ts`

- [ ] **Step 1: 创建未读计数 API 路由**

```typescript
/**
 * File: route.ts
 * Description: GET /api/v1/user/notifications/unread-count — 获取未读通知数量
 */

import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createNotificationRepository } from '@/repositories/factory'
import { createNotificationService } from '@/services/core/notification.service'
import type { NextRequest } from 'next/server'

/**
 * GET /api/v1/user/notifications/unread-count
 *
 * 获取当前用户的未读通知数量。
 * 首页铃铛图标红点通过此接口获取数据。
 *
 * 响应:
 *   { success: true, data: { count: number } }
 */
export const GET = withV1Route({
  requireAuth: true,
  action: 'user:notification:unread-count',
  handler: async ({ req, serviceContext, userId }) => {
    const repo = await createNotificationRepository()
    const service = createNotificationService(
      { notification: repo },
      serviceContext,
    )

    const data = await service.getUnreadCount(userId!)

    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
```

- [ ] **Step 2: 提交**

```bash
git add apps/backend/src/app/api/v1/user/notifications/unread-count/route.ts
git commit -m "feat(notification): add GET /user/notifications/unread-count API"
```

---

## Task 9: API 路由 — PUT 标记单条已读

**Files:**
- Create: `apps/backend/src/app/api/v1/user/notifications/[id]/read/route.ts`

- [ ] **Step 1: 创建标记已读 API 路由**

```typescript
/**
 * File: route.ts
 * Description: PUT /api/v1/user/notifications/:id/read — 标记单条通知为已读
 */

import { ok } from '@/contracts/api-response.schema'
import { NotificationReadParamsSchema } from '@/contracts/dtos/notification.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createNotificationRepository } from '@/repositories/factory'
import { createNotificationService } from '@/services/core/notification.service'
import type { NextRequest } from 'next/server'

/**
 * PUT /api/v1/user/notifications/:id/read
 *
 * 标记指定通知为已读（幂等操作）。
 *
 * 路径参数:
 *   id - 通知 ID (UUID)
 *
 * 响应:
 *   { success: true, data: { success: true } }
 */
export const PUT = withV1Route({
  requireAuth: true,
  action: 'user:notification:read',
  schemas: {
    params: NotificationReadParamsSchema,
  },
  handler: async ({ req, serviceContext, userId, params }) => {
    const repo = await createNotificationRepository()
    const service = createNotificationService(
      { notification: repo },
      serviceContext,
    )

    await service.markAsRead(userId!, params.id)

    return createJsonApiResponse(req, ok({ success: true }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
```

- [ ] **Step 2: 提交**

```bash
git add "apps/backend/src/app/api/v1/user/notifications/[id]/read/route.ts"
git commit -m "feat(notification): add PUT /user/notifications/:id/read API"
```

---

## Task 10: API 路由 — PUT 全部标记已读

**Files:**
- Create: `apps/backend/src/app/api/v1/user/notifications/read-all/route.ts`

- [ ] **Step 1: 创建全部标记已读 API 路由**

```typescript
/**
 * File: route.ts
 * Description: PUT /api/v1/user/notifications/read-all — 标记所有通知为已读
 */

import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createNotificationRepository } from '@/repositories/factory'
import { createNotificationService } from '@/services/core/notification.service'
import type { NextRequest } from 'next/server'

/**
 * PUT /api/v1/user/notifications/read-all
 *
 * 将当前用户所有未读通知标记为已读。
 * 幂等操作：如果没有未读通知，返回 markedCount: 0。
 *
 * 响应:
 *   { success: true, data: { markedCount: number } }
 */
export const PUT = withV1Route({
  requireAuth: true,
  action: 'user:notification:read-all',
  handler: async ({ req, serviceContext, userId }) => {
    const repo = await createNotificationRepository()
    const service = createNotificationService(
      { notification: repo },
      serviceContext,
    )

    const data = await service.markAllAsRead(userId!)

    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
```

- [ ] **Step 2: 提交**

```bash
git add apps/backend/src/app/api/v1/user/notifications/read-all/route.ts
git commit -m "feat(notification): add PUT /user/notifications/read-all API"
```

---

## Task 11: 小程序 — 通知 API 服务

**Files:**
- Create: `apps/miniprograms/wechat/src/services/api/notifications.ts`
- Modify: `apps/miniprograms/wechat/src/services/api/index.ts`

- [ ] **Step 1: 创建通知 API 服务**

`apps/miniprograms/wechat/src/services/api/notifications.ts`:

```typescript
/**
 * File: notifications.ts
 * Description: 通知 API 服务 — 对接后端通知相关接口
 *
 * 后端 API 端点:
 *   GET  /user/notifications              — 通知列表（cursor 分页）
 *   GET  /user/notifications/unread-count  — 未读计数
 *   PUT  /user/notifications/:id/read      — 标记单条已读
 *   PUT  /user/notifications/read-all      — 全部标记已读
 */

import { httpClient } from '../../core/http-client'
import { logger } from '../../utils/logger'

// ======================== 类型定义 ========================

/** 通知类型 */
export type NotificationType = 'SYSTEM' | 'COURSE' | 'ACTIVITY' | 'ORDER'

/** 单条通知 */
export interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  summary: string | null
  icon: string | null
  linkType: string | null
  linkId: string | null
  isRead: boolean
  createdAt: string
}

/** 通知列表响应 */
export interface NotificationListResponse {
  items: NotificationItem[]
  nextCursor: string | null
  hasMore: boolean
}

/** 未读计数响应 */
export interface UnreadCountResponse {
  count: number
}

/** 全部已读响应 */
export interface ReadAllResponse {
  markedCount: number
}

/** 通知列表查询参数 */
export interface NotificationListParams {
  cursor?: string | null
  limit?: number
  type?: NotificationType
}

// ======================== API 服务 ========================

export const notificationService = {
  /**
   * 获取通知列表（cursor 分页）
   */
  async list(params: NotificationListParams = {}): Promise<NotificationListResponse> {
    logger.info('获取通知列表', params)

    const queryParams: Record<string, string | number> = {}
    if (params.cursor) queryParams.cursor = params.cursor
    if (params.limit) queryParams.limit = params.limit
    if (params.type) queryParams.type = params.type

    const result = await httpClient.get<NotificationListResponse>(
      '/user/notifications',
      queryParams
    )
    return result
  },

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    logger.info('获取未读通知数量')

    const result = await httpClient.get<UnreadCountResponse>(
      '/user/notifications/unread-count'
    )
    return result
  },

  /**
   * 标记单条通知为已读
   */
  async markAsRead(notificationId: string): Promise<void> {
    logger.info('标记通知已读', { notificationId })

    await httpClient.put(`/user/notifications/${notificationId}/read`)
  },

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(): Promise<ReadAllResponse> {
    logger.info('标记所有通知为已读')

    const result = await httpClient.put<ReadAllResponse>(
      '/user/notifications/read-all'
    )
    return result
  },
}
```

- [ ] **Step 2: 在 services/api/index.ts 中注册**

在 `apps/miniprograms/wechat/src/services/api/index.ts` 的 import 区域追加：

```typescript
// 通知服务
import { notificationService as _notificationService } from './notifications';
export { notificationService } from './notifications';
export type { NotificationItem, NotificationListResponse, UnreadCountResponse, NotificationType } from './notifications';
```

在 `api` 对象中追加：

```typescript
  notification: _notificationService,
```

- [ ] **Step 3: 提交**

```bash
git add apps/miniprograms/wechat/src/services/api/notifications.ts apps/miniprograms/wechat/src/services/api/index.ts
git commit -m "feat(notification): add notification API service for miniprogram"
```

---

## Task 12: 小程序 — 注册通知页面路由

**Files:**
- Modify: `apps/miniprograms/wechat/src/pages.json`

- [ ] **Step 1: 在 pages.json 的 subPackages 中追加通知子包**

在 `subPackages` 数组末尾（`about` 子包之后）追加：

```json
{
  "root": "subpackages/notifications",
  "name": "notifications",
  "pages": [
    {
      "path": "index",
      "style": {
        "navigationBarTitleText": "通知中心",
        "navigationStyle": "custom",
        "enablePullDownRefresh": true
      }
    }
  ]
}
```

同时更新 `preloadRule`，在 `pages/index/index` 条目中追加 `"notifications"` 到 `packages` 数组：

```json
"pages/index/index": {
  "network": "all",
  "packages": ["search", "notifications"]
}
```

- [ ] **Step 2: 提交**

```bash
git add apps/miniprograms/wechat/src/pages.json
git commit -m "feat(notification): register notifications subpackage route"
```

---

## Task 13: 小程序 — 通知中心页面

**Files:**
- Create: `apps/miniprograms/wechat/src/subpackages/notifications/index.vue`

- [ ] **Step 1: 创建通知中心页面组件**

创建目录 `apps/miniprograms/wechat/src/subpackages/notifications/` 并创建 `index.vue`：

```vue
<template>
  <view class="notifications-page">
    <!-- 自定义导航栏 -->
    <NavBar title="通知中心" :show-back="true" bg-color="#FFFFFF" />

    <!-- 筛选标签 -->
    <view class="filter-tabs">
      <scroll-view scroll-x class="tabs-scroll">
        <view
          v-for="tab in tabs"
          :key="tab.value"
          class="tab-item"
          :class="{ active: activeTab === tab.value }"
          @tap="switchTab(tab.value)"
        >
          <text class="tab-text" :class="{ 'tab-text-active': activeTab === tab.value }">
            {{ tab.label }}
          </text>
          <view v-if="activeTab === tab.value" class="tab-indicator" />
        </view>
      </scroll-view>
    </view>

    <!-- 通知列表 -->
    <scroll-view
      scroll-y
      class="notification-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
    >
      <!-- 空状态 -->
      <view v-if="!loading && notifications.length === 0" class="empty-state">
        <text class="empty-icon">🔔</text>
        <text class="empty-text">暂无通知</text>
      </view>

      <!-- 通知列表项 -->
      <view
        v-for="item in notifications"
        :key="item.id"
        class="notification-card"
        :class="{ unread: !item.isRead }"
        @tap="onNotificationTap(item)"
      >
        <!-- 未读指示点 -->
        <view v-if="!item.isRead" class="unread-dot" />

        <!-- 类型图标 -->
        <view class="icon-wrapper" :class="`icon-${item.type.toLowerCase()}`">
          <text class="type-icon">{{ getTypeIcon(item.type) }}</text>
        </view>

        <!-- 内容 -->
        <view class="notification-content">
          <text class="notification-title">{{ item.title }}</text>
          <text v-if="item.summary" class="notification-summary">{{ item.summary }}</text>
          <text class="notification-time">{{ formatTime(item.createdAt) }}</text>
        </view>
      </view>

      <!-- 加载状态 -->
      <view class="loading-footer">
        <text v-if="loadingMore" class="loading-text">加载中...</text>
        <text v-else-if="!hasMore && notifications.length > 0" class="loading-text">没有更多了</text>
      </view>
    </scroll-view>

    <!-- 全部已读按钮 -->
    <view v-if="notifications.length > 0" class="mark-all-btn" @tap="onMarkAllRead">
      <text class="mark-all-text">全部标为已读</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { notificationService } from '@/services/api/notifications'
import type { NotificationItem, NotificationType } from '@/services/api/notifications'
import { useAuth } from '@/composables/useAuth'

// ======================== 认证状态 ========================

const auth = useAuth()

// ======================== Tab 配置 ========================

const tabs = [
  { label: '全部', value: '' },
  { label: '课程', value: 'COURSE' },
  { label: '系统', value: 'SYSTEM' },
  { label: '活动', value: 'ACTIVITY' },
  { label: '订单', value: 'ORDER' },
]

const activeTab = ref('')

// ======================== 分页状态 ========================

const notifications = ref<NotificationItem[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const isRefreshing = ref(false)
const nextCursor = ref<string | null>(null)
const hasMore = ref(false)

// ======================== 数据加载 ========================

/** 加载通知列表（首页或切换 Tab） */
async function loadNotifications(append = false) {
  if (!auth.isLoggedIn.value) return

  if (!append) {
    loading.value = true
    nextCursor.value = null
  } else {
    loadingMore.value = true
  }

  try {
    const result = await notificationService.list({
      cursor: append ? nextCursor.value : null,
      limit: 20,
      type: (activeTab.value || undefined) as NotificationType | undefined,
    })

    if (append) {
      notifications.value.push(...result.items)
    } else {
      notifications.value = result.items
    }

    nextCursor.value = result.nextCursor
    hasMore.value = result.hasMore
  } catch (error) {
    console.error('加载通知失败:', error)
  } finally {
    loading.value = false
    loadingMore.value = false
    isRefreshing.value = false
  }
}

/** 加载更多（滚动到底部） */
async function loadMore() {
  if (!hasMore.value || loadingMore.value || loading.value) return
  await loadNotifications(true)
}

/** 下拉刷新 */
async function onRefresh() {
  isRefreshing.value = true
  await loadNotifications(false)
}

/** 切换 Tab */
function switchTab(value: string) {
  activeTab.value = value
  loadNotifications(false)
}

// ======================== 交互 ========================

/** 点击通知：标记已读 + 跳转 */
async function onNotificationTap(item: NotificationItem) {
  // 标记已读
  if (!item.isRead) {
    item.isRead = true
    try {
      await notificationService.markAsRead(item.id)
    } catch {
      item.isRead = false // 回滚
    }
  }

  // TODO: 根据 linkType/linkId 跳转到对应页面
  // 例如: COURSE → 课程详情, ORDER → 订单详情
}

/** 全部标记已读 */
async function onMarkAllRead() {
  try {
    const result = await notificationService.markAllAsRead()
    // 批量更新本地状态
    notifications.value.forEach(n => { n.isRead = true })
    uni.showToast({ title: `已标记 ${result.markedCount} 条`, icon: 'none' })
  } catch (error) {
    console.error('标记全部已读失败:', error)
  }
}

// ======================== 工具函数 ========================

/** 获取通知类型图标 */
function getTypeIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    COURSE: '📚',
    SYSTEM: '🔔',
    ACTIVITY: '🎁',
    ORDER: '📦',
  }
  return icons[type] || '🔔'
}

/** 格式化时间 */
function formatTime(createdAt: string): string {
  const date = new Date(createdAt)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  if (days < 30) return `${Math.floor(days / 7)} 周前`

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ======================== 生命周期 ========================

onMounted(() => {
  loadNotifications(false)
})
</script>

<style scoped>
/* 页面容器 */
.notifications-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #F5F7F6;
}

/* 筛选标签 */
.filter-tabs {
  background-color: #FFFFFF;
  border-bottom: 1rpx solid #E2EBED;
}

.tabs-scroll {
  white-space: nowrap;
  padding: 0 20rpx;
}

.tab-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 24rpx;
  position: relative;
}

.tab-text {
  font-size: 28rpx;
  color: #6B8A94;
  font-weight: 400;
}

.tab-text-active {
  color: #009666;
  font-weight: 600;
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 24rpx;
  right: 24rpx;
  height: 4rpx;
  background-color: #009666;
  border-radius: 2rpx;
}

/* 通知列表 */
.notification-list {
  flex: 1;
  padding: 24rpx 32rpx;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #94A8B0;
}

/* 通知卡片 */
.notification-card {
  display: flex;
  align-items: flex-start;
  padding: 28rpx;
  gap: 24rpx;
  background-color: #FFFFFF;
  border-radius: 24rpx;
  border: 2rpx solid #E2EBED;
  margin-bottom: 20rpx;
  position: relative;
}

.notification-card.unread {
  background-color: #FFFFFF;
}

/* 未读圆点 */
.unread-dot {
  position: absolute;
  top: 28rpx;
  right: 28rpx;
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background-color: #009666;
}

/* 类型图标 */
.icon-wrapper {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-course { background-color: #E8F7F0; }
.icon-system { background-color: #F0F5F4; }
.icon-activity { background-color: #FEF3C7; }
.icon-order { background-color: #E0F2FE; }

.type-icon {
  font-size: 36rpx;
}

/* 通知内容 */
.notification-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
  padding-right: 20rpx;
}

.notification-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A2E35;
  line-height: 40rpx;
}

.notification-summary {
  font-size: 26rpx;
  color: #6B8A94;
  line-height: 36rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-time {
  font-size: 22rpx;
  color: #94A8B0;
  margin-top: 4rpx;
}

/* 加载状态 */
.loading-footer {
  padding: 32rpx 0;
  text-align: center;
}

.loading-text {
  font-size: 24rpx;
  color: #94A8B0;
}

/* 全部已读按钮 */
.mark-all-btn {
  padding: 32rpx 0 48rpx;
  text-align: center;
}

.mark-all-text {
  font-size: 26rpx;
  color: #6B8A94;
}
</style>
```

- [ ] **Step 2: 提交**

```bash
git add apps/miniprograms/wechat/src/subpackages/notifications/index.vue
git commit -m "feat(notification): add notification center page for miniprogram"
```

---

## Task 14: 小程序 — 连接首页通知按钮

**Files:**
- Modify: `apps/miniprograms/wechat/src/pages/index/index.vue`

- [ ] **Step 1: 替换 goToNotifications 占位方法**

在 `apps/miniprograms/wechat/src/pages/index/index.vue` 中找到（约第 752 行）：

```typescript
const goToNotifications = () => {
  uni.showToast({ title: '通知功能开发中', icon: 'none' })
}
```

替换为：

```typescript
const goToNotifications = () => {
  if (!auth.isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/subpackages/notifications/index' })
}
```

- [ ] **Step 2: 提交**

```bash
git add apps/miniprograms/wechat/src/pages/index/index.vue
git commit -m "feat(notification): connect home page bell button to notification center"
```

---

## Task 15: Prisma 迁移 + 生成

**Files:** 无新文件（运行迁移命令）

- [ ] **Step 1: 生成 Prisma 客户端**

Run: `cd apps/backend && bunx prisma generate`
Expected: 成功输出，Notification / NotificationRead 类型可用

- [ ] **Step 2: 创建数据库迁移（开发环境）**

Run: `cd apps/backend && bunx prisma db push`
Expected: 成功在数据库中创建 notifications 和 notification_reads 表

- [ ] **Step 3: 验证后端编译**

Run: `cd apps/backend && bunx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 4: 提交迁移文件（如果有）**

```bash
git add apps/backend/prisma/
git commit -m "chore(notification): generate Prisma migration for notification tables"
```

---

## Task 16: 验收测试

- [ ] **Step 1: 启动后端开发服务**

Run: `make dev-backend`

- [ ] **Step 2: 手动测试 API 端点**

使用 curl 或 HTTP 客户端测试：

```bash
# 获取通知列表（需替换 TOKEN）
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/v1/user/notifications?limit=10

# 获取未读计数
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/v1/user/notifications/unread-count

# 全部标记已读
curl -X PUT -H "Authorization: Bearer TOKEN" http://localhost:3000/api/v1/user/notifications/read-all
```

- [ ] **Step 3: 编译并启动小程序**

Run: `make watch-wechat`

- [ ] **Step 4: 在微信开发者工具中验证**

1. 打开首页 → 点击右上角铃铛图标 → 应跳转到通知中心页面
2. 通知中心应显示筛选标签（全部/课程/系统/活动）
3. 下拉刷新应正常工作
4. 滚动到底部应触发加载更多
5. 点击通知条目应标记已读
6. 点击"全部标为已读"应更新所有通知状态

- [ ] **Step 5: 最终提交**

```bash
git add -A
git commit -m "feat(notification): complete notification center feature"
```

---

## 自检清单

| 需求 | 对应 Task |
|------|-----------|
| Notification 数据库模型 | Task 1 |
| Cursor 分页 API | Task 4, Task 7 |
| 未读计数 API | Task 8 |
| 标记单条已读 API | Task 9 |
| 全部标记已读 API | Task 10 |
| 通知 Service 层 | Task 6 |
| Repository 接口+实现 | Task 3, Task 4 |
| 小程序通知 API 服务 | Task 11 |
| 通知中心页面（筛选、无限滚动） | Task 13 |
| 首页铃铛按钮连接 | Task 14 |
| 分包路由注册 | Task 12 |
| Prisma 迁移 | Task 15 |
| 验收测试 | Task 16 |
