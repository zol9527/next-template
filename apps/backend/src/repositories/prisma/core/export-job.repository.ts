import { prisma } from '@/lib/prisma'
import type { ExportJobRepository } from '@/repositories/interfaces/core/export-job.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import type { ExportJobResponse } from '@/contracts/dtos/export.dto'
import type { BuyersPaymentExportRow } from '@/contracts/dtos/export-buyers.dto'
import type { PromotersCommissionExportRow } from '@/plugins/promotion/contracts/export-promoters.dto'
import type { ExportJob } from '@/lib/prisma/generated/prisma'

/**
 * Function: mapExportJob
 *
 * Description: 将 Prisma ExportJob 模型映射为 DTO
 *
 * Parameters:
 *   job(ExportJob): Prisma ExportJob 模型
 *
 * Returns:
 *   response(ExportJobResponse): 导出任务响应 DTO
 */
function mapExportJob(job: ExportJob): ExportJobResponse {
  return {
    id: job.id,
    jobType: job.jobType as ExportJobResponse['jobType'],
    status: job.status as ExportJobResponse['status'],
    requestedBy: job.requestedBy,
    fileUrl: job.fileUrl,
    fileName: job.fileName,
    fileSize: job.fileSize ? Number(job.fileSize) : null,
    recordCount: job.recordCount,
    errorMessage: job.errorMessage,
    filters: job.filters,
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  }
}

/**
 * Function: maskPhoneNumber
 *
 * Description: 脱敏手机号（保留前 3 位和后 4 位）
 *
 * Parameters:
 *   phone(string): 原始手机号
 *
 * Returns:
 *   masked(string): 脱敏后的手机号
 */
function maskPhoneNumber(phone: string | null): string {
  if (!phone) return ''
  const str = phone.trim()
  if (str.length < 7) return str
  return str.substring(0, 3) + '****' + str.substring(str.length - 4)
}

/**
 * 创建 Prisma 导出任务仓库
 */
