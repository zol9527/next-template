import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const SessionSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '会话 ID' }),
    userId: z.string().uuid().openapi({ description: '用户 ID' }),
    refreshTokenHash: z.string().openapi({ description: '刷新令牌哈希' }),
    replacedBySessionId: z.string().uuid().nullable().optional().openapi({ description: '替换此会话的新会话 ID（可为空）' }),
    rotatedAt: z.string().datetime().nullable().optional().openapi({ description: '轮换时间（可为空）' }),
    userAgent: z.string().nullable().optional().openapi({ description: '用户代理（可为空）' }),
    clientIp: z.string().nullable().optional().openapi({ description: '客户端 IP（可为空）' }),
    isRevoked: z.boolean().openapi({ description: '是否已撤销' }),
    expiresAt: z.string().datetime().openapi({ description: '过期时间' }),
    createdAt: z.string().datetime().openapi({ description: '创建时间' }),
  })
  .openapi({ description: '用户会话' })

export type Session = z.infer<typeof SessionSchema>

export const CreateSessionInputSchema = z
  .object({
    userId: z.string().uuid().openapi({ description: '用户 ID' }),
    refreshTokenHash: z.string().openapi({ description: '刷新令牌哈希' }),
    expiresAt: z.string().datetime().openapi({ description: '过期时间' }),
    userAgent: z.string().nullable().optional().openapi({ description: '用户代理（可选）' }),
    clientIp: z.string().nullable().optional().openapi({ description: '客户端 IP（可选）' }),
  })
  .openapi({ description: '创建会话输入' })

export type CreateSessionInput = z.infer<typeof CreateSessionInputSchema>

/**
 * Schema: SessionListQuerySchema
 *
 * Description: 会话列表查询参数
 */
export const SessionListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1).openapi({ description: '页码' }),
  pageSize: z.coerce.number().min(1).max(100).default(20).openapi({ description: '每页数量' }),
  includeRevoked: z.coerce.boolean().optional().openapi({ description: '是否包含已撤销的会话' }),
})

/**
 * Schema: SessionListResponseSchema
 *
 * Description: 会话列表响应
 */
export const SessionListResponseSchema = z.object({
  sessions: z.array(SessionSchema).openapi({ description: '会话列表' }),
  total: z.number().openapi({ description: '总数' }),
  page: z.number().openapi({ description: '当前页码' }),
  pageSize: z.number().openapi({ description: '每页数量' }),
})

/**
 * Schema: BatchRevokeSessionsSchema
 *
 * Description: 批量撤销会话请求
 */
export const BatchRevokeSessionsSchema = z.object({
  sessionIds: z.array(z.string().uuid()).min(1).openapi({ description: '要撤销的会话 ID 列表' }),
})

/**
 * Type: SessionListQuery
 *
 * Description: 会话列表查询参数类型
 */
export type SessionListQuery = z.infer<typeof SessionListQuerySchema>

/**
 * Type: SessionListResponse
 *
 * Description: 会话列表响应类型
 */
export type SessionListResponse = z.infer<typeof SessionListResponseSchema>

/**
 * Type: BatchRevokeSessions
 *
 * Description: 批量撤销会话请求类型
 */
export type BatchRevokeSessions = z.infer<typeof BatchRevokeSessionsSchema>

// ==================== 路径参数 ====================

/**
 * Schema: SessionIdParamsSchema
 *
 * Description: 会话 ID 路径参数
 */
export const SessionIdParamsSchema = z.object({
  sessionId: z.string().uuid().openapi({ description: '会话 ID' }),
})

/**
 * Type: SessionIdParams
 *
 * Description: 会话 ID 路径参数类型
 */
export type SessionIdParams = z.infer<typeof SessionIdParamsSchema>
