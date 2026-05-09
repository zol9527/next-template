import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const CommissionRuleScopeSchema = z
  .enum(['global', 'product', 'category'])
  .openapi({ description: '佣金规则范围' })

export const AdminCommissionRuleSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '规则 ID' }),
    scope: CommissionRuleScopeSchema.openapi({ description: '范围' }),
    scopeId: z.string().uuid().nullable().openapi({ description: '范围 ID（如商品 ID 或分类 ID）' }),
    rate: z.string().openapi({ description: '佣金比例（decimal string）' }),
    activeFrom: z.string().openapi({ description: '生效时间' }),
    activeTo: z.string().nullable().openapi({ description: '失效时间' }),
    createdAt: z.string().openapi({ description: '创建时间' }),
    updatedAt: z.string().openapi({ description: '更新时间' }),
  })
  .openapi({ description: '后台佣金规则' })

export type AdminCommissionRule = z.infer<typeof AdminCommissionRuleSchema>

export const CreateCommissionRuleRequestSchema = z
  .object({
    scope: CommissionRuleScopeSchema.openapi({ description: '范围' }),
    scopeId: z.string().uuid().nullable().optional().openapi({ description: '范围 ID' }),
    rate: z.string().openapi({ description: '佣金比例' }),
    activeFrom: z.string().optional().openapi({ description: '生效时间' }),
    activeTo: z.string().nullable().optional().openapi({ description: '失效时间' }),
  })
  .openapi({ description: '创建佣金规则请求' })

export type CreateCommissionRuleRequest = z.infer<typeof CreateCommissionRuleRequestSchema>

export const UpdateCommissionRuleRequestSchema = z
  .object({
    rate: z.string().optional().openapi({ description: '佣金比例' }),
    activeFrom: z.string().optional().openapi({ description: '生效时间' }),
    activeTo: z.string().nullable().optional().openapi({ description: '失效时间' }),
  })
  .openapi({ description: '更新佣金规则请求' })

export type UpdateCommissionRuleRequest = z.infer<typeof UpdateCommissionRuleRequestSchema>

export const AdminCommissionRuleListResponseSchema = z
  .object({
    items: z.array(AdminCommissionRuleSchema).openapi({ description: '佣金规则列表' }),
  })
  .openapi({ description: '后台佣金规则列表响应' })

export type AdminCommissionRuleListResponse = z.infer<typeof AdminCommissionRuleListResponseSchema>

export const AdminCommissionRuleListQuerySchema = z
  .object({
    scope: CommissionRuleScopeSchema.optional().openapi({ description: '佣金规则范围' }),
    scopeId: z.string().uuid().optional().openapi({ description: '范围 ID' }),
  })
  .openapi({ description: '后台佣金规则列表查询参数' })

export type AdminCommissionRuleListQuery = z.infer<typeof AdminCommissionRuleListQuerySchema>
