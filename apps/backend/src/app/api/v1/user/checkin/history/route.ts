import type { NextRequest } from 'next/server'
import { ok, fail } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createCheckinRepository } from '@/repositories/factory'
import { createCheckinService, CheckinError } from '@/services/core/checkin.service'

/** GET /api/v1/user/checkin/history — 获取月度签到历史 (query: month=YYYY-MM) */
export const GET = withV1Route({
  requireAuth: true,
  action: 'user_checkin:history',
  schemas: {},
  handler: async ({ req, serviceContext, userId }) => {
    const month = req.nextUrl.searchParams.get('month')
    if (!month) {
      return createJsonApiResponse(req, fail('INVALID_INPUT', '缺少 month 参数'), { status: 400 })
    }

    try {
      const service = createCheckinService(
        { checkin: await createCheckinRepository() },
        serviceContext,
      )
      const history = await service.getHistory(userId, month)
      return createJsonApiResponse(req, ok(history))
    } catch (error) {
      if (error instanceof CheckinError && error.code === 'INVALID_MONTH') {
        return createJsonApiResponse(req, fail('INVALID_MONTH', error.message), { status: 400 })
      }
      throw error
    }
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
