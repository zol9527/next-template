/**
 * File: src/app/api/v1/user/mfa/setup/route.ts
 * Description: MFA 设置 API - 生成 TOTP 密钥、QR Code 和备份码
 */

import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { MfaSetupResponseSchema } from '@/contracts/dtos/mfa/mfa-setup.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMfaRepository } from '@/repositories/factory'
import { MfaService } from '@/services/core/mfa.service'
import type { z } from 'zod'

export const POST = withV1Route({
  action: 'mfa:setup',
  requireAuth: true,
  rateLimit: {
    max: 5,
    windowMs: 60_000,
    network: {
      max: 20,
      windowMs: 60_000,
    },
    message: '请求过多，请稍后再试',
  },
  handler: async ({ req, userId, serviceContext }) => {
    const mfaRepo = await createMfaRepository()
    const auth = await (await import('@/app/api/v1/_shared/use-api-auth')).useApiAuth(req, serviceContext)
    const me = await auth.getMe()

    const result = await MfaService.setupMFA(
      userId!,
      me.user.email ?? 'unknown@example.com',
      mfaRepo,
      serviceContext
    )

    const response: z.infer<typeof MfaSetupResponseSchema> = {
      secret: result.secret,
      qrCode: result.qrCode,
      backupCodes: result.backupCodes,
    }

    return createJsonApiResponse(req, ok(response))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
