import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { SafeAdminUserDetailSchema } from '@/contracts/dtos/admin/user-detail.dto'

extendZodWithOpenApi(z)

export const AdminUserListItemSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '用户 ID' }),
    username: z.string().nullable().openapi({ description: '用户名' }),
    nickname: z.string().nullable().openapi({ description: '昵称（展示名称）' }),
    email: z.string().nullable().openapi({ description: '邮箱' }),
    phone: z.string().nullable().openapi({ description: '手机号' }),
    avatarUrl: z.string().nullable().openapi({ description: '头像 URL' }),
    userType: z.string().nullable().openapi({ description: '用户类型/目标群体' }),
    status: z.string().nullable().openapi({ description: '账号状态（active/disabled 等）' }),
    canUpload: z.boolean().openapi({ description: '是否允许上传图片' }),
    lockedUntil: z.string().nullable().openapi({ description: '锁定到期时间 ISO（为空表示未锁定）' }),
    createdAt: z.string().openapi({ description: '创建时间 ISO' }),
    lastLoginAt: z.string().nullable().optional().openapi({ description: '最后登录时间 ISO' }),
    lastDevice: z.string().nullable().optional().openapi({ description: '最后登录设备信息（如 Chrome · macOS · 192.168.1.1）' }),
  })
  .openapi({ description: '后台用户列表项' })

export type AdminUserListItem = z.infer<typeof AdminUserListItemSchema>

 export const AdminUserListQuerySchema = z
   .object({
     limit: z.preprocess(
       (v) => (Array.isArray(v) ? v[0] : v),
       z.coerce
         .number()
         .int()
         .min(1)
         .max(50)
         .optional()
         .default(50)
         .openapi({ description: '分页大小（默认 50，最大 50）' }),
     ),
     cursor: z.string().optional().openapi({ description: '分页游标（可选）' }),
     offset: z.preprocess(
       (v) => (Array.isArray(v) ? v[0] : v),
       z.coerce
         .number()
         .int()
         .min(0)
         .optional()
         .default(0)
         .openapi({ description: '分页偏移（向后兼容，默认 0）' }),
     ),
     keyword: z.preprocess(
       (v) => {
         const first = Array.isArray(v) ? v[0] : v
         return typeof first === 'string' && first.trim() === '' ? undefined : first
       },
       z
         .string()
         .trim()
         .min(1)
         .max(100)
         .optional()
         .openapi({ description: '搜索关键词（可选）' }),
     ),
      status: z.preprocess(
        (v) => {
          const first = Array.isArray(v) ? v[0] : v
          return typeof first === 'string' && first.trim() === '' ? undefined : first
        },
        z
          .string()
          .trim()
          .min(1)
          .max(32)
          .optional()
          .openapi({ description: '账号状态过滤（可选，如 active/disabled）' }),
      ),
      role: z.preprocess(
        (v) => {
          const first = Array.isArray(v) ? v[0] : v
          return typeof first === 'string' && first.trim() === '' ? undefined : first
        },
        z.string().trim().min(1).max(100).optional().openapi({ description: '按角色 ID 筛选（可选）' }),
      ),
    })
    .openapi({ description: '后台用户列表查询参数' })

export type AdminUserListQuery = z.infer<typeof AdminUserListQuerySchema>

 export const AdminUserListResponseSchema = z
   .object({
     users: z.array(AdminUserListItemSchema).openapi({ description: '用户列表' }),
     total: z.number().int().min(0).openapi({ description: '满足条件的总数' }),
     nextCursor: z.string().nullable().openapi({ description: '下一页游标' }),
     offset: z.number().int().min(0).openapi({ description: '本次返回的 offset' }),
     limit: z.number().int().min(1).max(50).openapi({ description: '本次返回的 limit' }),
   })
   .openapi({ description: '后台用户列表响应' })

export type AdminUserListResponse = z.infer<typeof AdminUserListResponseSchema>

export const ToggleUploadPermissionRequestSchema = z
  .object({
    canUpload: z.boolean().openapi({ description: '是否允许上传' }),
  })
  .openapi({ description: '切换上传权限请求' })

export type ToggleUploadPermissionRequest = z.infer<typeof ToggleUploadPermissionRequestSchema>

export const ToggleUploadPermissionResponseSchema = z
  .object({
    userId: z.string().uuid().openapi({ description: '用户 ID' }),
    canUpload: z.boolean().openapi({ description: '是否允许上传' }),
  })
  .openapi({ description: '切换上传权限响应' })

export type ToggleUploadPermissionResponse = z.infer<typeof ToggleUploadPermissionResponseSchema>

export const UpdateUserRequestSchema = z
  .object({
    nickname: z.string().trim().min(1).max(50).optional().openapi({ description: '昵称' }),
    email: z.string().email().optional().openapi({ description: '邮箱' }),
    phone: z.string().trim().regex(/^1[3-9]\d{9}$/, '手机号格式不正确').optional()
      .openapi({ description: '手机号（中国大陆格式）' }),
    status: z.enum(['active', 'disabled']).optional().openapi({ description: '账户状态' }),
  })
  // 至少需要提供一个字段，防止空 body 执行无意义更新
  .refine(data => Object.values(data).some(v => v !== undefined), {
    message: '至少需要提供一个更新字段',
  })
  .openapi({ description: '管理员编辑用户请求' })

export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>

export const UpdateUserResponseSchema = z
  .object({
    user: SafeAdminUserDetailSchema,
  })
  .openapi({ description: '管理员编辑用户响应' })

export type UpdateUserResponse = z.infer<typeof UpdateUserResponseSchema>
