import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { WechatLoginRequestSchema } from '@/plugins/wechat/contracts/wechat-login.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { appendAuthCookies, removeAuthCookies } from '@/lib/http'
import { createAuth } from '@/app/api/v1/auth/auth-deps'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { extractClientIpSafe } from '@/lib/http/ip-extractor'

export const POST = withV1Route({
  pluginGuard: 'wechat',
  action: 'auth:wechat',
  schemas: { body: WechatLoginRequestSchema },
  rateLimit: {
    // 安全修复: 降低微信登录限流阈值，防止批量注册垃圾账户
    max: 5,
    windowMs: 60_000,
    identity: ({ body }) => body?.code,
    network: {
      max: 15,
      windowMs: 60_000,
    },
    message: '请求过多，请稍后再试',
  },
  handler: async ({ req, body, traceId, logger }) => {
    const clientIp = extractClientIpSafe(req, { requireIp: false }).ip
    const auth = await createAuth({ traceId, logger, userAgent: req.headers.get('user-agent'), clientIp })

    const result = await auth.loginWithWechat({
      code: body!.code,
      profile: {
        nickname: body?.nickname,
        avatarUrl: body?.avatarUrl,
      },
      ctx: { userAgent: req.headers.get('user-agent'), clientIp },
    })

    const res = createJsonApiResponse(req, ok({
      userId: result.userId,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }))
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
