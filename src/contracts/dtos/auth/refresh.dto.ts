import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const RefreshSessionRequestSchema = z
  .object({})
  .openapi({ description: '刷新会话请求（refresh token 通过 HttpOnly Cookie 传递）' })

export type RefreshSessionRequest = z.infer<typeof RefreshSessionRequestSchema>

export const RefreshSessionResponseSchema = z
  .object({
    userId: z.string().uuid().openapi({ description: '用户 ID' }),
  })
  .openapi({ description: '刷新会话响应（新的 Cookie 由服务端下发）' })

export type RefreshSessionResponse = z.infer<typeof RefreshSessionResponseSchema>
