/**
 * File: src/contracts/dtos/mfa/mfa-verify.dto.ts
 * Description: MFA 验证 API 的 DTO 定义（登录第二步）
 */

import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// ==================== Request ====================

/**
 * Schema: MfaVerifyRequestSchema
 *
 * Description: MFA 验证请求 Schema（登录第二步）
 */
export const MfaVerifyRequestSchema = z
  .object({
    userId: z.string().uuid().openapi({ description: '用户 ID（从第一步登录响应中获取）' }),
    token: z
      .string()
      // TOTP 通常为 6 位；备份码可能包含连字符且更长（如 XXXX-XXXX-XXXX）。
      .min(6)
      .max(32)
      .regex(/^[A-Za-z0-9-]+$/, { message: 'token 只能包含字母、数字与连字符' })
      .openapi({ description: 'TOTP 验证码或备份码（可包含连字符）' }),
  })
  .openapi({ description: 'MFA 验证请求（登录第二步）' })

export type MfaVerifyRequest = z.infer<typeof MfaVerifyRequestSchema>

// ==================== Response ====================

/**
 * Schema: MfaVerifyResponseSchema
 *
 * Description: MFA 验证成功响应 Schema（完成登录）
 */
export const MfaVerifyResponseSchema = z
  .object({
    userId: z.string().uuid().openapi({ description: '用户 ID' }),
    accessToken: z.string().openapi({ description: '访问令牌' }),
    refreshToken: z.string().openapi({ description: '刷新令牌' }),
  })
  .openapi({ description: 'MFA 验证成功响应（完成登录）' })

export type MfaVerifyResponse = z.infer<typeof MfaVerifyResponseSchema>

// ==================== MFA Required Response (登录第一步返回) ====================

/**
 * Schema: MfaRequiredResponseSchema
 *
 * Description: 需要 MFA 验证的响应 Schema
 */
export const MfaRequiredResponseSchema = z
  .object({
    requiresMfa: z.literal(true).openapi({ description: '需要 MFA 验证' }),
    userId: z.string().uuid().openapi({ description: '用户 ID（用于第二步验证）' }),
  })
  .openapi({ description: '需要 MFA 验证的响应' })

export type MfaRequiredResponse = z.infer<typeof MfaRequiredResponseSchema>
