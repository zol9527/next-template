/**
 * File: src/contracts/dtos/mfa/mfa-verify-action.dto.ts
 * Description: MFA 操作验证 API 的 DTO 定义
 */

import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// ==================== 枚举定义 ====================

/**
 * Enum: MfaActionTypeEnum
 *
 * Description: 支持的操作类型枚举
 */
export const MfaActionTypeEnum = z.enum([
  'refund',
  'withdraw',
  'delete-user',
  'modify-permissions',
  'export-data',
  'system-settings',
])

export type MfaActionType = z.infer<typeof MfaActionTypeEnum>

// ==================== Request ====================

/**
 * Schema: MfaVerifyActionRequestSchema
 *
 * Description: MFA 操作验证请求 Schema
 */
export const MfaVerifyActionRequestSchema = z
  .object({
    token: z
      .string()
      // TOTP 通常为 6 位；备份码可能包含连字符且更长（如 XXXX-XXXX-XXXX）。
      .min(6)
      .max(32)
      .regex(/^[A-Za-z0-9-]+$/, { message: 'token 只能包含字母、数字与连字符' })
      .openapi({ description: 'TOTP 验证码或备份码（可包含连字符）' }),
    action: MfaActionTypeEnum.openapi({ description: '操作类型' }),
    resourceId: z
      .string()
      .uuid()
      .optional()
      .openapi({ description: '可选：绑定的资源 ID（如订单 ID）' }),
  })
  .openapi({ description: 'MFA 操作验证请求' })

export type MfaVerifyActionRequest = z.infer<typeof MfaVerifyActionRequestSchema>

// ==================== Response ====================

/**
 * Schema: MfaVerifyActionResponseSchema
 *
 * Description: MFA 操作验证响应 Schema
 */
export const MfaVerifyActionResponseSchema = z
  .object({
    actionToken: z.string().openapi({ description: '一次性操作令牌（有效期 5 分钟）' }),
    expiresAt: z.string().datetime().openapi({ description: '过期时间 (ISO 8601)' }),
  })
  .openapi({ description: 'MFA 操作验证响应' })

export type MfaVerifyActionResponse = z.infer<typeof MfaVerifyActionResponseSchema>
