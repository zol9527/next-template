/**
 * File: src/contracts/dtos/mfa/admin-mfa-reset.dto.ts
 * Description: 管理员重置 MFA API 的 DTO 定义
 */

import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// ==================== Request ====================

/**
 * Schema: AdminMfaResetRequestSchema
 *
 * Description: 管理员重置用户 MFA 请求 Schema
 */
export const AdminMfaResetRequestSchema = z
  .object({
    reason: z
      .string()
      .min(1)
      .max(500)
      .optional()
      .openapi({ description: '重置原因（可选，用于审计）' }),
  })
  .openapi({ description: '管理员重置用户 MFA 请求' })

export type AdminMfaResetRequest = z.infer<typeof AdminMfaResetRequestSchema>

// ==================== Response ====================

/**
 * Schema: AdminMfaResetResponseSchema
 *
 * Description: 管理员重置用户 MFA 响应 Schema
 */
export const AdminMfaResetResponseSchema = z
  .object({
    userId: z.string().openapi({ description: '用户 ID' }),
    reset: z.boolean().openapi({ description: '是否成功重置' }),
  })
  .openapi({ description: '管理员重置用户 MFA 响应' })

export type AdminMfaResetResponse = z.infer<typeof AdminMfaResetResponseSchema>
