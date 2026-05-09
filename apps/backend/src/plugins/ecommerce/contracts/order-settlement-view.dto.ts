import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

/**
 * 订单结算视图项 Schema
 * 整合订单、佣金、结算单、结算申请信息，用于结算管理页面的订单视图
 */
export const AdminOrderSettlementViewItemSchema = z
  .object({
    // 订单信息
    orderId: z.string().uuid().openapi({ description: '订单 ID' }),
    orderNo: z.string().nullable().openapi({ description: '订单号（业务订单号，如 ORD-xxxx）' }),

    // 佣金信息
    commissionId: z.string().uuid().openapi({ description: '佣金记录 ID' }),
    promoterUserId: z.string().uuid().openapi({ description: '推广员 ID' }),
    promoterUsername: z.string().nullable().openapi({ description: '推广员用户名' }),
    productId: z.string().uuid().nullable().openapi({ description: '商品 ID' }),
    productName: z.string().nullable().openapi({ description: '商品名称' }),
    commissionAmount: z.string().openapi({ description: '佣金金额（decimal string）' }),
    commissionStatus: z
      .enum(['frozen', 'payable', 'settling', 'settled', 'failed', 'voided'])
      .openapi({ description: '佣金状态' }),
    rate: z.string().openapi({ description: '佣金比例（decimal string）' }),

    // 结算单信息
    settlementId: z.string().uuid().nullable().openapi({ description: '结算单 ID（已结算时）' }),
    settlementStatus: z.string().nullable().openapi({ description: '结算单状态（pending/processed/failed）' }),

    // 结算申请信息
    applicationId: z.string().uuid().nullable().openapi({ description: '结算申请 ID' }),
    applicationStatus: z
      .enum(['pending', 'approved', 'rejected', 'paid', 'failed'])
      .nullable()
      .openapi({ description: '结算申请状态' }),

    // 时间信息
    orderCreatedAt: z.string().openapi({ description: '订单创建时间（ISO 字符串）' }),
    commissionCreatedAt: z.string().openapi({ description: '佣金创建时间（ISO 字符串）' }),
  })
  .openapi({ description: '订单结算视图项' })

export type AdminOrderSettlementViewItem = z.infer<typeof AdminOrderSettlementViewItemSchema>

export const AdminOrderSettlementViewListResponseSchema = z
  .object({
    items: z.array(AdminOrderSettlementViewItemSchema).openapi({ description: '订单视图列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标' }),
    totalCount: z.number().openapi({ description: '总记录数' }),
  })
  .openapi({ description: '订单结算视图列表响应' })

export type AdminOrderSettlementViewListResponse = z.infer<typeof AdminOrderSettlementViewListResponseSchema>

export const AdminOrderSettlementViewQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(20).openapi({ description: '分页大小（默认 20，最大 50）' }),
    cursor: z.string().nullable().optional().openapi({ description: '分页游标（可选）' }),
    status: z.string().nullable().optional().openapi({ description: '按佣金状态过滤（可选）' }),
    orderNo: z.string().nullable().optional().openapi({ description: '按订单号搜索（模糊匹配，可选）' }),
    keyword: z.string().nullable().optional().openapi({ description: '关键词搜索：订单号或推广员用户名（可选）' }),
  })
  .openapi({ description: '订单结算视图查询参数' })

export type AdminOrderSettlementViewQuery = z.infer<typeof AdminOrderSettlementViewQuerySchema>
