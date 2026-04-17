/**
 * Data Export Service
 *
 * @module services/data-export
 * @description 数据导出服务，负责处理财务数据的 CSV 导出功能
 *
 * =============================================================================
 *
 * 功能特性:
 * - 异步导出任务创建和管理
 * - 支持购买者支付记录和推广员佣金记录导出
 * - 用户级别数据聚合（每个用户一行）
 * - CSV 文件生成并上传到 OSS
 * - 手机号脱敏处理
 *
 * =============================================================================
 *
 * 架构设计:
 * - 依赖注入模式，通过工厂函数创建
 * - 使用 Repository 层访问数据
 * - 使用 CSV Writer 生成文件
 * - 使用 OSS Provider 上传文件
 *
 * =============================================================================
 */

import { Readable } from 'node:stream'
import { Buffer } from 'node:buffer'

import { CsvWriter } from '@/lib/export/csv-writer'
import { AppError } from '@/lib/errors/app-error'
import { ForbiddenError } from '@/lib/errors/app-error'
import { buildSignedDownloadUrl, verifySignedToken } from '@/lib/security/signed-url'
import { getStorageProvider } from '@/lib/storage/helper'
import { env } from '@/config'
import type { ObjectStorageProvider } from '@/lib/storage/types'
import type { ExportJobRepository } from '@/repositories/interfaces/core/export-job.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import type { ExportJobResponse } from '@/contracts/dtos/export.dto'
import type { BuyersPaymentExportRow } from '@/contracts/dtos/export-buyers.dto'
import type { PromotersCommissionExportRow } from '@/plugins/promotion/contracts/export-promoters.dto'
import { BUYERS_PAYMENT_CSV_COLUMNS } from '@/contracts/dtos/export-buyers.dto'
import { PROMOTERS_COMMISSION_CSV_COLUMNS } from '@/plugins/promotion/contracts/export-promoters.dto'

/**
 * 导出任务类型常量
 */
export const EXPORT_JOB_TYPES = {
  BUYERS_PAYMENT: 'buyers_payment',
  PROMOTERS_COMMISSION: 'promoters_commission',
  ORDERS_RECONCILIATION: 'orders_reconciliation',
  REFUNDS: 'refunds',
} as const

/**
 * 文件名生成器配置
 */
const FILENAME_CONFIG = {
  BUYERS_PAYMENT: '购买者支付记录',
  PROMOTERS_COMMISSION: '推广员佣金记录',
  ORDERS_RECONCILIATION: '订单对账记录',
  REFUNDS: '退款记录',
} as const

/** 每批查询的行数 */
const EXPORT_BATCH_SIZE = 1000

/** 内存安全阈值（RSS），超过此值中断导出 */
const MEMORY_RSS_LIMIT_BYTES = 512 * 1024 * 1024

/**
 * Function: checkMemoryUsage
 *
 * Description: 检查当前进程 RSS 是否超过安全阈值，超过则抛出错误中断导出
 */
function checkMemoryUsage(logger: ServiceContext['logger']): void {
  const rss = process.memoryUsage().rss
  if (rss > MEMORY_RSS_LIMIT_BYTES) {
    logger.error(
      { action: 'export:memory_exceeded', rssBytes: rss, limitBytes: MEMORY_RSS_LIMIT_BYTES },
      '导出内存超限，终止任务'
    )
    throw new AppError(507, 'EXPORT_MEMORY_LIMIT', `导出数据量超过内存限制 (RSS: ${Math.round(rss / 1024 / 1024)}MB)`)
  }
}

/**
 * Function: createDataExportService
 *
 * Description: 创建数据导出服务
 *
 * Parameters:
 *   deps(object): 依赖项
 *     exportJobs(ExportJobRepository): 导出任务仓库
 *   ctx(ServiceContext): 服务上下文
 *
 * Returns:
 *   service(object): 数据导出服务实例
 */
