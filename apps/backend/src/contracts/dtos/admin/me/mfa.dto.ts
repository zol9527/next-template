// src/contracts/dtos/admin/me/mfa.dto.ts
/**
 * Module: mfa.dto.ts
 *
 * Description: 管理员 MFA (多因素认证) 相关的 DTO 和 Schema 定义
 *
 * Functions/Components:
 * - MfaVerifySchema: Zod Schema 用于 MFA 验证请求
 * - MfaDisableSchema: Zod Schema 用于禁用 MFA 请求
 * - MfaVerifyDto: TypeScript 类型定义
 * - MfaDisableDto: TypeScript 类型定义
 */

import { z } from 'zod';

/**
 * Function: MfaVerifySchema
 *
 * Description: MFA 验证请求验证 Schema
 *
 * Fields:
 *   - code: 6 位数字验证码
 */
export const MfaVerifySchema = z.object({
  code: z
    .string()
    .length(6, '验证码必须是 6 位数字')
    .regex(/^\d{6}$/, '验证码只能是数字'),
});

/**
 * Function: MfaDisableSchema
 *
 * Description: 禁用 MFA 请求验证 Schema
 *
 * Fields:
 *   - code: 6 位数字验证码
 *   - confirmDisable: 确认禁用 MFA（必须为 true）
 */
export const MfaDisableSchema = z.object({
  code: z
    .string()
    .length(6, '验证码必须是 6 位数字')
    .regex(/^\d{6}$/, '验证码只能是数字'),
  confirmDisable: z.boolean().refine((val) => val === true, {
    message: '请确认禁用 MFA',
  }),
});

/**
 * Type: MfaVerifyDto
 *
 * Description: MFA 验证请求 DTO 类型
 */
export type MfaVerifyDto = z.infer<typeof MfaVerifySchema>;

/**
 * Type: MfaDisableDto
 *
 * Description: 禁用 MFA 请求 DTO 类型
 */
export type MfaDisableDto = z.infer<typeof MfaDisableSchema>;
