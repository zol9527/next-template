/**
 * File: src/app/api/v1/auth/mfa/verify/route.ts
 * Description: MFA 验证 API（登录第二步）
 */

import type { NextRequest } from 'next/server'
import { ok, fail } from '@/contracts/api-response.schema'
import { MfaVerifyRequestSchema } from '@/contracts/dtos/mfa/mfa-verify.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMfaRepository } from '@/repositories/factory'
import { MfaService } from '@/services/core/mfa.service'
import { createAuth } from '@/app/api/v1/auth/auth-deps'
import { appendAuthCookies } from '@/lib/http'
import { MFA_PENDING_TOKEN_COOKIE } from '@/lib/constants/token'
import { TokenManager } from '@/lib/security/token-manager'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import { isNonBrowserClient } from '@/lib/http/client-detector'
import { createHmac } from 'node:crypto'

export const POST = withV1Route({
  action: 'auth:mfa_verify',
  schemas: { body: MfaVerifyRequestSchema },
  rateLimit: {
    max: 5,
    windowMs: 60_000,
    identity: ({ req }) => {
      // H-5 修复: userId 不再从请求体获取，改用 mfa_pending_token 的哈希作为限流标识
      const mfaToken = req.cookies.get(MFA_PENDING_TOKEN_COOKIE)?.value
      if (!mfaToken) return undefined
      return createHmac('sha256', 'mfa-rate-limit')
        .update(mfaToken)
        .digest('hex')
        .slice(0, 16)
    },
    network: {
      max: 20,
      windowMs: 60_000,
    },
    message: '请求过多，请稍后再试',
  },
  handler: async ({ req, body, serviceContext }) => {
    const { token } = body!
    const clientIp = extractClientIpSafe(req, { requireIp: false }).ip ?? '0.0.0.0'
    const userAgent = req.headers.get('user-agent')

    const mfaRepo = await createMfaRepository()

    // H-5 修复: userId 仅从服务端签发的 mfa_pending_token cookie 中获取
    // 不再信任客户端请求体中的 userId，消除伪造攻击面
    const mfaPendingToken = req.cookies.get(MFA_PENDING_TOKEN_COOKIE)?.value
    if (!mfaPendingToken) {
      return createJsonApiResponse(req, fail('UNAUTHORIZED', 'MFA session expired or invalid'), { status: 401 })
    }

    let userId: string
    try {
      const payload = await TokenManager.verifyMfaToken(mfaPendingToken)
      userId = payload.sub
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

    // 安全修复 C-1: 浏览器端仅通过 HttpOnly Cookie 下发 token
    // 非浏览器客户端（小程序等）自行管理 token，需要通过响应体获取
    const responseData: Record<string, unknown> = { userId: loginResult.userId }

    if (isNonBrowserClient(req)) {
      responseData.accessToken = loginResult.accessToken
      responseData.refreshToken = loginResult.refreshToken
    }

    const res = createJsonApiResponse(req, ok(responseData))
    appendAuthCookies(res, loginResult.accessToken, loginResult.refreshToken)
    res.cookies.delete(MFA_PENDING_TOKEN_COOKIE)
    return res
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