export function createDataExportService(
  deps: { exportJobs: ExportJobRepository },
  ctx: ServiceContext
) {
  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  // 使用统一的 Storage Provider 辅助函数获取 OSS 实例
  const ossProvider: ObjectStorageProvider = getStorageProvider()

  return {
    /**
     * Function: createExportJob
     *
     * Description: 创建导出任务
     *
     * Parameters:
     *   params(object): 请求参数
     *     jobType(string): 任务类型
     *     requestedBy(string): 请求者用户 ID
     *     filters(object): 筛选条件
     *
     * Returns:
     *   job(ExportJobResponse): 创建的导出任务
     */
    async createExportJob(params: {
      jobType: string
      requestedBy: string
      filters: Record<string, unknown>
    }): Promise<ExportJobResponse> {
      ctx.logger.info(
        {
          action: 'export:create_job',
          jobType: params.jobType,
          requestedBy: params.requestedBy,
          filters: params.filters,
        },
        'Creating export job'
      )

      // 验证任务类型
      const validJobTypes = Object.values(EXPORT_JOB_TYPES)
      if (!validJobTypes.includes(params.jobType as never)) {
        throw new Error(`Invalid job type: ${params.jobType}. Must be one of: ${validJobTypes.join(', ')}`)
      }

      const job = await deps.exportJobs.createExportJob(repoCtx, {
        jobType: params.jobType,
        requestedBy: params.requestedBy,
        filters: params.filters,
      })

      // 异步执行导出任务（不阻塞响应）
      this.processExportJob(job.id).catch((error) => {
        ctx.logger.error(
          {
            action: 'export:process_failed',
            jobId: job.id,
            error: error.message,
          },
          'Failed to process export job'
        )
      })

      return job
    },

    /**
     * Function: getExportJob
     *
     * Description: 获取导出任务详情
     *
     * Parameters:
     *   id(string): 任务 ID
     *
     * Returns:
     *   job(ExportJobResponse | null): 导出任务，不存在时返回 null
     */
    async getExportJob(id: string): Promise<ExportJobResponse | null> {
      ctx.logger.info({ action: 'export:get_job', jobId: id }, 'Getting export job')

      const job = await deps.exportJobs.getExportJobById(repoCtx, { id })
      if (!job) return null

      if (job.status === 'completed' && job.fileUrl) {
        return {
          ...job,
          fileUrl: buildSignedDownloadUrl(job.id),
        }
      }

      return job
    },

    /**
     * Function: listExportJobs
     *
     * Description: 列出导出任务
     *
     * Parameters:
     *   params(object): 查询参数
     *     jobType(string, optional): 任务类型筛选
     *     status(string, optional): 状态筛选
     *     limit(number): 每页数量
     *     cursor(string, optional): 分页游标
     *
     * Returns:
     *   result(object): 导出任务列表
     *     items(Array<ExportJobResponse>): 任务列表
     *     nextCursor(string | null): 下一页游标
     */
    async listExportJobs(params: {
      jobType?: string
      status?: string
      limit?: number
      cursor?: string | null
    }): Promise<{ items: ExportJobResponse[]; nextCursor: string | null }> {
      ctx.logger.info({ action: 'export:list_jobs', params }, 'Listing export jobs')

      const result = await deps.exportJobs.listExportJobs(repoCtx, params)

      const items = result.items.map((job) => {
        if (job.status === 'completed' && job.fileUrl) {
          return { ...job, fileUrl: buildSignedDownloadUrl(job.id) }
        }
        return job
      })

      return { ...result, items }
    },

    /**
     * Function: processExportJob
     *
     * Description: 处理导出任务（流式分页 CSV 生成，避免 OOM）
     *
     * Parameters:
     *   jobId(string): 任务 ID
     *
     * Returns:
     *   result(object): 处理结果
     *     success(boolean): 是否成功
     *     job(ExportJobResponse): 更新后的任务
     */
    async processExportJob(jobId: string): Promise<{ success: boolean; job: ExportJobResponse }> {
      ctx.logger.info({ action: 'export:process_job', jobId }, 'Processing export job')

      try {
        let job = await deps.exportJobs.updateExportJobStatus(repoCtx, {
          id: jobId,
          status: 'processing',
        })

        const filters = JSON.parse(job.filters) as Record<string, unknown>

        let fileName = ''
        let recordCount = 0

        // 使用流式分页生成 CSV
        const csvBuffer = await (async (): Promise<Buffer> => {
          switch (job.jobType) {
            case EXPORT_JOB_TYPES.BUYERS_PAYMENT: {
              fileName = this.generateFileName(FILENAME_CONFIG.BUYERS_PAYMENT)
              const writer = new CsvWriter(BUYERS_PAYMENT_CSV_COLUMNS)

              const { buffer, totalRows } = await this.streamPaginatedCsvToBuffer<BuyersPaymentExportRow>(
                writer,
                (cursor) => deps.exportJobs.getBuyersPaymentDataPaginated(repoCtx, {
                  startTime: filters.startTime as string | undefined,
                  endTime: filters.endTime as string | undefined,
                  status: filters.status as string | undefined,
                  productId: filters.productId as string | undefined,
                  cursor,
                  limit: EXPORT_BATCH_SIZE,
                })
              )
              recordCount = totalRows
              return buffer
            }

            case EXPORT_JOB_TYPES.PROMOTERS_COMMISSION: {
              fileName = this.generateFileName(FILENAME_CONFIG.PROMOTERS_COMMISSION)
              const writer = new CsvWriter(PROMOTERS_COMMISSION_CSV_COLUMNS)

              const { buffer, totalRows } = await this.streamPaginatedCsvToBuffer<PromotersCommissionExportRow>(
                writer,
                (cursor) => deps.exportJobs.getPromotersCommissionDataPaginated(repoCtx, {
                  startTime: filters.startTime as string | undefined,
                  endTime: filters.endTime as string | undefined,
                  settlementStatus: filters.settlementStatus as string | undefined,
                  promoterLevel: filters.promoterLevel as string | undefined,
                  cursor,
                  limit: EXPORT_BATCH_SIZE,
                })
              )
              recordCount = totalRows
              return buffer
            }

            default:
              throw new Error(`Unsupported job type: ${job.jobType}`)
          }
        })()

        const timestamp = Date.now()
        const key = `exports/${job.jobType}/${timestamp}-${fileName}`

        ctx.logger.info(
          {
            action: 'export:upload_file',
            jobId,
            key,
            size: csvBuffer.length,
            recordCount,
          },
          'Uploading CSV to OSS'
        )

        const uploadResult = await ossProvider.uploadFile({
          file: csvBuffer,
          key,
          contentType: 'text/csv; charset=utf-8',
        })

        job = await deps.exportJobs.updateExportJobStatus(repoCtx, {
          id: jobId,
          status: 'completed',
          fileUrl: uploadResult.key,
          fileName: uploadResult.url.split('/').pop() ?? fileName,
          fileSize: csvBuffer.length,
          recordCount,
        })

        ctx.logger.info(
          {
            action: 'export:job_completed',
            jobId,
            storageKey: uploadResult.key,
            recordCount,
          },
          'Export job completed successfully'
        )

        return { success: true, job }
      } catch (error) {
        ctx.logger.error(
          {
            action: 'export:job_failed',
            jobId,
            error: error instanceof Error ? error.message : String(error),
          },
          'Export job failed'
        )

        const job = await deps.exportJobs.updateExportJobStatus(repoCtx, {
          id: jobId,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : String(error),
        })

        return { success: false, job }
      }
    },

    /**
     * Function: streamPaginatedCsvToBuffer
     *
     * Description: 流式分页获取数据并生成 CSV Buffer。
     *   每批从仓库获取 limit 行数据，通过 Readable 流逐步写入 CSV 行，
     *   避免一次性将全部原始数据加载到内存。
     *
     * Parameters:
     *   writer(CsvWriter): CSV 写入器
     *   fetchPage((cursor?: string) => Promise<{ rows: T[]; nextCursor: string | null }>): 分页获取函数
     *
     * Returns:
     *   result(object): { buffer(Buffer): CSV 内容, totalRows(number): 总行数 }
     */
    async streamPaginatedCsvToBuffer<T>(
      writer: CsvWriter<T>,
      fetchPage: (cursor?: string) => Promise<{ rows: T[]; nextCursor: string | null }>
    ): Promise<{ buffer: Buffer; totalRows: number }> {
      let totalRows = 0
      let cursor: string | undefined

      async function* csvChunks(): AsyncGenerator<string> {
        yield '\uFEFF'
        yield writer.getHeaderString()

        let hasNextPage = true
        while (hasNextPage) {
          checkMemoryUsage(ctx.logger)

          const { rows, nextCursor } = await fetchPage(cursor)
          totalRows += rows.length

          if (rows.length > 0) {
            yield writer.formatRows(rows)
          }

          hasNextPage = nextCursor !== null
          cursor = nextCursor ?? undefined
        }
      }

      const chunks: Buffer[] = []
      const stream = Readable.from(csvChunks())

      for await (const chunk of stream) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf-8') : chunk)
      }

      return { buffer: Buffer.concat(chunks), totalRows }
    },

    /**
     * Function: resolveDownloadFile
     *
     * Description: 解析导出文件下载请求，验证 token 和权限后返回文件信息
     *
     * Parameters:
     *   params(object): 请求参数
     *     jobId(string): 导出任务 ID
     *     token(string): 签名 token
     *     userId(string): 当前请求用户 ID
     *     isAdmin(boolean): 是否为管理员
     *
     * Returns:
     *   result(object): 文件下载信息
     *     storageKey(string): 存储键（OSS key 或本地路径）
     *     fileName(string): 文件名
     *     signedUrl(string): 云存储签名 URL（仅云存储）
     *     provider(string): 存储提供者类型
     */
    async resolveDownloadFile(params: {
      jobId: string
      token: string
      userId: string
      isAdmin: boolean
    }): Promise<{ storageKey: string; fileName: string; signedUrl?: string }> {
      const { jobId, token, userId, isAdmin } = params

      ctx.logger.info({ action: 'export:resolve_download', jobId }, 'Resolving export download')

      const tokenResult = verifySignedToken(token, jobId)
      if (!tokenResult.valid) {
        ctx.logger.warn(
          { action: 'export:invalid_token', jobId, reason: tokenResult.reason },
          'Download token verification failed'
        )
        throw new ForbiddenError(`下载链接无效或已过期: ${tokenResult.reason}`)
      }

      const job = await deps.exportJobs.getExportJobById(repoCtx, { id: jobId })
      if (!job) {
        throw new AppError(404, 'NOT_FOUND', '导出任务不存在')
      }

      if (job.status !== 'completed' || !job.fileUrl) {
        throw new AppError(400, 'EXPORT_NOT_READY', '导出文件尚未就绪')
      }

      if (job.requestedBy !== userId && !isAdmin) {
        ctx.logger.warn(
          { action: 'export:download_forbidden', jobId, requestedBy: job.requestedBy, userId },
          'User not authorized to download export file'
        )
        throw new ForbiddenError('无权下载此导出文件')
      }

      const storageKey = job.fileUrl

      const storageProvider = getStorageProvider()
      const providerType = env.OSS_PROVIDER

      if (providerType === 'local') {
        return { storageKey, fileName: job.fileName ?? 'export.csv' }
      }

      const signedUrl = await storageProvider.getSignedUrl(storageKey, 30 * 60)
      return { storageKey, fileName: job.fileName ?? 'export.csv', signedUrl }
    },

    /**
     * Function: generateFileName
     *
     * Description: 生成导出文件名
     *
     * Parameters:
     *   prefix(string): 文件名前缀
     *
     * Returns:
     *   fileName(string): 文件名（带日期时间戳）
     */
    generateFileName(prefix: string): string {
      const now = new Date()
      const date = now.toISOString().split('T')[0] // YYYY-MM-DD
      const time = now.toTimeString().split(' ')[0].replace(/:/g, '') // HHMMSS
      return `${prefix}_${date}_${time}.csv`
    },
  }
}

/**
 * 导出类型定义
 */
export type DataExportService = ReturnType<typeof createDataExportService>
