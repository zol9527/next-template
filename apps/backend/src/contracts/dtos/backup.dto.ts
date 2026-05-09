import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// ─── 枚举 ─────────────────────────────────────────

/**
 * 备份任务类型
 */
export const BackupJobTypeEnum = z.enum(['db_backup', 'full_backup', 'db_restore', 'full_restore'])

/**
 * 备份任务状态
 */
export const BackupJobStatusEnum = z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled'])

// ─── 创建备份请求 ─────────────────────────────────

/**
 * 创建备份任务请求
 */
export const CreateBackupRequestSchema = z
  .object({
    jobType: BackupJobTypeEnum.openapi({
      description: '备份任务类型',
    }),
  })
  .openapi({ description: '创建备份任务请求' })

export type CreateBackupRequest = z.infer<typeof CreateBackupRequestSchema>

// ─── 创建恢复请求 ─────────────────────────────────

/**
 * 创建恢复任务请求
 */
export const CreateRestoreRequestSchema = z
  .object({
    jobType: z.enum(['db_restore', 'full_restore']).openapi({
      description: '恢复任务类型',
    }),
    backupFileKey: z.string().openapi({ description: '备份 ZIP 文件的 objectKey' }),
  })
  .openapi({ description: '创建恢复任务请求' })

export type CreateRestoreRequest = z.infer<typeof CreateRestoreRequestSchema>

// ─── 预估请求 ─────────────────────────────────────

/**
 * 预估请求
 */
export const EstimateRequestSchema = z
  .object({
    jobType: z.enum(['db_backup', 'full_backup']).openapi({
      description: '备份任务类型（用于预估）',
    }),
  })
  .openapi({ description: '预估请求' })

export type EstimateRequest = z.infer<typeof EstimateRequestSchema>

// ─── 备份任务响应 ─────────────────────────────────

/**
 * 备份任务响应
 */
export const BackupJobResponseSchema = z
  .object({
    id: z.string().openapi({ description: '任务 ID' }),
    jobType: BackupJobTypeEnum.openapi({ description: '任务类型' }),
    status: BackupJobStatusEnum.openapi({ description: '任务状态' }),
    requestedBy: z.string().openapi({ description: '请求者' }),
    backupFileKey: z.string().nullable().openapi({ description: '备份文件 key' }),
    stats: z.record(z.string(), z.unknown()).nullable().openapi({ description: '实时统计' }),
    errorMessage: z.string().nullable().openapi({ description: '错误信息' }),
    startedAt: z.string().nullable().openapi({ description: '开始时间（ISO 8601）' }),
    completedAt: z.string().nullable().openapi({ description: '完成时间（ISO 8601）' }),
    createdAt: z.string().openapi({ description: '创建时间（ISO 8601）' }),
    updatedAt: z.string().openapi({ description: '更新时间（ISO 8601）' }),
  })
  .openapi({ description: '备份任务响应' })

export type BackupJobResponse = z.infer<typeof BackupJobResponseSchema>

// ─── 任务列表响应 ─────────────────────────────────

/**
 * 备份任务列表响应
 */
export const BackupJobListResponseSchema = z
  .object({
    items: z.array(BackupJobResponseSchema).openapi({ description: '任务列表' }),
    nextCursor: z.string().nullable().openapi({ description: '下一页游标' }),
    total: z.number().openapi({ description: '总数' }),
  })
  .openapi({ description: '备份任务列表响应' })

export type BackupJobListResponse = z.infer<typeof BackupJobListResponseSchema>

// ─── 任务列表查询参数 ─────────────────────────────

/**
 * 列表查询参数
 */
export const ListBackupJobsQuerySchema = z
  .object({
    status: BackupJobStatusEnum.optional().openapi({ description: '筛选任务状态' }),
    jobType: BackupJobTypeEnum.optional().openapi({ description: '筛选任务类型' }),
    cursor: z.string().optional().openapi({ description: '分页游标' }),
    limit: z.coerce.number().min(1).max(100).optional().openapi({ description: '每页数量' }),
  })
  .openapi({ description: '列表查询参数' })

export type ListBackupJobsQuery = z.infer<typeof ListBackupJobsQuerySchema>

// ─── ID 参数 ──────────────────────────────────────

/**
 * 任务 ID 参数
 */
export const BackupJobIdParamsSchema = z.object({
  id: z.string().openapi({ description: '任务 ID' }),
})

// ─── 下载查询参数 ─────────────────────────────────

/**
 * 下载查询参数
 */
export const BackupDownloadQuerySchema = z.object({
  token: z.string().min(1).openapi({ description: '签名下载 token' }),
})

export type BackupDownloadQuery = z.infer<typeof BackupDownloadQuerySchema>

// ─── 实时统计响应 ─────────────────────────────────

/**
 * 实时统计响应
 */
export const BackupStatsResponseSchema = z
  .object({
    phase: z.string().nullable().openapi({ description: '当前阶段' }),
    tablesTotal: z.number().openapi({ description: '总表数' }),
    tablesCompleted: z.number().openapi({ description: '已完成表数' }),
    totalRows: z.number().openapi({ description: '总行数' }),
    filesCompleted: z.number().openapi({ description: '已完成文件数' }),
    filesTotal: z.number().openapi({ description: '总文件数' }),
    bytesTransferred: z.number().openapi({ description: '已传输字节' }),
    errors: z.array(z.string()).openapi({ description: '错误列表' }),
  })
  .openapi({ description: '实时统计响应' })

export type BackupStatsResponse = z.infer<typeof BackupStatsResponseSchema>

// ─── 预估响应 ─────────────────────────────────────

/**
 * 预估响应
 */
export const EstimateResponseSchema = z
  .object({
    estimatedTables: z.number().openapi({ description: '预估表数' }),
    estimatedRows: z.number().openapi({ description: '预估行数' }),
    estimatedFiles: z.number().openapi({ description: '预估文件数' }),
    estimatedTotalBytes: z.number().openapi({ description: '预估总字节数' }),
    estimatedDurationSeconds: z.number().openapi({ description: '预估耗时（秒）' }),
    estimatedZipSizeMB: z.number().openapi({ description: '预估 ZIP 大小（MB）' }),
  })
  .openapi({ description: '预估响应' })

export type EstimateResponse = z.infer<typeof EstimateResponseSchema>
