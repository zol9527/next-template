import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// ============================================================
// ExportJob 相关 DTO
// ============================================================

/**
 * 导出任务类型
 */
export const ExportJobTypeEnum = z.enum([
  'buyers_payment', // 购买者支付记录
  'promoters_commission', // 推广员佣金记录
  'orders_reconciliation', // 订单对账
  'refunds', // 退款记录
])

/**
 * 导出任务状态
 */
export const ExportJobStatusEnum = z.enum([
  'pending', // 等待处理
  'processing', // 处理中
  'completed', // 已完成
  'failed', // 失败
])

/**
 * 导出任务创建请求
 */
export const CreateExportJobRequestSchema = z
  .object({
    jobType: ExportJobTypeEnum.openapi({
      description: '导出任务类型',
    }),
    filters: z
      .record(z.string(), z.any())
      .optional()
      .openapi({ description: '筛选条件（JSON 格式）' }),
  })
  .openapi({ description: '创建导出任务请求' })

export type CreateExportJobRequest = z.infer<typeof CreateExportJobRequestSchema>

/**
 * 导出任务响应
 */
export const ExportJobResponseSchema = z
  .object({
    id: z.string().openapi({ description: '任务 ID' }),
    jobType: ExportJobTypeEnum.openapi({ description: '任务类型' }),
    status: ExportJobStatusEnum.openapi({ description: '任务状态' }),
    requestedBy: z.string().openapi({ description: '请求者用户 ID' }),
    fileUrl: z.string().nullable().optional().openapi({ description: '文件下载 URL' }),
    fileName: z.string().nullable().optional().openapi({ description: '文件名' }),
    fileSize: z.number().nullable().optional().openapi({ description: '文件大小（字节）' }),
    recordCount: z.number().nullable().optional().openapi({ description: '记录数量' }),
    errorMessage: z.string().nullable().optional().openapi({ description: '错误信息' }),
    filters: z.string().openapi({ description: '筛选条件（JSON 字符串）' }),
    startedAt: z.string().nullable().optional().openapi({ description: '开始时间（ISO 8601）' }),
    completedAt: z.string().nullable().optional().openapi({ description: '完成时间（ISO 8601）' }),
    createdAt: z.string().openapi({ description: '创建时间（ISO 8601）' }),
    updatedAt: z.string().openapi({ description: '更新时间（ISO 8601）' }),
  })
  .openapi({ description: '导出任务响应' })

export type ExportJobResponse = z.infer<typeof ExportJobResponseSchema>

/**
 * 导出任务列表查询
 */
export const ListExportJobsQuerySchema = z
  .object({
    jobType: ExportJobTypeEnum.optional().openapi({ description: '筛选任务类型' }),
    status: ExportJobStatusEnum.optional().openapi({ description: '筛选任务状态' }),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20).openapi({ description: '每页数量' }),
    cursor: z.string().nullable().optional().openapi({ description: '分页游标' }),
  })
  .openapi({ description: '导出任务列表查询参数' })

export type ListExportJobsQuery = z.infer<typeof ListExportJobsQuerySchema>

/**
 * 导出任务列表响应
 */
export const ExportJobListResponseSchema = z
  .object({
    items: z.array(ExportJobResponseSchema).openapi({ description: '导出任务列表' }),
    nextCursor: z.string().nullable().optional().openapi({ description: '下一页游标' }),
    total: z.number().optional().openapi({ description: '总数（如果支持）' }),
  })
  .openapi({ description: '导出任务列表响应' })

export type ExportJobListResponse = z.infer<typeof ExportJobListResponseSchema>

/**
 * 路径参数 Schema
 */
export const ExportJobIdParamsSchema = z.object({
  id: z.string().openapi({ description: '导出任务 ID' }),
})

/**
 * 导出文件下载查询参数
 */
export const ExportDownloadQuerySchema = z.object({
  token: z.string().min(1).openapi({ description: '签名 token' }),
})

export type ExportDownloadQuery = z.infer<typeof ExportDownloadQuerySchema>

