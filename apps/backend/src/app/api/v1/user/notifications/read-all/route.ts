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
