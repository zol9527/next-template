import type { NextRequest } from 'next/server'
import { ok, fail } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { appendAuthCookies, removeAuthCookies } from '@/lib/http'
import { REFRESH_TOKEN_COOKIE } from '@/lib/constants/token'
import { createAuth } from '@/app/api/v1/auth/auth-deps'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'

export const POST = withV1Route({
  action: 'auth:refresh',
  rateLimit: {
    max: 30,
    windowMs: 60_000,
    message: '请求过多，请稍后再试',
  },
  handler: async ({ req, traceId, logger }) => {
    const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value
    if (!refreshToken) {
      const res = createJsonApiResponse(req, fail('UNAUTHORIZED', 'Unauthorized'), { status: 401 })
      removeAuthCookies(res)
      return res
    }

    const clientIp = extractClientIpSafe(req, { requireIp: false }).ip
    // 创建 ServiceContext
    const ctx = { traceId, logger, userAgent: req.headers.get('user-agent'), clientIp }

    const auth = await createAuth(ctx)

    const result = await auth.refreshSession({
      refreshToken,
      ctx: { userAgent: req.headers.get('user-agent'), clientIp },
    })

    const res = createJsonApiResponse(req, ok({ userId: result.userId }))
    appendAuthCookies(res, result.accessToken, result.refreshToken)
    return res
  },
  onError: (_ctx, res) => {
    removeAuthCookies(res)
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
