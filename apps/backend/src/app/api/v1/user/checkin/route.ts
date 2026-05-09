import type { NextRequest } from 'next/server'
import { ok, fail } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createCheckinRepository } from '@/repositories/factory'
import { createCheckinService, CheckinError } from '@/services/core/checkin.service'

/**
 * POST /api/v1/user/checkin — 每日签到
 *
 * CheckinError 不是 AppError 子类，withV1Route 无法自动映射，
 * 因此在 handler 内手动捕获并转换为对应 HTTP 状态码。
 */
export const POST = withV1Route({
  requireAuth: true,
  action: 'user_checkin:create',
  schemas: {},
  handler: async ({ req, serviceContext, userId }) => {
    try {
      const service = createCheckinService(
        { checkin: await createCheckinRepository() },
        serviceContext,
      )
      const result = await service.checkin(userId)
      return createJsonApiResponse(req, ok(result))
    } catch (error) {
      if (error instanceof CheckinError && error.code === 'ALREADY_CHECKED_IN') {
        return createJsonApiResponse(req, fail('ALREADY_CHECKED_IN', error.message), { status: 409 })
      }
      throw error
    }
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
