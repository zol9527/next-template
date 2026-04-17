import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const WechatAccountSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '账号 ID' }),
    userId: z.string().uuid().openapi({ description: '关联用户 ID' }),
    openid: z.string().openapi({ description: '微信 OpenID' }),
    unionid: z.string().nullable().openapi({ description: '微信 UnionID（可为空）' }),
  })
  .openapi({ description: '微信账号' })

export type WechatAccount = z.infer<typeof WechatAccountSchema>
