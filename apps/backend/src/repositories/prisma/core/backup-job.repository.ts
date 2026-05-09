import { prisma } from '@/lib/prisma'
import type { BackupJobRepository, BackupJobFilters } from '@/repositories/interfaces/core/backup-job.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import type { BackupJob } from '@/lib/prisma/generated/prisma'

/**
 * Function: mapBackupJob
 *
 * Description: 将 Prisma BackupJob 模型映射为接口返回类型
 *
 * Parameters:
 *   job(BackupJob): Prisma BackupJob 模型
 *
 * Returns:
 *   mapped(object): 映射后的备份任务对象
 */
function mapBackupJob(job: BackupJob): {
  id: string
  jobType: string
  status: string
  requestedBy: string
  backupFileKey: string | null
  stats: Record<string, unknown> | null
  errorMessage: string | null
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
} {
  // 数据库中 stats 字段为 String? 类型，需要 JSON.parse 反序列化
  let parsedStats: Record<string, unknown> | null = null
  if (job.stats) {
    if (typeof job.stats === 'string') {
      try {
        parsedStats = JSON.parse(job.stats) as Record<string, unknown>
      } catch {
        parsedStats = null
      }
    } else if (typeof job.stats === 'object') {
      parsedStats = job.stats as Record<string, unknown>
    }
  }

  return {
    id: job.id,
    jobType: job.jobType,
    status: job.status,
    requestedBy: job.requestedBy,
    backupFileKey: job.backupFileKey,
    stats: parsedStats,
    errorMessage: job.errorMessage,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  }
}

/**
 * 创建 Prisma 备份任务仓库
 */
export function createPrismaBackupJobRepository(): BackupJobRepository {
  return {
    /**
     * Function: createBackupJob
     *
     * Description: 创建新的备份/恢复任务
     */
    async createBackupJob(
      params: { jobType: string; requestedBy: string },
      ctx: RepoContext
    ): Promise<{ id: string }> {
      const { logger } = ctx
      const { jobType, requestedBy } = params

      logger.info({ action: 'backup-job:create', jobType, requestedBy })

      const job = await prisma.backupJob.create({
        data: { jobType, requestedBy, status: 'pending' },
      })

      return { id: job.id }
    },

    /**
     * Function: getBackupJobById
     *
     * Description: 根据 ID 获取任务详情
     */
    async getBackupJobById(
      id: string,
      ctx: RepoContext
    ): Promise<{
      id: string
      jobType: string
      status: string
      requestedBy: string
      backupFileKey: string | null
      stats: Record<string, unknown> | null
      errorMessage: string | null
      startedAt: Date | null
      completedAt: Date | null
      createdAt: Date
      updatedAt: Date
    } | null> {
      const { logger } = ctx

      logger.info({ action: 'backup-job:getById', id })

      const job = await prisma.backupJob.findUnique({ where: { id } })

      if (!job) {
        return null
      }

      return mapBackupJob(job)
    },

    /**
     * Function: listBackupJobs
     *
     * Description: 分页查询任务列表
     */
    async listBackupJobs(
      filters: BackupJobFilters,
      ctx: RepoContext
    ): Promise<{
      items: Array<{
        id: string
        jobType: string
        status: string
        requestedBy: string
        backupFileKey: string | null
        errorMessage: string | null
        createdAt: Date
        updatedAt: Date
      }>
      nextCursor: string | null
      total: number
    }> {
      const { logger } = ctx
      const { status, jobType, cursor, limit = 20 } = filters

      logger.info({ action: 'backup-job:list', status, jobType, cursor, limit })

      const where: Record<string, unknown> = {}

      if (status) {
        where.status = status
      }

      if (jobType) {
        where.jobType = jobType
      }

      const safeLimit = Math.min(Math.max(limit, 1), 100)

      const items = await prisma.backupJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: safeLimit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      })

      const hasMore = items.length > safeLimit
      const rows = hasMore ? items.slice(0, -1) : items
      const nextCursor = hasMore ? rows[rows.length - 1]?.id ?? null : null

      return {
        items: rows.map((job) => ({
          id: job.id,
          jobType: job.jobType,
          status: job.status,
          requestedBy: job.requestedBy,
          backupFileKey: job.backupFileKey,
          errorMessage: job.errorMessage,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
        })),
        nextCursor,
        total: rows.length,
      }
    },

    /**
     * Function: updateBackupJobStatus
     *
     * Description: 更新任务状态和附加数据
     */
    async updateBackupJobStatus(
      params: {
        id: string
        status: string
        backupFileKey?: string
        stats?: Record<string, unknown>
        errorMessage?: string
        startedAt?: Date
        completedAt?: Date
      },
      ctx: RepoContext
    ): Promise<void> {
      const { logger } = ctx
      const { id, status, backupFileKey, stats, errorMessage, startedAt, completedAt } = params

      logger.info({ action: 'backup-job:updateStatus', id, status })

      const data: Record<string, unknown> = { status }

      if (backupFileKey !== undefined) {
        data.backupFileKey = backupFileKey
      }

      if (stats !== undefined) {
        // 数据库中 stats 字段为 String? 类型，需要 JSON.stringify 序列化
        data.stats = stats ? JSON.stringify(stats) : null
      }

      if (errorMessage !== undefined) {
        data.errorMessage = errorMessage
      }

      if (startedAt !== undefined) {
        data.startedAt = startedAt
      }

      if (completedAt !== undefined) {
        data.completedAt = completedAt
      }

      await prisma.backupJob.update({
        where: { id },
        data,
      })
    },

    /**
     * Function: getActiveJobCount
     *
     * Description: 获取当前活跃（pending/processing）的任务数
     */
    async getActiveJobCount(ctx: RepoContext): Promise<number> {
      const { logger } = ctx

      logger.info({ action: 'backup-job:activeCount' })

      const count = await prisma.backupJob.count({
        where: { status: { in: ['pending', 'processing'] } },
      })

      return count
    },
  }
}
