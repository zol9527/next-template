/**
 * File: src/app/api/v1/user/mfa/status/route.ts
 * Description: MFA 状态 API - 获取当前用户的 MFA 状态
 */

import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { MfaStatusResponseSchema } from '@/contracts/dtos/mfa/mfa-status.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMfaRepository } from '@/repositories/factory'
import { MfaService } from '@/services/core/mfa.service'
import type { z } from 'zod'

export const GET = withV1Route({
  action: 'mfa:get_status',
  requireAuth: true,
  handler: async ({ req, userId, serviceContext }) => {
    const mfaRepo = await createMfaRepository()

    const status = await MfaService.getMFAStatus(
      userId!,
      mfaRepo,
      serviceContext
    )

    const response: z.infer<typeof MfaStatusResponseSchema> = {
      enabled: status.enabled,
      setupAt: status.setupAt?.toISOString() ?? null,
    }

    return createJsonApiResponse(req, ok(response))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
