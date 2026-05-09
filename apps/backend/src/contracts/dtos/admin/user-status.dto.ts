import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const AdminDisableUserResponseSchema = z
  .object({
    userId: z.string().uuid().openapi({ description: '用户 ID' }),
    status: z.enum(['disabled', 'active']).openapi({ description: '更新后的状态' }),
    revokedAllSessions: z.boolean().openapi({ description: '是否已撤销全部会话' }),
  })
  .openapi({ description: '后台封禁用户响应' })

export type AdminDisableUserResponse = z.infer<typeof AdminDisableUserResponseSchema>

export const AdminEnableUserResponseSchema = AdminDisableUserResponseSchema.openapi({
  description: '后台解封用户响应',
})

export type AdminEnableUserResponse = z.infer<typeof AdminEnableUserResponseSchema>
