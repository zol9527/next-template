import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

export const AdminCommissionStatusSchema = z
  .enum(['frozen', 'payable', 'settling', 'settled', 'failed', 'voided'])
  .openapi({ description: '佣金状态' })

export type AdminCommissionStatus = z.infer<typeof AdminCommissionStatusSchema>

export const AdminCommissionRecordSchema = z
  .object({
    id: z.string().uuid().openapi({ description: '佣金记录 ID' }),
    orderId: z.string().uuid().openapi({ description: '订单 ID' }),
    orderNo: z.string().nullable().openapi({ description: '订单号（业务订单号，如 ORD-xxxx）' }),
    promoterUserId: z.string().uuid().openapi({ description: '推广人用户 ID' }),
    promoterUsername: z.string().nullable().openapi({ description: '推广者用户名' }),
    productId: z.string().uuid().nullable().openapi({ description: '商品 ID' }),
    productName: z.string().nullable().openapi({ description: '商品名称' }),
    baseAmount: z.string().openapi({ description: '佣金基数金额（decimal string）' }),
    rate: z.string().openapi({ description: '佣金比例（decimal string，最多 6 位小数）' }),
    rateSource: z
      .enum(['promoter_level', 'global_rule'])
      .nullable()
      .optional()
      .openapi({ description: '佣金比例来源（promoter_level=推广员等级，global_rule=全局规则），用于审计' }),
    commissionAmount: z.string().openapi({ description: '佣金金额（decimal string）' }),
    status: AdminCommissionStatusSchema.openapi({ description: '佣金状态（如 frozen/payable/settled）' }),
    settlementId: z.string().uuid().nullable().openapi({ description: '关联结算单 ID（可为空）' }),
    createdAt: z.string().openapi({ description: '创建时间（ISO 字符串）' }),
    updatedAt: z.string().openapi({ description: '更新时间（ISO 字符串）' }),
  })
  .openapi({ description: '后台佣金记录' })

export type AdminCommissionRecord = z.infer<typeof AdminCommissionRecordSchema>

export const AdminCommissionListResponseSchema = z
  .object({
    items: z.array(AdminCommissionRecordSchema).openapi({ description: '佣金记录列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标（createdAt），为空表示无更多数据' }),
    totalCount: z.number().openapi({ description: '符合条件的记录总数' }),
  })
  .openapi({ description: '后台佣金列表响应' })

export type AdminCommissionListResponse = z.infer<typeof AdminCommissionListResponseSchema>

export const AdminCommissionListQuerySchema = z
  .object({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(50)
      .openapi({ description: '分页大小（默认 50，最大 50）' }),
    cursor: z.string().nullable().optional().openapi({ description: '分页游标（可选）' }),
    status: AdminCommissionStatusSchema.nullable().optional().openapi({ description: '按佣金状态过滤（可选）' }),
    promoterUserId: z.string().uuid().nullable().optional().openapi({ description: '按推广人用户 ID 过滤（可选）' }),
    orderNo: z.string().nullable().optional().openapi({ description: '按订单号搜索（模糊匹配，可选）' }),
    keyword: z.string().nullable().optional().openapi({ description: '关键词搜索：推广员用户名或订单号（可选）' }),
  })
  .openapi({ description: '后台佣金列表查询参数' })

export type AdminCommissionListQuery = z.infer<typeof AdminCommissionListQuerySchema>
