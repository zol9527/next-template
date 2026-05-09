import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const PasswordLoginRequestSchema = z
  .object({
    identifier: z
      .string()
      .min(1)
      .max(320)
      .refine((v) => !/[(),]/.test(v), {
        message: 'identifier contains invalid characters',
      })
      .openapi({ description: '用户名/邮箱/手机号（三选一）' }),
    password: z.string().min(8).openapi({ description: '密码（最小长度 8）' }),
  })
  .openapi({ description: '账号密码登录请求' })

export type PasswordLoginRequest = z.infer<typeof PasswordLoginRequestSchema>

export const PasswordLoginResponseSchema = z
  .object({
    userId: z.string().uuid().openapi({ description: '登录用户 ID' }),
  })
  .openapi({ description: '账号密码登录响应（Cookie 由服务端下发）' })

export type PasswordLoginResponse = z.infer<typeof PasswordLoginResponseSchema>
