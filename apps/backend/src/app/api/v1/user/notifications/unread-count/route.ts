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
