import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const WechatLoginRequestSchema = z
  .object({
    code: z.string().min(1).openapi({ description: '微信小程序登录 code' }),
    nickname: z.string().trim().min(1).max(64).optional().openapi({ description: '微信昵称（可选）' }),
    avatarUrl: z.string().url().optional().openapi({ description: '微信头像 URL（可选）' }),
  })
  .openapi({ description: '微信登录请求' })

export type WechatLoginRequest = z.infer<typeof WechatLoginRequestSchema>

export const WechatLoginResponseSchema = z
  .object({
    userId: z.string().uuid().openapi({ description: '登录用户 ID' }),
    accessToken: z.string().min(1).openapi({ description: '访问令牌' }),
    refreshToken: z.string().min(1).openapi({ description: '刷新令牌' }),
  })
  .openapi({ description: '微信登录响应（同时返回 token 并下发 Cookie）' })

export type WechatLoginResponse = z.infer<typeof WechatLoginResponseSchema>
