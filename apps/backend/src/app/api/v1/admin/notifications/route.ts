/**
 * File: route.ts
 * Description: GET/POST /api/v1/admin/notifications — 管理员通知列表/创建
 */

import { ok } from '@/contracts/api-response.schema'
import { AdminNotificationListQuerySchema, CreateNotificationRequestSchema } from '@/contracts/dtos/admin/notification.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'

/**
 * GET /api/v1/admin/notifications
 * 管理员获取通知列表（cursor 分页）
 */
export const GET = withV1Route({
  requireAccess: { action: 'read', scope: 'notifications' },
  action: 'admin:notification:list',
  schemas: {
    query: AdminNotificationListQuerySchema,
  },
  handler: async ({ req, query }) => {
    const safeLimit = Math.min(Math.max(query.limit, 1), 50)

    const where: Record<string, unknown> = {}
    if (query.type) where.type = query.type
    if (query.isActive !== undefined) where.isActive = query.isActive

    const findManyArgs = {
      where,
      orderBy: [{ priority: 'desc' as const }, { createdAt: 'desc' as const }],
      take: safeLimit + 1,
      include: {
        _count: { select: { reads: true } },
      },
    }

    if (query.cursor) {
      Object.assign(findManyArgs, { cursor: { id: query.cursor }, skip: 1 })
    }

    const rows = await prisma.notification.findMany(findManyArgs as Parameters<typeof prisma.notification.findMany>[0])

    const hasMore = rows.length > safeLimit
    const items = (hasMore ? rows.slice(0, safeLimit) : rows).map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      summary: row.summary,
      icon: row.icon,
      isGlobal: row.isGlobal,
      targetUser: row.targetUser,
      priority: row.priority,
      isActive: row.isActive,
      readCount: (row as unknown as { _count: { reads: number } })._count.reads,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))

    return createJsonApiResponse(req, ok({
      items,
      nextCursor: hasMore ? rows[safeLimit - 1].id : null,
      hasMore,
    }))
  },
})

/**
 * POST /api/v1/admin/notifications
 * 管理员创建通知
 */
export const POST = withV1Route({
  requireAccess: { action: 'write', scope: 'notifications' },
  action: 'admin:notification:create',
  schemas: {
    body: CreateNotificationRequestSchema,
  },
  handler: async ({ req, body }) => {
    const parsed = body!
    const notification = await prisma.notification.create({
      data: {
        type: parsed.type,
        title: parsed.title,
        content: parsed.content,
        summary: parsed.summary ?? null,
        icon: parsed.icon ?? null,
        linkType: parsed.linkType ?? null,
        linkId: parsed.linkId ?? null,
        isGlobal: parsed.isGlobal,
        targetUser: parsed.targetUser ?? null,
        priority: parsed.priority,
        isActive: parsed.isActive,
      },
    })

    return createJsonApiResponse(req, ok({
      id: notification.id,
      title: notification.title,
      createdAt: notification.createdAt.toISOString(),
    }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
