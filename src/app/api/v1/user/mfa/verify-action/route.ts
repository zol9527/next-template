/**
 * File: src/app/api/v1/user/mfa/verify-action/route.ts
 * Description: MFA 操作验证 API - 验证敏感操作前的 MFA 验证码，生成一次性 action token
 */

import type { NextRequest } from 'next/server'
import { ok, fail } from '@/contracts/api-response.schema'
import { MfaVerifyActionRequestSchema, MfaVerifyActionResponseSchema } from '@/contracts/dtos/mfa/mfa-verify-action.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMfaRepository } from '@/repositories/factory'
import { MfaService } from '@/services/core/mfa.service'
import { MfaActionTokenService } from '@/services/core/mfa-action-token.service'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import type { z } from 'zod'

export const POST = withV1Route({
  action: 'mfa:verify_action',
  requireAuth: true,
  schemas: { body: MfaVerifyActionRequestSchema },
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
    const { token, action, resourceId } = body!
    const clientIp = extractClientIpSafe(req, { requireIp: false }).ip ?? '0.0.0.0'
    const userAgent = req.headers.get('user-agent')

    const mfaRepo = await createMfaRepository()

    // 验证 MFA 验证码
    const isValid = await MfaService.verifyMFA(
      userId!,
      token,
      mfaRepo,
      serviceContext,
      clientIp,
      userAgent ?? undefined
    )

    if (!isValid) {
      return createJsonApiResponse(req, fail('INVALID_CREDENTIALS', '无效的验证码'), { status: 401 })
    }

    // 生成操作令牌
    const tokenData = MfaActionTokenService.generateToken({
      userId: userId!,
      action,
      resourceId,
    })

    // 存储到数据库
    await mfaRepo.createActionToken(serviceContext, {
      tokenHash: tokenData.tokenHash,
      userId: userId!,
      action,
      resourceId: resourceId ?? null,
      expiresAt: tokenData.expiresAt,
    })

    const response: z.infer<typeof MfaVerifyActionResponseSchema> = {
      actionToken: tokenData.token,
      expiresAt: tokenData.expiresAt.toISOString(),
    }

    return createJsonApiResponse(req, ok(response))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
