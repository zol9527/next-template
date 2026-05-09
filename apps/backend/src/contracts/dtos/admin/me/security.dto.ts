// src/contracts/dtos/admin/me/security.dto.ts
/**
 * Module: security.dto.ts
 *
 * Description: 管理员账户安全相关的 DTO 和 Schema 定义
 *
 * Functions/Components:
 * - ChangePasswordSchema: Zod Schema 用于修改密码请求验证
 * - ChangePasswordDto: TypeScript 类型定义
 */

import { z } from 'zod';

/**
 * Function: ChangePasswordSchema
 *
 * Description: 修改密码请求验证 Schema
 *
 * Fields:
 *   - currentPassword: 当前密码（必填）
 *   - newPassword: 新密码（至少8位，包含大小写字母和数字）
 *   - confirmPassword: 确认密码（必须与 newPassword 一致）
 *
 * Refine:
 *   - newPassword 和 confirmPassword 必须一致
 */
export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '请输入当前密码'),
    newPassword: z
      .string()
      .min(8, '密码至少 8 位')
      .regex(/[A-Z]/, '密码必须包含大写字母')
      .regex(/[a-z]/, '密码必须包含小写字母')
      .regex(/\d/, '密码必须包含数字'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

/**
 * Type: ChangePasswordDto
 *
 * Description: 修改密码请求 DTO 类型
 */
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;
