import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const IdempotencyRequestStatusSchema = z.enum(['pending', 'succeeded', 'failed']).openapi({ description: '幂等请求状态' })

export type IdempotencyRequestStatus = z.infer<typeof IdempotencyRequestStatusSchema>

export const IdempotencyRequestSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '请求 ID' }),
    userId: z.string().uuid().openapi({ description: '用户 ID' }),
    action: z.string().openapi({ description: '操作标识（如 order:create）' }),
    idempotencyKey: z.string().openapi({ description: '幂等键（客户端生成的唯一标识）' }),
    requestHash: z.string().openapi({ description: '请求内容哈希（用于校验请求体是否一致）' }),
    status: IdempotencyRequestStatusSchema.openapi({ description: '请求状态' }),
    resourceType: z.string().nullable().optional().openapi({ description: '关联资源类型' }),
    resourceId: z.string().uuid().nullable().optional().openapi({ description: '关联资源 ID' }),
    responseCode: z.number().nullable().optional().openapi({ description: 'HTTP 响应码' }),
    responseBody: z.unknown().nullable().optional().openapi({ description: '响应体' }),
    createdAt: z.string().datetime().openapi({ description: '创建时间' }),
    updatedAt: z.string().datetime().openapi({ description: '更新时间' }),
    expiresAt: z.string().datetime().openapi({ description: '过期时间' }),
  })
  .openapi({ description: '幂等请求记录' })

export type IdempotencyRequest = z.infer<typeof IdempotencyRequestSchema>
