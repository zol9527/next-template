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
