import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const DistributionRelationSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '分销关系 ID' }),
    userId: z.string().uuid().openapi({ description: '被绑定的用户 ID（下单用户）' }),
    promoterUserId: z.string().uuid().openapi({ description: '推广人用户 ID' }),
    effectiveAt: z.string().openapi({ description: '生效时间（ISO 字符串）' }),
    inactiveAt: z.string().nullable().openapi({ description: '失效时间（ISO 字符串）' }),
    createdAt: z.string().openapi({ description: '创建时间（ISO 字符串）' }),
  })
  .openapi({ description: '分销关系' })

export type DistributionRelation = z.infer<typeof DistributionRelationSchema>

export const BindDistributionRequestSchema = z
  .object({
    promoterUserId: z.string().uuid().openapi({ description: '推广人用户 ID' }),
  })
  .openapi({ description: '绑定分销关系请求' })

export type BindDistributionRequest = z.infer<typeof BindDistributionRequestSchema>

export const BindDistributionResponseSchema = z
  .object({
    relation: DistributionRelationSchema.openapi({ description: '绑定后的分销关系' }),
  })
  .openapi({ description: '绑定分销关系响应' })

export type BindDistributionResponse = z.infer<typeof BindDistributionResponseSchema>

export const ApplySettlementRequestSchema = z
  .object({
    amount: z.string().openapi({ description: '申请提现金额' }),
    paymentMethod: z.string().optional().default('wechat_transfer').openapi({ description: '支付方式' }),
    paymentAccount: z.string().optional().openapi({ description: '支付账号' }),
  })
  .openapi({ description: '申请提现请求' })

export type ApplySettlementRequest = z.infer<typeof ApplySettlementRequestSchema>
