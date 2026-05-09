/**
 * File: src/contracts/dtos/mfa/mfa-enable.dto.ts
 * Description: MFA 启用 API 的 DTO 定义
 */

import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// ==================== Request ====================

/**
 * Schema: MfaEnableRequestSchema
 *
 * Description: 启用 MFA 请求 Schema
 */
export const MfaEnableRequestSchema = z
  .object({
    secret: z.string().min(32).openapi({ description: 'TOTP 密钥（从 setup 获取）' }),
    token: z.string().regex(/^\d{6}$/).openapi({ description: '6 位 TOTP 验证码' }),
    backupCodes: z
      .array(z.string().min(10))
      .min(10)
      .max(10)
      .openapi({ description: '10 个备份码（需要安全保存）' }),
  })
  .openapi({ description: '启用 MFA 请求' })

export type MfaEnableRequest = z.infer<typeof MfaEnableRequestSchema>

// ==================== Response ====================

/**
 * Schema: MfaEnableResponseSchema
 *
 * Description: 启用 MFA 响应 Schema
 */
export const MfaEnableResponseSchema = z
  .object({
    enabled: z.boolean().openapi({ description: '是否成功启用' }),
  })
  .openapi({ description: '启用 MFA 响应' })

export type MfaEnableResponse = z.infer<typeof MfaEnableResponseSchema>
