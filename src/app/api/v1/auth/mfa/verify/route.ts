/**
 * File: src/app/api/v1/auth/mfa/verify/route.ts
 * Description: MFA 验证 API（登录第二步）
 */

import type { NextRequest } from 'next/server'
import { ok, fail } from '@/contracts/api-response.schema'
import { MfaVerifyRequestSchema, MfaVerifyResponseSchema } from '@/contracts/dtos/mfa/mfa-verify.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMfaRepository } from '@/repositories/factory'
import { MfaService } from '@/services/core/mfa.service'
import { createAuth } from '@/app/api/v1/auth/auth-deps'
import { appendAuthCookies } from '@/lib/http'
import { MFA_PENDING_TOKEN_COOKIE } from '@/lib/constants/token'
import { TokenManager } from '@/lib/security/token-manager'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import type { z } from 'zod'

export const POST = withV1Route({
  action: 'auth:mfa_verify',
  schemas: { body: MfaVerifyRequestSchema },
  rateLimit: {
    max: 5,
    windowMs: 60_000,
    identity: ({ body }) => body?.userId ?? null,
    network: {
      max: 20,
      windowMs: 60_000,
    },
    message: '请求过多，请稍后再试',
  },
  handler: async ({ req, body, serviceContext }) => {
    const { userId, token } = body!
    const clientIp = extractClientIpSafe(req, { requireIp: false }).ip ?? '0.0.0.0'
    const userAgent = req.headers.get('user-agent')

    const mfaRepo = await createMfaRepository()

    // 验证 MFA Pending Token
    const mfaPendingToken = req.cookies.get(MFA_PENDING_TOKEN_COOKIE)?.value
    if (!mfaPendingToken) {
      return createJsonApiResponse(req, fail('UNAUTHORIZED', 'MFA session expired or invalid'), { status: 401 })
    }

    try {
      const payload = await TokenManager.verifyMfaToken(mfaPendingToken)
      if (payload.sub !== userId) {
        throw new Error('User mismatch')
      }
    } catch {
      return createJsonApiResponse(req, fail('UNAUTHORIZED', 'Invalid MFA session'), { status: 401 })
    }

    // 验证 MFA 验证码
    const isValid = await MfaService.verifyMFA(
      userId,
      token,
      mfaRepo,
      serviceContext,
      clientIp,
      userAgent ?? undefined
    )

    if (!isValid) {
      return createJsonApiResponse(req, fail('INVALID_CREDENTIALS', '无效的验证码'), { status: 401 })
    }

    // 验证成功，颁发令牌
    const auth = await createAuth(serviceContext)
    const loginResult = await auth.loginWithMfa({
      userId,
      ctx: { userAgent, clientIp },
    })

    const response: z.infer<typeof MfaVerifyResponseSchema> = {
      userId: loginResult.userId,
      accessToken: loginResult.accessToken,
      refreshToken: loginResult.refreshToken,
    }

    const res = createJsonApiResponse(req, ok(response))
    appendAuthCookies(res, loginResult.accessToken, loginResult.refreshToken)
    res.cookies.delete(MFA_PENDING_TOKEN_COOKIE)
    return res
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
