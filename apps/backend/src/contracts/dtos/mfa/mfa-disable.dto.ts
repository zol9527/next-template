/**
 * File: src/contracts/dtos/mfa/mfa-disable.dto.ts
 * Description: MFA 禁用 API 的 DTO 定义
 */

import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// ==================== Request ====================

/**
 * Schema: MfaDisableRequestSchema
 *
 * Description: 禁用 MFA 请求 Schema
 */
export const MfaDisableRequestSchema = z
  .object({
    token: z.string().regex(/^\d{6}$/).openapi({ description: '6 位 TOTP 验证码' }),
    password: z.string().min(1, '请输入密码').openapi({ description: '用户密码' }),
  })
  .openapi({ description: '禁用 MFA 请求' })

export type MfaDisableRequest = z.infer<typeof MfaDisableRequestSchema>

// ==================== Response ====================

/**
 * Schema: MfaDisableResponseSchema
 *
 * Description: 禁用 MFA 响应 Schema
 */
export const MfaDisableResponseSchema = z
  .object({
    disabled: z.boolean().openapi({ description: '是否成功禁用' }),
  })
  .openapi({ description: '禁用 MFA 响应' })

export type MfaDisableResponse = z.infer<typeof MfaDisableResponseSchema>
