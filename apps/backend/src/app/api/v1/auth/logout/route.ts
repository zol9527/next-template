import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { removeAuthCookies } from '@/lib/http/response/cookies'
import { REFRESH_TOKEN_COOKIE } from '@/lib/constants/token'
import { createAuth } from '@/app/api/v1/auth/auth-deps'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

export const POST = withV1Route({
  action: 'auth:logout',
  handler: async ({ req, traceId, logger }) => {
    const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value ?? null
    const auth = await createAuth({ traceId, logger, userAgent: req.headers.get('user-agent'), clientIp: null })

    await auth.logout({ refreshToken })

    const res = createJsonApiResponse(req, ok({ ok: true }))
    removeAuthCookies(res)
    return res
  },
  onError: (_ctx, res) => {
    removeAuthCookies(res)
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
