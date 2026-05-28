import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { RoleDtoSchema } from '@/contracts/dtos/rbac/role.dto'

extendZodWithOpenApi(z)

export const AdminRbacRolesResponseSchema = z
  .object({
    roles: z.array(RoleDtoSchema).openapi({ description: '角色列表' }),
  })
  .openapi({ description: '后台 RBAC 角色列表响应' })

export type AdminRbacRolesResponse = z.infer<typeof AdminRbacRolesResponseSchema>

export const CreateRoleSchema = z
  .object({
    name: z.string().min(1).openapi({ description: '角色名称' }),
    description: z.string().optional().openapi({ description: '角色描述' }),
  })
  .openapi({ description: '创建角色请求' })

export type CreateRole = z.infer<typeof CreateRoleSchema>

export const UpdateRoleRequestSchema = z
  .object({
    name: z.string().min(1).optional().openapi({ description: '角色名称' }),
    description: z.string().min(1).optional().openapi({ description: '角色描述' }),
  })
  // 至少需要提供一个字段，防止空 body 执行无意义更新
  .refine(data => data.name !== undefined || data.description !== undefined, {
    message: '至少需要提供一个更新字段（name 或 description）',
  })
  .openapi({ description: '编辑角色请求' })

export type UpdateRoleRequest = z.infer<typeof UpdateRoleRequestSchema>

export const AdminRoleDetailSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '角色 ID' }),
    name: z.string().min(1).openapi({ description: '角色标识' }),
    description: z.string().optional().openapi({ description: '角色描述' }),
    grants: z.array(z.object({
      action: z.enum(['read', 'write', 'execute']),
      scope: z.string().min(1),
    })).openapi({ description: '角色权限列表' }),
    userCount: z.number().int().nonnegative().openapi({ description: '已分配用户数' }),
    createdAt: z.string().nullable().openapi({ description: '创建时间 ISO（数据库暂无此字段时返回 null）' }),
    updatedAt: z.string().nullable().openapi({ description: '更新时间 ISO（数据库暂无此字段时返回 null）' }),
  })
  .openapi({ description: '角色详情（含权限和用户数）' })

export type AdminRoleDetail = z.infer<typeof AdminRoleDetailSchema>

export const AdminRoleDetailResponseSchema = z
  .object({
    role: AdminRoleDetailSchema,
  })
  .openapi({ description: '角色详情响应' })

export type AdminRoleDetailResponse = z.infer<typeof AdminRoleDetailResponseSchema>

export const UpdateRoleResponseSchema = AdminRoleDetailResponseSchema.openapi({
  description: '编辑角色响应',
})

export type UpdateRoleResponse = z.infer<typeof UpdateRoleResponseSchema>
