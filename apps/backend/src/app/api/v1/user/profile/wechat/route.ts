import type { NextRequest } from 'next/server'
import { ok } from '@/contracts/api-response.schema'
import { WechatProfileCompletionRequestSchema } from '@/plugins/wechat/contracts/wechat-profile-completion.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { createAuth } from '@/app/api/v1/auth/auth-deps'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'

/**
 * POST /api/v1/user/profile/wechat
 *
 * 微信用户资料补全接口
 *
 * 用于用户主动补全昵称和头像资料
 */
export const POST = withV1Route({
  pluginGuard: 'wechat',
  action: 'user:complete_wechat_profile',
  schemas: { body: WechatProfileCompletionRequestSchema },
  requireAuth: true,
  rateLimit: {
    max: 10,
    windowMs: 60_000,
    identity: ({ userId }) => userId,
    network: {
      max: 30,
      windowMs: 60_000,
    },
    message: '请求过多，请稍后再试',
  },
  handler: async ({ req, body, serviceContext, userId }) => {
    const auth = await createAuth(serviceContext)

    await auth.completeWechatProfile({
      userId: userId!,
      nickname: body!.nickname,
      avatarUrl: body!.avatarUrl,
    })

    return createJsonApiResponse(req, ok({
      message: '资料补全成功',
    }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
