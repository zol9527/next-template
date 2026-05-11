/**
 * File: route.ts
 * Description: GET /api/v1/user/notifications/:id — 获取通知详情
 */

import { ok, fail } from '@/contracts/api-response.schema'
import { NotificationReadParamsSchema } from '@/contracts/dtos/notification.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createNotificationRepository } from '@/repositories/factory'
import { createNotificationService } from '@/services/core/notification.service'
import type { NextRequest } from 'next/server'

export const GET = withV1Route({
  requireAuth: true,
  action: 'user:notification:detail',
  schemas: {
    params: NotificationReadParamsSchema,
  },
  handler: async ({ req, serviceContext, userId, params }) => {
    const repo = await createNotificationRepository()
    const service = createNotificationService(
      { notification: repo },
      serviceContext,
    )

    const detail = await service.getNotificationDetail(userId!, params.id)
    if (!detail) {
      return createJsonApiResponse(req, fail('NOT_FOUND', '通知不存在'))
    }

    return createJsonApiResponse(req, ok(detail))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
