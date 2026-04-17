import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// ============================================================
// 购买者支付记录导出 DTO
// ============================================================

/**
 * 购买者支付记录导出请求
 */
export const ExportBuyersPaymentRequestSchema = z
  .object({
    startTime: z.string().datetime().optional().openapi({ description: '开始时间（ISO 8601）' }),
    endTime: z.string().datetime().optional().openapi({ description: '结束时间（ISO 8601）' }),
    status: z
      .enum(['success', 'pending', 'failed', 'refunded'])
      .optional()
      .openapi({ description: '支付状态筛选' }),
    productId: z.string().optional().openapi({ description: '产品 ID 筛选' }),
  })
  .openapi({ description: '购买者支付记录导出请求' })

export type ExportBuyersPaymentRequest = z.infer<typeof ExportBuyersPaymentRequestSchema>

/**
 * 购买者支付记录行数据（用于 CSV 生成）
 *
 * 单行包含一个用户的汇总信息：
 * - 用户基本信息
 * - 支付总金额、订单总数
 * - 最后一笔支付时间
 * - 支付状态分布
 */
export interface BuyersPaymentExportRow {
  /** 用户 ID */
  userId: string
  /** 用户名称 */
  userName: string | null
  /** 手机号（脱敏处理） */
  userPhone: string
  /** 订单总数 */
  orderCount: number
  /** 支付总金额（分） */
  totalAmount: bigint
  /** 成功支付金额（分） */
  successAmount: bigint
  /** 退款金额（分） */
  refundedAmount: bigint
  /** 最后一笔支付时间 */
  lastPaymentAt: string | null
  /** 创建账号时间 */
  createdAt: string
}

/**
 * CSV 列定义：购买者支付记录
 */
export const BUYERS_PAYMENT_CSV_COLUMNS = [
  { key: 'userId', header: '用户ID' },
  { key: 'userName', header: '用户名称' },
  { key: 'userPhone', header: '手机号' },
  { key: 'orderCount', header: '订单总数' },
  { key: 'totalAmount', header: '支付总金额(元)', formatter: (value: unknown) => formatFenToYuan(value) },
  { key: 'successAmount', header: '成功支付金额(元)', formatter: (value: unknown) => formatFenToYuan(value) },
  { key: 'refundedAmount', header: '退款金额(元)', formatter: (value: unknown) => formatFenToYuan(value) },
  { key: 'lastPaymentAt', header: '最后支付时间', formatter: (value: unknown) => formatDateToYYYYMMDD(value as string | null | undefined) },
  { key: 'createdAt', header: '注册时间', formatter: (value: unknown) => formatDateToYYYYMMDD(value as string | null | undefined) },
] as const

/**
 * 辅助函数：格式化金额（分转元）
 */
function formatFenToYuan(fen: unknown): string {
  if (typeof fen !== 'bigint' && typeof fen !== 'number' && typeof fen !== 'string') {
    return '0.00'
  }
  const yuan = typeof fen === 'bigint' ? Number(fen) : typeof fen === 'string' ? parseFloat(fen) : fen
  return (yuan / 100).toFixed(2)
}

/**
 * 辅助函数：格式化日期为 YYYY-MM-DD
 */
function formatDateToYYYYMMDD(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return dateStr.split('T')[0]
}
