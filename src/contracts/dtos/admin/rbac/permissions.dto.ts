import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { ACTIONS } from '@/config/access/access-actions'

extendZodWithOpenApi(z)

export const ScopeEntrySchema = z
  .object({
    scope: z.string().min(1).openapi({ description: 'Scope 标识（如 users、orders.promoter）' }),
    description: z.string().openapi({ description: 'Scope 描述' }),
    actions: z.array(z.enum(ACTIONS)).openapi({ description: '该 scope 支持的 action 列表' }),
  })
  .openapi({ description: 'Scope 条目' })

export type ScopeEntry = z.infer<typeof ScopeEntrySchema>

export const AdminRbacScopesResponseSchema = z
  .object({
    scopes: z.array(ScopeEntrySchema).openapi({ description: '系统支持的所有 scope 列表' }),
  })
  .openapi({ description: '后台 RBAC Scope 列表响应' })

export type AdminRbacScopesResponse = z.infer<typeof AdminRbacScopesResponseSchema>
