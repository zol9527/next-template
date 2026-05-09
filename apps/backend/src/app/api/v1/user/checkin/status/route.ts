import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createCheckinRepository } from '@/repositories/factory'
import { createCheckinService } from '@/services/core/checkin.service'

/** GET /api/v1/user/checkin/status — 获取签到状态 */
export const GET = withV1Route({
  requireAuth: true,
  action: 'user_checkin:status',
  schemas: {},
  handler: async ({ req, serviceContext, userId }) => {
    const service = createCheckinService(
      { checkin: await createCheckinRepository() },
      serviceContext,
    )
    const status = await service.getStatus(userId)
    return createJsonApiResponse(req, ok(status))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
