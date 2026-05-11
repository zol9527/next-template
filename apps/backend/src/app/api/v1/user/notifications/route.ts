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
