/**
 * File: access.dto.ts
 * Description: Grant and AccessRequest Zod schemas
 */

import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const GrantSchema = z
  .object({
    action: z.enum(['read', 'write', 'execute']),
    scope: z.string().min(1),
  })
  .openapi({ description: '授权规则：角色拥有的 action + scope 组合' })

export type GrantDto = z.infer<typeof GrantSchema>

export const AccessRequestSchema = z
  .object({
    action: z.enum(['read', 'write', 'execute']),
    scope: z.string().min(1),
  })
  .openapi({ description: '权限请求：一次 access check 的参数' })

export type AccessRequestDto = z.infer<typeof AccessRequestSchema>
