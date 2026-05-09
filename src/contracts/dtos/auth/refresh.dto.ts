import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

/**
 * 刷新会话请求 DTO
 *
 * refresh token 有三种传递方式（按优先级）：
 *   1. 请求体中的 refreshToken 字段（小程序等非浏览器客户端）
 *   2. Authorization: Bearer <token> 请求头（小程序等非浏览器客户端）
 *   3. HttpOnly Cookie（浏览器端，由服务端自动管理）
 *
 * 所有字段均为可选，因为浏览器端完全通过 Cookie 传递 token
 */
export const RefreshSessionRequestSchema = z
  .object({
    /** 可选：通过请求体传递 refresh token（适用于小程序等非浏览器客户端） */
    refreshToken: z.string().optional().openapi({ description: 'Refresh token（非浏览器客户端使用）' }),
  })
  .openapi({ description: '刷新会话请求（refresh token 可通过 Cookie、Authorization 头或请求体传递）' })

export type RefreshSessionRequest = z.infer<typeof RefreshSessionRequestSchema>

export const RefreshSessionResponseSchema = z
  .object({
    userId: z.string().uuid().openapi({ description: '用户 ID' }),
    /** 新的 access token（非浏览器客户端通过响应体获取，浏览器端通过 Cookie 获取） */
    accessToken: z.string().optional().openapi({ description: '新的 access token（非浏览器客户端使用）' }),
    /** 新的 refresh token（非浏览器客户端通过响应体获取，浏览器端通过 Cookie 获取） */
    refreshToken: z.string().optional().openapi({ description: '新的 refresh token（非浏览器客户端使用）' }),
  })
  .openapi({ description: '刷新会话响应（浏览器端通过 Set-Cookie 下发，非浏览器端通过响应体返回）' })

export type RefreshSessionResponse = z.infer<typeof RefreshSessionResponseSchema>
