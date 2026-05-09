import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const LogoutResponseSchema = z
  .object({
    ok: z.boolean().openapi({ description: '是否登出成功' }),
  })
  .openapi({ description: '登出响应' })

export type LogoutResponse = z.infer<typeof LogoutResponseSchema>
