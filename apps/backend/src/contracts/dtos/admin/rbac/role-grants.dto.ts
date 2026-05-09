/**
 * File: role-grants.dto.ts
 * Description: 后台 RBAC 角色 Grant 管理相关 DTO（scope × action 矩阵模式）
 */

import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { GrantSchema } from '@/contracts/dtos/rbac/access.dto'

extendZodWithOpenApi(z)

export const AdminRbacRoleGrantsResponseSchema = z
  .object({
    roleId: z.string().uuid().openapi({ description: '角色 ID' }),
    grants: z.array(GrantSchema).openapi({ description: '该角色拥有的 Grant 列表' }),
  })
  .openapi({ description: '后台 RBAC 角色 Grant 查询响应' })

export type AdminRbacRoleGrantsResponse = z.infer<typeof AdminRbacRoleGrantsResponseSchema>

export const AdminRbacUpdateRoleGrantsRequestSchema = z
  .object({
    grants: z.array(GrantSchema).openapi({ description: '要设置的 Grant 列表（覆盖模式）' }),
  })
  .openapi({ description: '后台 RBAC 更新角色 Grant 请求（覆盖模式）' })

export type AdminRbacUpdateRoleGrantsRequest = z.infer<typeof AdminRbacUpdateRoleGrantsRequestSchema>

export const AdminRbacUpdateRoleGrantsResponseSchema = AdminRbacRoleGrantsResponseSchema.openapi({
  description: '后台 RBAC 更新角色 Grant 响应',
})

export type AdminRbacUpdateRoleGrantsResponse = z.infer<typeof AdminRbacUpdateRoleGrantsResponseSchema>
