import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const SettlementApplicationStatusSchema = z
  .enum(['pending', 'approved', 'rejected', 'paid', 'failed'])
  .openapi({ description: '结算申请状态' })

export const AdminSettlementApplicationSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '申请 ID' }),
    promoterUserId: z.string().uuid().openapi({ description: '推广人 ID' }),
    amount: z.string().openapi({ description: '申请金额' }),
    status: SettlementApplicationStatusSchema.openapi({ description: '状态' }),
    paymentMethod: z.string().openapi({ description: '支付方式' }),
    paymentAccount: z.string().nullable().openapi({ description: '支付账号' }),
    rejectionReason: z.string().nullable().openapi({ description: '拒绝原因' }),
    reviewerId: z.string().uuid().nullable().openapi({ description: '审核人 ID' }),
    settlementId: z.string().uuid().nullable().openapi({ description: '关联结算单 ID' }),
    createdAt: z.string().openapi({ description: '创建时间' }),
    updatedAt: z.string().openapi({ description: '更新时间' }),
  })
  .openapi({ description: '后台结算申请' })

export type AdminSettlementApplication = z.infer<typeof AdminSettlementApplicationSchema>

export const ReviewSettlementApplicationRequestSchema = z
  .object({
    action: z.enum(['approve', 'reject']).openapi({ description: '审核动作' }),
    rejectionReason: z.string().optional().openapi({ description: '拒绝原因（仅在 reject 时有效）' }),
  })
  .openapi({ description: '审核结算申请请求' })

export type ReviewSettlementApplicationRequest = z.infer<typeof ReviewSettlementApplicationRequestSchema>

export const AdminSettlementApplicationListResponseSchema = z
  .object({
    items: z.array(AdminSettlementApplicationSchema).openapi({ description: '结算申请列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标' }),
    totalCount: z.number().int().nonnegative().openapi({ description: '总记录数' }),
  })
  .openapi({ description: '后台结算申请列表响应' })

export type AdminSettlementApplicationListResponse = z.infer<typeof AdminSettlementApplicationListResponseSchema>

export const AdminSettlementApplicationListQuerySchema = z
  .object({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(50)
      .openapi({ description: '分页大小' }),
    cursor: z.string().nullable().optional().openapi({ description: '分页游标' }),
    status: SettlementApplicationStatusSchema.nullable().optional().openapi({ description: '按状态过滤' }),
    promoterUserId: z.string().uuid().nullable().optional().openapi({ description: '按推广人用户 ID 过滤（ABAC 内部使用）' }),
  })
  .openapi({ description: '后台结算申请列表查询参数' })

export type AdminSettlementApplicationListQuery = z.infer<typeof AdminSettlementApplicationListQuerySchema>
