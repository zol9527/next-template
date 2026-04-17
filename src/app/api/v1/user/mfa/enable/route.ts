/**
 * File: src/app/api/v1/user/mfa/enable/route.ts
 * Description: MFA 启用 API
 */

import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { MfaEnableRequestSchema, MfaEnableResponseSchema } from '@/contracts/dtos/mfa/mfa-enable.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMfaRepository } from '@/repositories/factory'
import { MfaService } from '@/services/core/mfa.service'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import type { z } from 'zod'

export const POST = withV1Route({
  action: 'mfa:enable',
  requireAuth: true,
  schemas: { body: MfaEnableRequestSchema },
  rateLimit: {
    max: 5,
    windowMs: 60_000,
    network: {
      max: 20,
      windowMs: 60_000,
    },
    message: '请求过多，请稍后再试',
  },
  handler: async ({ req, userId, body, serviceContext }) => {
    const mfaRepo = await createMfaRepository()
    const clientIp = extractClientIpSafe(req, { requireIp: false }).ip ?? '0.0.0.0'
    const userAgent = req.headers.get('user-agent')

    const success = await MfaService.enableMFA(
      userId!,
      body!,
      mfaRepo,
      serviceContext,
      clientIp,
      userAgent ?? undefined
    )

    const response: z.infer<typeof MfaEnableResponseSchema> = { enabled: success }
    return createJsonApiResponse(req, ok(response))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
