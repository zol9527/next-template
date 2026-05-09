/**
 * File: src/app/api/v1/user/mfa/disable/route.ts
 * Description: MFA 禁用 API
 */

import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { MfaDisableRequestSchema, MfaDisableResponseSchema } from '@/contracts/dtos/mfa/mfa-disable.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMfaRepository, createUserRepository } from '@/repositories/factory'
import { MfaService } from '@/services/core/mfa.service'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import type { z } from 'zod'

export const POST = withV1Route({
  action: 'mfa:disable',
  requireAuth: true,
  schemas: { body: MfaDisableRequestSchema },
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
    const userRepo = await createUserRepository()
    const clientIp = extractClientIpSafe(req, { requireIp: false }).ip ?? '0.0.0.0'
    const userAgent = req.headers.get('user-agent')

    const success = await MfaService.disableMFA(
      userId!,
      body!,
      { mfa: mfaRepo, user: userRepo },
      serviceContext,
      clientIp,
      userAgent ?? undefined
    )

    const response: z.infer<typeof MfaDisableResponseSchema> = { disabled: success }
    return createJsonApiResponse(req, ok(response))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
