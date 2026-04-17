import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// ============================================================
// 推广员佣金记录导出 DTO
// ============================================================

/**
 * 推广员佣金记录导出请求
 */
export const ExportPromotersCommissionRequestSchema = z
  .object({
    startTime: z.string().datetime().optional().openapi({ description: '开始时间（ISO 8601）' }),
    endTime: z.string().datetime().optional().openapi({ description: '结束时间（ISO 8601）' }),
    settlementStatus: z
      .enum(['pending', 'settled', 'failed'])
      .optional()
      .openapi({ description: '结算状态筛选' }),
    promoterLevel: z.string().optional().openapi({ description: '推广员等级筛选' }),
  })
  .openapi({ description: '推广员佣金记录导出请求' })

export type ExportPromotersCommissionRequest = z.infer<typeof ExportPromotersCommissionRequestSchema>

/**
 * 推广员佣金记录行数据（用于 CSV 生成）
 *
 * 单行包含一个推广员的汇总信息：
 * - 推广员基本信息
 * - 佣金统计（累计、待结算、已结算）
 * - 推广业绩（订单数、销售额）
 * - 结算信息
 */
export interface PromotersCommissionExportRow {
  /** 推广员 ID */
  promoterId: string
  /** 推广员名称 */
  promoterName: string | null
  /** 推广员手机号（脱敏处理） */
  promoterPhone: string
  /** 推广员等级 */
  promoterLevel: string | null
  /** 推荐订单总数 */
  referralOrderCount: number
  /** 推广销售额（分） */
  totalSalesAmount: bigint
  /** 累计佣金（分） */
  totalCommission: bigint
  /** 待结算佣金（分） */
  pendingCommission: bigint
  /** 已结算佣金（分） */
  settledCommission: bigint
  /** 结算次数 */
  settlementCount: number
  /** 最后一笔结算时间 */
  lastSettlementAt: string | null
  /** 成为推广员时间 */
  createdAt: string
}

/**
 * CSV 列定义：推广员佣金记录
 */
export const PROMOTERS_COMMISSION_CSV_COLUMNS = [
  { key: 'promoterId', header: '推广员ID' },
  { key: 'promoterName', header: '推广员名称' },
  { key: 'promoterPhone', header: '手机号' },
  { key: 'promoterLevel', header: '推广员等级' },
  { key: 'referralOrderCount', header: '推荐订单数' },
  { key: 'totalSalesAmount', header: '推广销售额(元)', formatter: (value: unknown) => formatFenToYuan(value) },
  { key: 'totalCommission', header: '累计佣金(元)', formatter: (value: unknown) => formatFenToYuan(value) },
  { key: 'pendingCommission', header: '待结算佣金(元)', formatter: (value: unknown) => formatFenToYuan(value) },
  { key: 'settledCommission', header: '已结算佣金(元)', formatter: (value: unknown) => formatFenToYuan(value) },
  { key: 'settlementCount', header: '结算次数' },
  { key: 'lastSettlementAt', header: '最后结算时间', formatter: (value: unknown) => formatDateToYYYYMMDD(value as string | null | undefined) },
  { key: 'createdAt', header: '成为推广员时间', formatter: (value: unknown) => formatDateToYYYYMMDD(value as string | null | undefined) },
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
