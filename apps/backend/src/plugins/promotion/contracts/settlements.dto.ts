import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const AdminSettlementSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '结算单 ID' }),
    status: z.string().openapi({ description: '结算状态（如 pending/processed/failed）' }),
    totalAmount: z.string().openapi({ description: '结算总金额（decimal 字符串）' }),
    currencyCode: z.string().openapi({ description: '币种（默认 CNY）' }),
    createdBy: z.string().uuid().openapi({ description: '创建人（管理员用户 ID）' }),
    createdAt: z.string().openapi({ description: '创建时间 ISO' }),
    processedAt: z.string().nullable().openapi({ description: '处理完成时间 ISO（可为空）' }),
    updatedAt: z.string().openapi({ description: '更新时间 ISO' }),
  })
  .openapi({ description: '后台结算单' })

export type AdminSettlement = z.infer<typeof AdminSettlementSchema>

export const AdminCreateSettlementRequestSchema = z
  .object({
    commissionRecordIds: z.array(z.string().uuid()).min(1).openapi({ description: '需要结算的佣金记录 ID 列表' }),
  })
  .openapi({ description: '创建结算单请求' })

export type AdminCreateSettlementRequest = z.infer<typeof AdminCreateSettlementRequestSchema>

export const AdminCreateSettlementResponseSchema = z
  .object({
    settlement: AdminSettlementSchema.openapi({ description: '创建后的结算单' }),
  })
  .openapi({ description: '创建结算单响应' })

export type AdminCreateSettlementResponse = z.infer<typeof AdminCreateSettlementResponseSchema>

export const AdminSettlementListResponseSchema = z
  .object({
    items: z.array(AdminSettlementSchema).openapi({ description: '结算单列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标' }),
  })
  .openapi({ description: '后台结算单列表响应' })

export type AdminSettlementListResponse = z.infer<typeof AdminSettlementListResponseSchema>

export const AdminSettlementListQuerySchema = z
  .object({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(20)
      .openapi({ description: '分页大小' }),
    cursor: z.string().nullable().optional().openapi({ description: '分页游标' }),
    status: z.string().nullable().optional().openapi({ description: '状态过滤' }),
    settlementId: z.string().uuid().nullable().optional().openapi({ description: '按 ID 过滤' }),
  })
  .openapi({ description: '后台结算单列表查询参数' })

export type AdminSettlementListQuery = z.infer<typeof AdminSettlementListQuerySchema>
