import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const AdminUserDetailSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '用户 ID' }),
    username: z.string().nullable().openapi({ description: '用户名' }),
    nickname: z.string().nullable().openapi({ description: '昵称（展示名称）' }),
    email: z.string().nullable().openapi({ description: '邮箱' }),
    phone: z.string().nullable().openapi({ description: '手机号' }),
    avatarUrl: z.string().nullable().openapi({ description: '头像 URL' }),
    userType: z.string().nullable().openapi({ description: '用户类型/目标群体' }),
    status: z.string().nullable().openapi({ description: '账号状态（active/disabled 等）' }),
    canUpload: z.boolean().openapi({ description: '用户是否允许上传文件' }),
    passwordHash: z.string().nullable().openapi({ description: '密码哈希（可为空）' }),
    failedLoginCount: z.number().int().nonnegative().openapi({ description: '连续失败登录次数' }),
    lockedUntil: z.string().nullable().openapi({ description: '锁定到期时间 ISO（为空表示未锁定）' }),
    passwordUpdatedAt: z.string().nullable().openapi({ description: '密码更新时间 ISO（为空表示未设置密码）' }),
    // MFA 相关字段
    mfaEnabled: z.boolean().openapi({ description: '是否启用 MFA' }),
    mfaSecret: z.string().nullable().openapi({ description: 'TOTP 密钥（AES 加密存储）' }),
    mfaBackupCodes: z.string().nullable().openapi({ description: '备份码（bcrypt 哈希，JSON 数组）' }),
    mfaSetupAt: z.string().nullable().openapi({ description: 'MFA 设置时间 ISO' }),
    createdAt: z.string().openapi({ description: '创建时间 ISO' }),
    updatedAt: z.string().openapi({ description: '更新时间 ISO' }),
  })
  .openapi({ description: '后台用户详情' })

export type AdminUserDetail = z.infer<typeof AdminUserDetailSchema>

export const SafeAdminUserDetailSchema = AdminUserDetailSchema.omit({
  passwordHash: true,
  mfaSecret: true,
  mfaBackupCodes: true,
}).openapi({ description: '后台用户详情（脱敏）' })

export type SafeAdminUserDetail = z.infer<typeof SafeAdminUserDetailSchema>

export const AdminUserDetailResponseSchema = z
  .object({
    user: SafeAdminUserDetailSchema,
  })
  .openapi({ description: '后台用户详情响应' })

export type AdminUserDetailResponse = z.infer<typeof AdminUserDetailResponseSchema>
