/**
 * File: src/contracts/dtos/mfa/mfa-status.dto.ts
 * Description: MFA 状态 API 的 DTO 定义
 */

import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// ==================== Response ====================

/**
 * Schema: MfaStatusResponseSchema
 *
 * Description: MFA 状态响应 Schema
 */
export const MfaStatusResponseSchema = z
  .object({
    enabled: z.boolean().openapi({ description: '是否已启用 MFA' }),
    setupAt: z.string().datetime().nullable().openapi({ description: 'MFA 设置时间 (ISO 8601)' }),
  })
  .openapi({ description: 'MFA 状态响应' })

export type MfaStatusResponse = z.infer<typeof MfaStatusResponseSchema>
