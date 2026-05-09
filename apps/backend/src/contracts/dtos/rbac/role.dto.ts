import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const RoleDtoSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '角色 ID' }),
    name: z.string().min(1).openapi({ description: '角色标识（如 admin、user）' }),
    description: z.string().optional().openapi({ description: '角色描述' }),
  })
  .openapi({ description: '角色 DTO' })

export type RoleDto = z.infer<typeof RoleDtoSchema>
