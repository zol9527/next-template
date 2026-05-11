/**
 * File: route.ts
 * Description: GET/PUT/DELETE /api/v1/admin/notifications/:id — 单条通知管理
 */

import { ok, fail } from '@/contracts/api-response.schema'
import { AdminNotificationParamsSchema, UpdateNotificationRequestSchema } from '@/contracts/dtos/admin/notification.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'

/**
 * GET /api/v1/admin/notifications/:id
 */
export const GET = withV1Route({
  requireAccess: { action: 'read', scope: 'notifications' },
  action: 'admin:notification:get',
  schemas: { params: AdminNotificationParamsSchema },
  handler: async ({ req, params }) => {
    const row = await prisma.notification.findUnique({
      where: { id: params.id },
      include: { _count: { select: { reads: true } } },
    })

    if (!row) {
      return createJsonApiResponse(req, fail('NOT_FOUND', '通知不存在'), { status: 404 })
    }

    return createJsonApiResponse(req, ok({
      id: row.id,
      type: row.type,
      title: row.title,
      content: row.content,
      summary: row.summary,
      icon: row.icon,
      linkType: row.linkType,
      linkId: row.linkId,
      isGlobal: row.isGlobal,
      targetUser: row.targetUser,
      priority: row.priority,
      isActive: row.isActive,
      readCount: row._count.reads,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))
  },
})

/**
 * PUT /api/v1/admin/notifications/:id
 */
export const PUT = withV1Route({
  requireAccess: { action: 'write', scope: 'notifications' },
  action: 'admin:notification:update',
  schemas: { params: AdminNotificationParamsSchema, body: UpdateNotificationRequestSchema },
  handler: async ({ req, params, body }) => {
    const existing = await prisma.notification.findUnique({ where: { id: params.id } })
    if (!existing) {
      return createJsonApiResponse(req, fail('NOT_FOUND', '通知不存在'), { status: 404 })
    }

    const parsed = body!
    // 过滤掉 undefined 值，只传递实际提供的字段
    const data: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined) {
        data[key] = value
      }
    }

    const updated = await prisma.notification.update({
      where: { id: params.id },
      data,
    })

    return createJsonApiResponse(req, ok({
      id: updated.id,
      title: updated.title,
      updatedAt: updated.updatedAt.toISOString(),
    }))
  },
})

/**
 * DELETE /api/v1/admin/notifications/:id
 */
export const DELETE = withV1Route({
  requireAccess: { action: 'write', scope: 'notifications' },
  action: 'admin:notification:delete',
  schemas: { params: AdminNotificationParamsSchema },
  handler: async ({ req, params }) => {
    const existing = await prisma.notification.findUnique({ where: { id: params.id } })
    if (!existing) {
      return createJsonApiResponse(req, fail('NOT_FOUND', '通知不存在'), { status: 404 })
    }

    await prisma.notification.delete({ where: { id: params.id } })

    return createJsonApiResponse(req, ok({ success: true }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
