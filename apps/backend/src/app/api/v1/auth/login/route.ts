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
import { isNonBrowserClient } from '@/lib/http/client-detector'
import { AppError } from '@/lib/errors/app-error'
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
  onError: (_ctx, res, _error) => {
    removeAuthCookies(res)
    // 安全修复: 不再向客户端暴露锁定的精确到期时间，防止攻击者优化暴力破解窗口
    // 锁定信息仅通过已登录用户的 UI 面板展示
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

    // 本地开发跳过 MFA：MFA_SKIP_ENABLED=true 且非生产环境时，即使已启用 MFA 也直接登录
    const mfaSkipEnabled = env.MFA_SKIP_ENABLED && process.env.NODE_ENV !== 'production'

    if (mfaStatus?.mfaEnabled && !mfaSkipEnabled) {
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

    // 安全修复 C-1: 浏览器端仅通过 HttpOnly Cookie 下发 token，不在响应体中暴露
    // 非浏览器客户端（小程序等）自行管理 token，需要通过响应体获取
    const responseData: Record<string, unknown> = { userId: result.userId }

    if (isNonBrowserClient(req)) {
      responseData.accessToken = result.accessToken
      responseData.refreshToken = result.refreshToken
    }

    const res = createJsonApiResponse(req, ok(responseData))
    appendAuthCookies(res, result.accessToken, result.refreshToken)
    return res
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
