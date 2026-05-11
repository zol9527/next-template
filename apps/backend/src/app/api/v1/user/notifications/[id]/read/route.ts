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
