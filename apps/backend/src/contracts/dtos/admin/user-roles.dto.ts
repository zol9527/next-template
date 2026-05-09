import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { RoleDtoSchema } from '@/contracts/dtos/rbac/role.dto'

extendZodWithOpenApi(z)

export const AdminUserRolesResponseSchema = z
  .object({
    userId: z.string().uuid().openapi({ description: '用户 ID' }),
    roles: z.array(RoleDtoSchema).openapi({ description: '用户当前拥有的角色列表' }),
  })
  .openapi({ description: '后台用户角色列表响应' })

export type AdminUserRolesResponse = z.infer<typeof AdminUserRolesResponseSchema>

export const AdminAssignUserRoleRequestSchema = z
  .object({
    roleId: z.string().uuid().openapi({ description: '要分配的角色 ID' }),
  })
  .openapi({ description: '后台给用户分配角色请求' })

export type AdminAssignUserRoleRequest = z.infer<typeof AdminAssignUserRoleRequestSchema>

export const AdminRemoveUserRoleRequestSchema = z
  .object({
    roleId: z.string().uuid().openapi({ description: '要移除的角色 ID' }),
  })
  .openapi({ description: '后台移除用户角色请求' })

export type AdminRemoveUserRoleRequest = z.infer<typeof AdminRemoveUserRoleRequestSchema>

export const AdminSetUserRolesRequestSchema = z
  .object({
    roleIds: z.array(z.string().uuid()).openapi({ description: '要设置的角色 ID 列表（覆盖模式）' }),
  })
  .openapi({ description: '后台设置用户角色请求（覆盖模式）' })

export type AdminSetUserRolesRequest = z.infer<typeof AdminSetUserRolesRequestSchema>
