import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { PasswordLoginRequestSchema } from '@/contracts/dtos/auth/password-login.dto'
import { MfaRequiredResponseSchema } from '@/contracts/dtos/mfa/mfa-verify.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { appendAuthCookies, removeAuthCookies } from '@/lib/http/response/cookies'
import { createAuth } from '@/app/api/v1/auth/auth-deps'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createMfaRepository } from '@/repositories/factory'
import { MFA_PENDING_TOKEN_COOKIE } from '@/lib/constants/token'
import { TokenManager } from '@/lib/security/token-manager'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'
import { env } from '@/config'
import { AppError } from '@/lib/errors/app-error'
import { AuthError } from '@/services/core/auth.service'
import type { z } from 'zod'

export const POST = withV1Route({
  action: 'auth:login',
  schemas: { body: PasswordLoginRequestSchema },
  rateLimit: {
    max: 5,
    windowMs: 60_000,
    identity: ({ body }) => body?.identifier,
    network: {
      max: 20,
      windowMs: 60_000,
    },
    message: '请求过多，请稍后再试',
  },
  onError: (_ctx, res, error) => {
    removeAuthCookies(res)

    if (error instanceof AuthError && error.code === 'LOCKED' && error.lockedUntil) {
      const lockExpiry = new Date(error.lockedUntil).getTime()
      if (Number.isFinite(lockExpiry)) {
        const remainingSeconds = Math.max(1, Math.ceil((lockExpiry - Date.now()) / 1000))
        res.headers.set('X-Locked-Until', error.lockedUntil)
        res.headers.set('X-Lock-Remaining-Seconds', String(remainingSeconds))
      }
    }
  },
  handler: async ({ req, body, serviceContext }) => {
    const ipResult = extractClientIpSafe(req, {
      trustProxy: env.RATE_LIMIT_TRUST_PROXY,
      allowPrivateIp: env.RATE_LIMIT_ALLOW_PRIVATE_IP,
      requireIp: false
    })

    const auth = await createAuth(serviceContext)
    const ctx = { userAgent: req.headers.get('user-agent'), clientIp: ipResult.ip }

    // 1. Validate credentials ONLY (do not issue session yet)
    const { userId } = await auth.validateCredentials({
      identifier: body!.identifier,
      password: body!.password,
    })

    // 2. Check MFA status
    const mfaRepo = await createMfaRepository()
    const mfaStatus = await mfaRepo.getUserMfaData(serviceContext, { userId })

    if (mfaStatus?.mfaEnabled) {
      // MFA 已启用但未完成 setup（mfaSetupAt 为 null），阻止登录
      if (!mfaStatus.mfaSetupAt) {
        throw new AppError(403, 'MFA_SETUP_INCOMPLETE', '请先完成 MFA 设置后再登录')
      }

      // MFA 已启用，返回需要第二步验证
      const mfaResponse: z.infer<typeof MfaRequiredResponseSchema> = {
        requiresMfa: true,
        userId,
      }

      const ttl = env.MFA_PENDING_TOKEN_TTL_SECONDS
      const mfaToken = await TokenManager.signMfaToken({ sub: userId }, ttl)
      const res = createJsonApiResponse(req, ok(mfaResponse))

      res.cookies.set(MFA_PENDING_TOKEN_COOKIE, mfaToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: ttl,
      })

      return res
    }

    // 3. MFA Not Enabled -> Issue Session
    const result = await auth.loginUser({ userId, ctx })

    // MFA 未启用，直接颁发令牌
    const res = createJsonApiResponse(req, ok({
      userId: result.userId,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }))
    appendAuthCookies(res, result.accessToken, result.refreshToken)
    return res
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
