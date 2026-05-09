import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { RoleDtoSchema } from '@/contracts/dtos/rbac/role.dto'
import { GrantSchema } from '@/contracts/dtos/rbac/access.dto'

extendZodWithOpenApi(z)

export const MeUserDtoSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '用户 ID' }),
    username: z.string().nullable().optional().openapi({ description: '用户名（可能为空）' }),
    nickname: z.string().nullable().optional().openapi({ description: '昵称/展示名称（可能为空，不唯一）' }),
    email: z.string().nullable().optional().openapi({ description: '邮箱（可能为空）' }),
    phone: z.string().nullable().optional().openapi({ description: '手机号（可能为空）' }),
    avatarUrl: z.string().nullable().optional().openapi({ description: '头像 URL' }),
    userType: z.string().nullable().optional().openapi({ description: '用户类型/目标群体' }),
    canUpload: z.boolean().openapi({ description: '是否允许上传图片' }),
  })
  .openapi({ description: 'Me 用户信息' })

export type MeUserDto = z.infer<typeof MeUserDtoSchema>

export const MeResponseSchema = z
  .object({
    user: MeUserDtoSchema,
    roles: z.array(RoleDtoSchema).openapi({ description: '用户角色列表' }),
    grants: z
      .array(GrantSchema)
      .optional()
      .default([])
      .openapi({ description: '用户授权规则列表（action + scope 组合）' }),
  })
  .openapi({ description: '当前登录用户信息（含角色与授权规则）' })

export type MeResponse = z.infer<typeof MeResponseSchema>
