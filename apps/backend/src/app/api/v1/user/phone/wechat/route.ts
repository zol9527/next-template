import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { WechatPhoneBindRequestSchema } from '@/plugins/wechat/contracts/wechat-phone-bind.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { createAuth } from '@/app/api/v1/auth/auth-deps'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

/**
 * POST /api/v1/user/phone/wechat
 *
 * 微信手机号绑定接口
 *
 * 用于用户通过微信手机号授权绑定手机号
 */
export const POST = withV1Route({
  pluginGuard: 'wechat',
  action: 'user:bind_wechat_phone',
  schemas: { body: WechatPhoneBindRequestSchema },
  requireAuth: true,
  rateLimit: {
    max: 5,
    windowMs: 60_000,
    identity: ({ body }) => body?.code,
    network: {
      max: 20,
      windowMs: 60_000,
    },
    message: '请求过多，请稍后再试',
  },
  handler: async ({ req, body, serviceContext, userId }) => {
    const auth = await createAuth(serviceContext)

    const result = await auth.bindWechatPhone({
      userId: userId!,
      code: body!.code,
    })

    return createJsonApiResponse(req, ok({
      message: '手机号绑定成功',
      phone: result.phone,
    }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