export function createPrismaExportJobRepository(): ExportJobRepository {
  return {
    /**
     * Function: createExportJob
     *
     * Description: 创建导出任务
     */
    async createExportJob(
      ctx: RepoContext,
      params: { jobType: string; requestedBy: string; filters: Record<string, unknown> }
    ): Promise<ExportJobResponse> {
      const { logger } = ctx
      logger.info({ action: 'create_export_job', jobType: params.jobType, requestedBy: params.requestedBy })

      const job = await prisma.exportJob.create({
        data: {
          jobType: params.jobType,
          requestedBy: params.requestedBy,
          filters: JSON.stringify(params.filters),
          status: 'pending',
        },
      })

      return mapExportJob(job)
    },

    /**
     * Function: getExportJobById
     *
     * Description: 根据 ID 获取导出任务
     */
    async getExportJobById(ctx: RepoContext, params: { id: string }): Promise<ExportJobResponse | null> {
      const { logger } = ctx
      logger.info({ action: 'get_export_job_by_id', id: params.id })

      const job = await prisma.exportJob.findUnique({ where: { id: params.id } })
      if (!job) return null
      return mapExportJob(job)
    },

    /**
     * Function: listExportJobs
     *
     * Description: 列出导出任务（游标分页）
     */
    async listExportJobs(
      ctx: RepoContext,
      params: {
        jobType?: string
        status?: string
        limit?: number
        cursor?: string | null
      }
    ): Promise<{ items: ExportJobResponse[]; nextCursor: string | null }> {
      const { logger } = ctx
      logger.info({ action: 'list_export_jobs', jobType: params.jobType, status: params.status })

      const limit = Math.max(1, Math.min(params.limit ?? 20, 100))
      const where: Record<string, unknown> = {}

      if (params.jobType) where.jobType = params.jobType
      if (params.status) where.status = params.status

      const [items] = await Promise.all([
        prisma.exportJob.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit + 1, // 多取一个用于判断是否有下一页
          cursor: params.cursor ? { id: params.cursor } : undefined,
          skip: params.cursor ? 1 : 0,
        }),
        prisma.exportJob.count({ where }),
      ])

      let nextCursor: string | null = null
      if (items.length > limit) {
        const nextItem = items.pop()
        nextCursor = nextItem!.id
      }

      return {
        items: items.map(mapExportJob),
        nextCursor,
      }
    },

    /**
     * Function: updateExportJobStatus
     *
     * Description: 更新导出任务状态
     */
    async updateExportJobStatus(
      ctx: RepoContext,
      params: {
        id: string
        status: string
        fileUrl?: string
        fileName?: string
        fileSize?: number
        recordCount?: number
        errorMessage?: string
      }
    ): Promise<ExportJobResponse> {
      const { logger } = ctx
      logger.info({ action: 'update_export_job_status', id: params.id, status: params.status })

      const data: Record<string, unknown> = { status: params.status }

      if (params.fileUrl !== undefined) data.fileUrl = params.fileUrl
      if (params.fileName !== undefined) data.fileName = params.fileName
      if (params.fileSize !== undefined) data.fileSize = BigInt(params.fileSize)
      if (params.recordCount !== undefined) data.recordCount = params.recordCount
      if (params.errorMessage !== undefined) data.errorMessage = params.errorMessage

      // 设置时间戳
      if (params.status === 'processing' && !params.errorMessage) {
        data.startedAt = new Date()
      }
      if (params.status === 'completed' || params.status === 'failed') {
        data.completedAt = new Date()
      }

      const job = await prisma.exportJob.update({
        where: { id: params.id },
        data,
      })

      return mapExportJob(job)
    },

    /**
     * Function: getBuyersPaymentData
     *
     * Description: 获取购买者支付记录数据（用户聚合）
     */
    async getBuyersPaymentData(
      ctx: RepoContext,
      params: {
        startTime?: string
        endTime?: string
        status?: string
        productId?: string
      }
    ): Promise<BuyersPaymentExportRow[]> {
      const { logger } = ctx
      logger.info({ action: 'get_buyers_payment_data', filters: params })

      // 构建时间筛选条件
      const paymentWhere: Record<string, unknown> = {}

      if (params.startTime || params.endTime) {
        paymentWhere.createdAt = {}
        if (params.startTime) (paymentWhere.createdAt as Record<string, unknown>).gte = new Date(params.startTime)
        if (params.endTime) (paymentWhere.createdAt as Record<string, unknown>).lte = new Date(params.endTime)
      }

      if (params.status) {
        paymentWhere.status = params.status
      }

      // 构建产品筛选条件
      const orderWhere: Record<string, unknown> = {}

      if (params.productId) {
        orderWhere.productId = params.productId
      }

      // 使用 Prisma 的聚合查询，按用户分组统计支付信息
      const result = await prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT
          u.id as userId,
          u.username as userName,
          u.phone as userPhone,
          COUNT(DISTINCT o.id) as orderCount,
          COALESCE(SUM(CAST(p.amount AS INTEGER)), 0) as totalAmount,
          COALESCE(SUM(CASE WHEN p.status = 'success' THEN CAST(p.amount AS INTEGER) ELSE 0 END), 0) as successAmount,
          COALESCE(SUM(CAST(o.refunded_amount AS INTEGER)), 0) as refundedAmount,
          MAX(p.created_at) as lastPaymentAt,
          u.created_at as createdAt
        FROM users u
        INNER JOIN orders o ON o.user_id = u.id
        INNER JOIN payments p ON p.order_id = o.id
        WHERE 1=1
          ${params.startTime ? prisma.$queryRaw`AND p.created_at >= ${new Date(params.startTime)}` : prisma.$queryRaw``}
          ${params.endTime ? prisma.$queryRaw`AND p.created_at <= ${new Date(params.endTime)}` : prisma.$queryRaw``}
          ${params.status ? prisma.$queryRaw`AND p.status = ${params.status}` : prisma.$queryRaw``}
          ${params.productId ? prisma.$queryRaw`AND o.product_id = ${params.productId}` : prisma.$queryRaw``}
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `

      return result.map((row) => ({
        userId: row.userId as string,
        userName: (row.userName as string | null) ?? null,
        userPhone: maskPhoneNumber(row.userPhone as string | null),
        orderCount: Number(row.orderCount as bigint),
        totalAmount: row.totalAmount as bigint,
        successAmount: row.successAmount as bigint,
        refundedAmount: row.refundedAmount as bigint,
        lastPaymentAt: (row.lastPaymentAt as Date | null)?.toISOString() ?? null,
        createdAt: (row.createdAt as Date)?.toISOString() ?? new Date().toISOString(),
      }))
    },

    /**
     * Function: getPromotersCommissionData
     *
     * Description: 获取推广员佣金记录数据（推广员聚合）
     */
    async getPromotersCommissionData(
      ctx: RepoContext,
      params: {
        startTime?: string
        endTime?: string
        settlementStatus?: string
        promoterLevel?: string
      }
    ): Promise<PromotersCommissionExportRow[]> {
      const { logger } = ctx
      logger.info({ action: 'get_promoters_commission_data', filters: params })

      // 使用 Prisma 的聚合查询，按推广员分组统计佣金信息
      const result = await prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT
          u.id as promoterId,
          u.username as promoterName,
          u.phone as promoterPhone,
          pl.name as promoterLevel,
          COUNT(DISTINCT cr.order_id) as referralOrderCount,
          COALESCE(SUM(CAST(cr.base_amount AS INTEGER)), 0) as totalSalesAmount,
          COALESCE(SUM(CAST(cr.commission_amount AS INTEGER)), 0) as totalCommission,
          COALESCE(SUM(CASE WHEN cr.status = 'frozen' THEN CAST(cr.commission_amount AS INTEGER) ELSE 0 END), 0) as pendingCommission,
          COALESCE(SUM(CASE WHEN cr.status = 'settled' THEN CAST(cr.commission_amount AS INTEGER) ELSE 0 END), 0) as settledCommission,
          COALESCE(COUNT(DISTINCT cr.settlement_id), 0) as settlementCount,
          MAX(s.processed_at) as lastSettlementAt,
          MIN(plr.effective_at) as createdAt
        FROM users u
        INNER JOIN commission_records cr ON cr.promoter_user_id = u.id
        LEFT JOIN promoter_level_records plr ON plr.user_id = u.id
          AND (plr.inactive_at IS NULL OR plr.inactive_at > cr.created_at)
        LEFT JOIN promoter_levels pl ON pl.id = plr.promoter_level_id
        LEFT JOIN settlements s ON s.id = cr.settlement_id
        WHERE 1=1
          ${params.startTime ? prisma.$queryRaw`AND cr.created_at >= ${new Date(params.startTime)}` : prisma.$queryRaw``}
          ${params.endTime ? prisma.$queryRaw`AND cr.created_at <= ${new Date(params.endTime)}` : prisma.$queryRaw``}
          ${params.settlementStatus ? prisma.$queryRaw`AND cr.status = ${params.settlementStatus}` : prisma.$queryRaw``}
          ${params.promoterLevel ? prisma.$queryRaw`AND pl.name = ${params.promoterLevel}` : prisma.$queryRaw``}
        GROUP BY u.id
        ORDER BY MIN(plr.effective_at) DESC
      `

      return result.map((row) => ({
        promoterId: row.promoterId as string,
        promoterName: (row.promoterName as string | null) ?? null,
        promoterPhone: maskPhoneNumber(row.promoterPhone as string | null),
        promoterLevel: (row.promoterLevel as string | null) ?? null,
        referralOrderCount: Number(row.referralOrderCount as bigint),
        totalSalesAmount: row.totalSalesAmount as bigint,
        totalCommission: row.totalCommission as bigint,
        pendingCommission: row.pendingCommission as bigint,
        settledCommission: row.settledCommission as bigint,
        settlementCount: Number(row.settlementCount as bigint),
        lastSettlementAt: (row.lastSettlementAt as Date | null)?.toISOString() ?? null,
        createdAt: (row.createdAt as Date)?.toISOString() ?? new Date().toISOString(),
      }))
    },

    /**
     * Function: getBuyersPaymentDataPaginated
     *
     * Description: 获取购买者支付记录数据（游标分页，按 u.id 排序）
     */
    async getBuyersPaymentDataPaginated(
      ctx: RepoContext,
      params: {
        startTime?: string
        endTime?: string
        status?: string
        productId?: string
        cursor?: string
        limit: number
      }
    ): Promise<{ rows: BuyersPaymentExportRow[]; nextCursor: string | null }> {
      const { logger } = ctx
      logger.info({ action: 'get_buyers_payment_data_paginated', filters: params, cursor: params.cursor, limit: params.limit })

      const safeLimit = Math.max(1, Math.min(params.limit, 5000))

      const result = await prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT
          u.id as userId,
          u.username as userName,
          u.phone as userPhone,
          COUNT(DISTINCT o.id) as orderCount,
          COALESCE(SUM(CAST(p.amount AS INTEGER)), 0) as totalAmount,
          COALESCE(SUM(CASE WHEN p.status = 'success' THEN CAST(p.amount AS INTEGER) ELSE 0 END), 0) as successAmount,
          COALESCE(SUM(CAST(o.refunded_amount AS INTEGER)), 0) as refundedAmount,
          MAX(p.created_at) as lastPaymentAt,
          u.created_at as createdAt
        FROM users u
        INNER JOIN orders o ON o.user_id = u.id
        INNER JOIN payments p ON p.order_id = o.id
        WHERE 1=1
          ${params.startTime ? prisma.$queryRaw`AND p.created_at >= ${new Date(params.startTime)}` : prisma.$queryRaw``}
          ${params.endTime ? prisma.$queryRaw`AND p.created_at <= ${new Date(params.endTime)}` : prisma.$queryRaw``}
          ${params.status ? prisma.$queryRaw`AND p.status = ${params.status}` : prisma.$queryRaw``}
          ${params.productId ? prisma.$queryRaw`AND o.product_id = ${params.productId}` : prisma.$queryRaw``}
          ${params.cursor ? prisma.$queryRaw`AND u.id > ${params.cursor}` : prisma.$queryRaw``}
        GROUP BY u.id
        ORDER BY u.id ASC
        LIMIT ${safeLimit + 1}
      `

      let nextCursor: string | null = null
      const hasMore = result.length > safeLimit
      const rows = hasMore ? result.slice(0, safeLimit) : result

      if (hasMore) {
        const lastRow = rows[rows.length - 1]
        nextCursor = lastRow!.userId as string
      }

      return {
        rows: rows.map((row) => ({
          userId: row.userId as string,
          userName: (row.userName as string | null) ?? null,
          userPhone: maskPhoneNumber(row.userPhone as string | null),
          orderCount: Number(row.orderCount as bigint),
          totalAmount: row.totalAmount as bigint,
          successAmount: row.successAmount as bigint,
          refundedAmount: row.refundedAmount as bigint,
          lastPaymentAt: (row.lastPaymentAt as Date | null)?.toISOString() ?? null,
          createdAt: (row.createdAt as Date)?.toISOString() ?? new Date().toISOString(),
        })),
        nextCursor,
      }
    },

    /**
     * Function: getPromotersCommissionDataPaginated
     *
     * Description: 获取推广员佣金记录数据（游标分页，按 u.id 排序）
     */
    async getPromotersCommissionDataPaginated(
      ctx: RepoContext,
      params: {
        startTime?: string
        endTime?: string
        settlementStatus?: string
        promoterLevel?: string
        cursor?: string
        limit: number
      }
    ): Promise<{ rows: PromotersCommissionExportRow[]; nextCursor: string | null }> {
      const { logger } = ctx
      logger.info({ action: 'get_promoters_commission_data_paginated', filters: params, cursor: params.cursor, limit: params.limit })

      const safeLimit = Math.max(1, Math.min(params.limit, 5000))

      const result = await prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT
          u.id as promoterId,
          u.username as promoterName,
          u.phone as promoterPhone,
          pl.name as promoterLevel,
          COUNT(DISTINCT cr.order_id) as referralOrderCount,
          COALESCE(SUM(CAST(cr.base_amount AS INTEGER)), 0) as totalSalesAmount,
          COALESCE(SUM(CAST(cr.commission_amount AS INTEGER)), 0) as totalCommission,
          COALESCE(SUM(CASE WHEN cr.status = 'frozen' THEN CAST(cr.commission_amount AS INTEGER) ELSE 0 END), 0) as pendingCommission,
          COALESCE(SUM(CASE WHEN cr.status = 'settled' THEN CAST(cr.commission_amount AS INTEGER) ELSE 0 END), 0) as settledCommission,
          COALESCE(COUNT(DISTINCT cr.settlement_id), 0) as settlementCount,
          MAX(s.processed_at) as lastSettlementAt,
          MIN(plr.effective_at) as createdAt
        FROM users u
        INNER JOIN commission_records cr ON cr.promoter_user_id = u.id
        LEFT JOIN promoter_level_records plr ON plr.user_id = u.id
          AND (plr.inactive_at IS NULL OR plr.inactive_at > cr.created_at)
        LEFT JOIN promoter_levels pl ON pl.id = plr.promoter_level_id
        LEFT JOIN settlements s ON s.id = cr.settlement_id
        WHERE 1=1
          ${params.startTime ? prisma.$queryRaw`AND cr.created_at >= ${new Date(params.startTime)}` : prisma.$queryRaw``}
          ${params.endTime ? prisma.$queryRaw`AND cr.created_at <= ${new Date(params.endTime)}` : prisma.$queryRaw``}
          ${params.settlementStatus ? prisma.$queryRaw`AND cr.status = ${params.settlementStatus}` : prisma.$queryRaw``}
          ${params.promoterLevel ? prisma.$queryRaw`AND pl.name = ${params.promoterLevel}` : prisma.$queryRaw``}
          ${params.cursor ? prisma.$queryRaw`AND u.id > ${params.cursor}` : prisma.$queryRaw``}
        GROUP BY u.id
        ORDER BY u.id ASC
        LIMIT ${safeLimit + 1}
      `

      let nextCursor: string | null = null
      const hasMore = result.length > safeLimit
      const rows = hasMore ? result.slice(0, safeLimit) : result

      if (hasMore) {
        const lastRow = rows[rows.length - 1]
        nextCursor = lastRow!.promoterId as string
      }

      return {
        rows: rows.map((row) => ({
          promoterId: row.promoterId as string,
          promoterName: (row.promoterName as string | null) ?? null,
          promoterPhone: maskPhoneNumber(row.promoterPhone as string | null),
          promoterLevel: (row.promoterLevel as string | null) ?? null,
          referralOrderCount: Number(row.referralOrderCount as bigint),
          totalSalesAmount: row.totalSalesAmount as bigint,
          totalCommission: row.totalCommission as bigint,
          pendingCommission: row.pendingCommission as bigint,
          settledCommission: row.settledCommission as bigint,
          settlementCount: Number(row.settlementCount as bigint),
          lastSettlementAt: (row.lastSettlementAt as Date | null)?.toISOString() ?? null,
          createdAt: (row.createdAt as Date)?.toISOString() ?? new Date().toISOString(),
        })),
        nextCursor,
      }
    },
  }
}
