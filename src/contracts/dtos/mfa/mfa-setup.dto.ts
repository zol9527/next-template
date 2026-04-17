/**
 * File: src/contracts/dtos/mfa/mfa-setup.dto.ts
 * Description: MFA 设置 API 的 DTO 定义
 */

import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// ==================== Request ====================

/**
 * Schema: MfaSetupRequestSchema
 *
 * Description: MFA 设置请求 Schema（无需请求体）
 */
export const MfaSetupRequestSchema = z
  .object({})
  .openapi({ description: 'MFA 设置请求（无需请求体）' })

export type MfaSetupRequest = z.infer<typeof MfaSetupRequestSchema>

// ==================== Response ====================

/**
 * Schema: MfaSetupResponseSchema
 *
 * Description: MFA 设置响应 Schema
 */
export const MfaSetupResponseSchema = z
  .object({
    secret: z.string().openapi({ description: 'TOTP 密钥（明文，仅返回一次）' }),
    qrCode: z.string().openapi({ description: 'QR Code Data URL (base64)' }),
    backupCodes: z.array(z.string()).openapi({ description: '备份码列表（仅返回一次）' }),
  })
  .openapi({ description: 'MFA 设置响应' })

export type MfaSetupResponse = z.infer<typeof MfaSetupResponseSchema>
