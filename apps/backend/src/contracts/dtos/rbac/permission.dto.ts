import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const PermissionDtoSchema = z
  .object({
    id: z.union([z.number(), z.string()]).optional().openapi({ description: '权限 ID（数据库主键，数字或 UUID）' }),
    slug: z.string().min(1).openapi({ description: '权限标识（canonical 格式，如 users.read、orders.write）' }),
    name: z.string().optional().openapi({ description: '权限显示名称' }),
    module: z.string().optional().openapi({ description: '模块标识（仅用于前端展示分组，不作为权限判断依据）' }),
    description: z.string().nullable().optional().openapi({ description: '权限描述' }),
  })
  .openapi({ description: '权限 DTO' })

export type PermissionDto = z.infer<typeof PermissionDtoSchema>
