// src/contracts/dtos/admin/me/profile.dto.ts
/**
 * Module: profile.dto.ts
 *
 * Description: 管理员个人资料相关的 DTO 和 Schema 定义
 *
 * Functions/Components:
 * - UpdateProfileSchema: Zod Schema 用于更新个人资料请求验证
 * - UpdateProfileDto: TypeScript 类型定义
 */

import { z } from 'zod';

/**
 * Function: UpdateProfileSchema
 *
 * Description: 更新个人资料请求验证 Schema
 *
 * Fields:
 *   - username: 用户名，2-50 个字符
 *   - email: 邮箱地址
 *   - phone: 手机号（可选）
 *   - avatarUrl: 头像 URL（可选，已弃用，建议使用 avatarId）
 *   - avatarId: 预设头像 ID（可选）
 */
export const UpdateProfileSchema = z.object({
  username: z
    .string()
    .min(2, '用户名至少 2 个字符')
    .max(50, '用户名最多 50 个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  phone: z
    .string()
    .regex(/^1[3-9]\d{9}$/, '请输入有效的手机号')
    .optional()
    .or(z.literal('')),
  avatarUrl: z.string().url('头像 URL 无效').optional().or(z.literal('')),
  avatarId: z.string().optional(),
});

/**
 * Type: UpdateProfileDto
 *
 * Description: 更新个人资料请求 DTO 类型
 */
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
