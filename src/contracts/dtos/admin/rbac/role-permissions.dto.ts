import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { GrantSchema } from '@/contracts/dtos/rbac/access.dto'

extendZodWithOpenApi(z)

export const AdminRbacRolePermissionsResponseSchema = z
  .object({
    roleId: z.string().uuid().openapi({ description: '角色 ID' }),
    grants: z.array(GrantSchema).openapi({ description: '该角色拥有的 Grant 列表' }),
  })
  .openapi({ description: '后台 RBAC 角色权限查询响应' })

export type AdminRbacRolePermissionsResponse = z.infer<typeof AdminRbacRolePermissionsResponseSchema>

export const AdminRbacUpdateRolePermissionsRequestSchema = z
  .object({
    grants: z.array(GrantSchema).openapi({ description: '要设置的 Grant 列表（覆盖模式）' }),
  })
  .openapi({ description: '后台 RBAC 更新角色权限请求' })

export type AdminRbacUpdateRolePermissionsRequest = z.infer<typeof AdminRbacUpdateRolePermissionsRequestSchema>

export const AdminRbacUpdateRolePermissionsResponseSchema = AdminRbacRolePermissionsResponseSchema.openapi({
  description: '后台 RBAC 更新角色权限响应',
})

export type AdminRbacUpdateRolePermissionsResponse = z.infer<typeof AdminRbacUpdateRolePermissionsResponseSchema>
