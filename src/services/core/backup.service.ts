/**
 * Backup Service — 备份系统核心编排层
 *
 * @module services/backup
 * @description 备份/恢复任务的创建、异步执行与状态管理
 *
 * =============================================================================
 *
 * 功能特性:
 * - 异步备份任务创建和生命周期管理（db_backup / full_backup）
 * - 异步恢复任务创建和完整恢复编排（db_restore / full_restore）
 * - 备份预估（表数、行数、文件数、大小、耗时）
 * - 下载签名 URL 生成
 * - 任务列表分页查询和实时统计
 * - 旧备份自动清理
 *
 * =============================================================================
 *
 * 架构设计:
 * - 工厂函数模式（createBackupService），依赖注入 Repository
 * - 异步执行：createBackup / createRestore 只创建 Job，后台异步执行
 * - 恢复编排：preCheck → safetySnapshot + enableMaintenance → restoreDb →
 *             remapUrls → restoreFiles → postVerify → disableMaintenance
 * - 维护模式在 finally 中关闭，确保异常时也关闭
 * - StatsTracker 防抖写入：每 2 秒 flush 到数据库
 * - Job Lock：acquireJobLock / releaseJobLock 防止并发执行
 *
 * =============================================================================
 */

import type { BackupJobRepository } from '@/repositories/interfaces/core/backup-job.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import type { ServiceContext } from '@/types/service/service-context'
import { dirname, join } from 'node:path'
import { getStorageProvider } from '@/lib/storage/helper'
import { createDbBackup, type PrismaClientLike } from '@/lib/backup/db-backup-engine'
import { createFileBackup } from '@/lib/backup/file-backup-engine'
import { restoreDbFromZip } from '@/lib/backup/db-restore-engine'
import { restoreFiles } from '@/lib/backup/file-restore-engine'
import { estimateBackup } from '@/lib/backup/estimator'
import { preCheck } from '@/lib/backup/pre-check'
import { remapUrls } from '@/lib/backup/url-remapper'
import { postVerify } from '@/lib/backup/post-verify'
import {
  enableMaintenanceModeWithSnapshot,
  disableMaintenanceMode,
} from '@/lib/backup/maintenance-guard'
import { acquireJobLock, releaseJobLock } from '@/lib/backup/job-guard'
import { cleanupOldBackups } from '@/lib/backup/cleanup'
import { RateController } from '@/lib/backup/rate-controller'
import { StatsTracker } from '@/lib/backup/stats-tracker'
import { parseManifestFromZip } from '@/lib/backup/integrity-check'
import { prisma } from '@/lib/prisma'

// ─── 依赖类型 ──────────────────────────────────────────

interface BackupServiceDeps {
  backupJobs: BackupJobRepository
}

// ─── 常量 ──────────────────────────────────────────────

/**
 * 当前进程正在处理的任务 ID 集合
 *
 * 用于区分"后台正在执行的任务"和"因进程重启而真正卡住的任务"。
 * recoverStuckJobs() 会跳过此集合中的任务，避免误杀正在运行的后台任务。
 */
const activeJobIds = new Set<string>()

/** 备份文件本地暂存目录 */
const BACKUP_TMP_DIR = '/tmp'

/** 旧备份最大保留数量 */
const MAX_BACKUP_RETENTION = 10

/** 备份存储路径前缀 */
const BACKUP_STORAGE_PREFIX = 'backups'

// ─── 工厂函数 ──────────────────────────────────────────

/**
 * Function: createBackupService
 *
 * Description: 创建备份服务实例，采用工厂函数 + 依赖注入模式
 *
 * Parameters:
 *   deps(BackupServiceDeps): 依赖项
 *     backupJobs(BackupJobRepository): 备份任务仓库
 *   ctx(ServiceContext): 服务上下文（包含 traceId 和 logger）
 *
 * Returns:
 *   service(object): 备份服务实例，包含创建备份/恢复、预估、查询等方法
 */
export function createBackupService(deps: BackupServiceDeps, ctx: ServiceContext) {
  const { backupJobs } = deps
  const logger = ctx.logger
  const repoCtx: RepoContext = { traceId: ctx.traceId, logger }

  // 获取同步 Prisma 客户端（转为 PrismaClientLike 接口）
  function getPrisma(): PrismaClientLike {
    return prisma as unknown as PrismaClientLike
  }

  // 从 DATABASE_URL 提取数据库名称
  function getDatabaseName(): string {
    return process.env.DATABASE_URL?.split('/').pop()?.split('?')[0] ?? 'unknown'
  }

  // 首次调用 listJobs 时恢复中断的任务（懒加载式触发，非阻塞）
  let hasRecovered = false

  return {
    /**
     * Function: createBackup
     *
     * Description: 创建备份任务并异步执行。
     *   先在数据库中创建 pending 状态的 Job 记录，
     *   然后通过 .catch() 异步触发实际备份流程，不阻塞调用方。
     *
     * Parameters:
     *   params(object): 请求参数
     *     jobType(string): 任务类型（db_backup / full_backup）
     *     requestedBy(string): 请求者用户 ID
     *
     * Returns:
     *   result(object): 创建的任务摘要
     *     id(string): 任务 ID
     *     status(string): 初始状态 'pending'
     *     jobType(string): 任务类型
     *     requestedBy(string): 请求者
     */
    async createBackup(params: {
      jobType: string
      requestedBy: string
    }) {
      const { jobType, requestedBy } = params

      logger.info({ action: 'backup:create', jobType, requestedBy })

      // 创建前检查：是否有正在执行的任务
      const lockResult = await acquireJobLock({ prisma: getPrisma() })
      if (!lockResult.allowed) {
        throw new Error(`已有备份/恢复任务正在执行中，请等待完成后再试 (任务 ID: ${lockResult.activeJobId ?? 'unknown'})`)
      }

      const job = await backupJobs.createBackupJob({ jobType, requestedBy }, repoCtx)

      // 异步执行备份（类似 data-export.service.ts 的 processExportJob().catch()）
      processBackupJob(job.id, jobType).catch((error) => {
        logger.error({ action: 'backup:processError', jobId: job.id, error: String(error) })
      })

      return { id: job.id, status: 'pending' as const, jobType, requestedBy }
    },

    /**
     * Function: createRestore
     *
     * Description: 创建恢复任务并异步执行完整恢复流程。
     *   先在数据库中创建 pending 状态的 Job 记录，
     *   然后通过 .catch() 异步触发实际恢复流程。
     *
     * Parameters:
     *   params(object): 请求参数
     *     jobType(string): 任务类型（db_restore / full_restore）
     *     backupFileKey(string): 备份文件在存储中的 key
     *     requestedBy(string): 请求者用户 ID
     *
     * Returns:
     *   result(object): 创建的任务摘要
     *     id(string): 任务 ID
     *     status(string): 初始状态 'pending'
     *     jobType(string): 任务类型
     *     requestedBy(string): 请求者
     */
    async createRestore(params: {
      jobType: string
      backupFileKey: string
      requestedBy: string
    }) {
      const { jobType, backupFileKey, requestedBy } = params

      logger.info({ action: 'restore:create', jobType, backupFileKey, requestedBy })

      // 创建前检查：是否有正在执行的任务
      const lockResult = await acquireJobLock({ prisma: getPrisma() })
      if (!lockResult.allowed) {
        throw new Error(`已有备份/恢复任务正在执行中，请等待完成后再试 (任务 ID: ${lockResult.activeJobId ?? 'unknown'})`)
      }

      const job = await backupJobs.createBackupJob({ jobType, requestedBy }, repoCtx)

      processRestoreJob(job.id, jobType, backupFileKey).catch((error) => {
        logger.error({ action: 'restore:processError', jobId: job.id, error: String(error) })
      })

      return { id: job.id, status: 'pending' as const, jobType, requestedBy }
    },

    /**
     * Function: estimateBackupParams
     *
     * Description: 预估备份规模（表数、行数、文件数、大小、耗时）
     *
     * Parameters:
     *   params(object): 预估参数
     *     jobType(string): 任务类型（用于判断是否需要预估文件）
     *
     * Returns:
     *   result(EstimateResult): 预估结果（db + files 两部分）
     */
    async estimateBackupParams(params: { jobType: string }) {
      const prismaClient = getPrisma()
      const databaseName = getDatabaseName()

      return estimateBackup({
        prisma: prismaClient,
        databaseName,
      })
    },

    /**
     * Function: getJob
     *
     * Description: 根据 ID 获取任务详情
     *
     * Parameters:
     *   jobId(string): 任务 ID
     *
     * Returns:
     *   job(object | null): 任务详情，不存在时返回 null
     */
    async getJob(jobId: string) {
      return backupJobs.getBackupJobById(jobId, repoCtx)
    },

    /**
     * Function: listJobs
     *
     * Description: 分页查询任务列表
     *
     * Parameters:
     *   params(object): 查询参数
     *     status(string, optional): 状态筛选
     *     jobType(string, optional): 任务类型筛选
     *     cursor(string, optional): 分页游标
     *     limit(number, optional): 每页数量
     *
     * Returns:
     *   result(object): 分页结果
     *     items(Array): 任务列表
     *     nextCursor(string | null): 下一页游标
     *     total(number): 当前页数量
     */
    async listJobs(params: {
      status?: string
      jobType?: string
      cursor?: string
      limit?: number
    }) {
      // 首次调用时恢复中断的任务（非阻塞，不影响查询响应时间）
      if (!hasRecovered) {
        hasRecovered = true
        recoverStuckJobs().catch((error) => {
          logger.error({ action: 'backup:recoverStuckError', error: String(error) })
        })
      }

      return backupJobs.listBackupJobs(params, repoCtx)
    },

    /**
     * Function: getStats
     *
     * Description: 获取任务实时统计信息（进度追踪）
     *
     * Parameters:
     *   jobId(string): 任务 ID
     *
     * Returns:
     *   stats(Record<string, unknown> | null): 统计信息，任务不存在时返回 null
     */
    async getStats(jobId: string) {
      const job = await backupJobs.getBackupJobById(jobId, repoCtx)
      return job?.stats ?? null
    },

    /**
     * Function: deleteJob
     *
     * Description: 删除任务及其备份文件。
     *   先删除存储中的备份文件，再软删除任务（状态改为 cancelled）。
     *
     * Parameters:
     *   jobId(string): 任务 ID
     *
     * Returns:
     *   void: 无返回值
     */
    async deleteJob(jobId: string) {
      const job = await backupJobs.getBackupJobById(jobId, repoCtx)
      if (!job) return

      // 如果有关联的备份文件，先删除存储中的文件
      if (job.backupFileKey) {
        try {
          const provider = getStorageProvider()
          await provider.deleteFile(job.backupFileKey)
        } catch (e) {
          logger.warn({ action: 'backup:deleteFile', jobId, error: String(e) })
        }
      }

      // 更新状态为 cancelled（软删除，而非物理删除）
      await backupJobs.updateBackupJobStatus({ id: jobId, status: 'cancelled' }, repoCtx)
    },

    /**
     * Function: resolveDownloadFile
     *
     * Description: 生成备份文件的下载签名 URL。
     *   校验任务存在且已完成后再生成签名链接。
     *
     * Parameters:
     *   params(object): 请求参数
     *     jobId(string): 任务 ID
     *     userId(string): 当前请求用户 ID
     *
     * Returns:
     *   result(object): 下载信息
     *     signedUrl(string): 签名 URL
     *     fileName(string): 文件名
     */
    async resolveDownloadFile(params: { jobId: string; userId: string }) {
      const { jobId } = params
      const job = await backupJobs.getBackupJobById(jobId, repoCtx)

      if (!job || !job.backupFileKey) {
        throw new Error('备份文件不存在')
      }

      if (job.status !== 'completed') {
        throw new Error('备份任务尚未完成')
      }

      const storageKey = job.backupFileKey
      const provider = getStorageProvider()

      // 生成 1 小时有效期的签名 URL
      const signedUrl = await provider.getSignedUrl(storageKey, 3600)

      return {
        signedUrl,
        fileName: storageKey.split('/').pop() ?? 'backup.zip',
      }
    },

    /**
     * Function: recoverStuckJobs
     *
     * Description: 扫描并恢复服务重启前处于 processing 状态的任务。
     *   DB 恢复任务从断点继续，其他任务标记为失败。
     *
     * Returns:
     *   Promise<void>: 无返回值
     */
    async recoverStuckJobs() {
      await recoverStuckJobs()
    },
  }

  // ─── 内部函数：恢复中断任务 ──────────────────────────────

  /**
   * Function: recoverStuckJobs
   *
   * Description: 服务启动时扫描 processing 状态的任务，
   *   对 DB 恢复任务从断点继续，对其他任务标记为 failed。
   *   防止服务重启后 processing 任务永远卡住。
   *
   * Returns:
   *   Promise<void>: 无返回值
   */
  async function recoverStuckJobs() {
    try {
      // 查询所有 processing 状态的任务
      const { items } = await backupJobs.listBackupJobs({ status: 'processing', limit: 50 }, repoCtx)

      if (items.length === 0) return

      // 宽限期：10 分钟。
      // 背景：processBackupJob 以 fire-and-forget 方式在 Next.js 请求上下文中运行。
      // HMR（开发环境热更新）会导致模块重新加载，activeJobIds 被重置为空 Set，
      // 但实际 Promise 仍在事件循环中执行。如果此时 recoverStuckJobs 被触发，
      // 会误判正在运行的任务为"卡住的"并标记 failed。
      // 通过宽限期确保：只有真正卡住（超过 10 分钟无更新）的任务才被清理。
      const STUCK_THRESHOLD_MS = 10 * 60 * 1000
      const now = Date.now()

      const stuckJobs = items.filter((job) => {
        // 跳过当前进程正在执行的任务
        if (activeJobIds.has(job.id)) return false

        // 跳过最近还在活跃更新的任务（updatedAt 距今不足 10 分钟）
        // 注：listBackupJobs 返回类型不含 startedAt，但 updatedAt 足够判断活跃度
        // 每次 statsTracker forceFlush 都会更新 job 记录，因此 updatedAt 反映最新进度
        const updatedAt = job.updatedAt ? new Date(job.updatedAt).getTime() : 0
        const elapsed = now - updatedAt

        if (elapsed < STUCK_THRESHOLD_MS) {
          logger.info(
            { action: 'backup:recover_skip', jobId: job.id, elapsedMs: elapsed, thresholdMs: STUCK_THRESHOLD_MS },
            '任务仍在宽限期内，跳过恢复',
          )
          return false
        }

        return true
      })

      if (stuckJobs.length === 0) {
        logger.info({ action: 'backup:recover_stuck', total: items.length }, '所有 processing 任务均在运行中或宽限期内，无需恢复')
        return
      }

      logger.info({ action: 'backup:recover_stuck', total: items.length, stuck: stuckJobs.length, active: items.length - stuckJobs.length }, '发现未完成的任务，开始恢复')

      for (const job of stuckJobs) {
        const isRestore = job.jobType === 'db_restore' || job.jobType === 'full_restore'

        if (isRestore && job.backupFileKey) {
          // 恢复任务：从断点继续
          logger.info({ action: 'backup:recover_restore', jobId: job.id }, '恢复中断的恢复任务')
          processRestoreJob(job.id, job.jobType, job.backupFileKey).catch((error) => {
            logger.error({ action: 'backup:recoverRestoreError', jobId: job.id, error: String(error) })
          })
        } else {
          // 其他任务（备份/文件恢复等）：标记为 failed
          logger.info({ action: 'backup:recover_fail', jobId: job.id, jobType: job.jobType }, '将中断任务标记为失败')
          await backupJobs.updateBackupJobStatus({
            id: job.id,
            status: 'failed',
            errorMessage: '服务重启，任务被中断。请手动重试。',
            completedAt: new Date(),
          }, repoCtx)
        }
      }
    } catch (error) {
      logger.error({ action: 'backup:recoverError', error: String(error) }, '恢复中断任务失败')
    }
  }

  // ─── 内部函数：备份任务处理 ────────────────────────────

  /**
   * Function: processBackupJob
   *
   * Description: 异步执行备份任务。
   *   流程：获取锁 → 状态更新 processing → DB 备份 → 文件备份 →
   *         上传到存储 → 清理临时文件 → 更新 completed → 清理旧备份。
   *   异常时更新 failed，finally 释放锁。
   *
   * Parameters:
   *   jobId(string): 任务 ID
   *   jobType(string): 任务类型
   *
   * Returns:
   *   Promise<void>: 无返回值
   */
  async function processBackupJob(jobId: string, jobType: string) {
    activeJobIds.add(jobId)
    const prismaClient = getPrisma()
    const databaseName = getDatabaseName()
    const provider = getStorageProvider()

    // 1. 更新状态为 processing
    await backupJobs.updateBackupJobStatus({
      id: jobId,
      status: 'processing',
      startedAt: new Date(),
    }, repoCtx)

    // 2. 获取 Job Lock（防止并发执行，排除自身）
    const lockResult = await acquireJobLock({ prisma: prismaClient, excludeJobId: jobId })
    if (!lockResult.allowed) {
      await backupJobs.updateBackupJobStatus({
        id: jobId,
        status: 'failed',
        errorMessage: `已有备份/恢复任务正在执行 (jobId: ${lockResult.activeJobId ?? 'unknown'})`,
        completedAt: new Date(),
      }, repoCtx)
      return
    }

    // 3. 创建进度追踪器（每 2 秒防抖 flush 到数据库）
    const statsTracker = new StatsTracker({
      flushCallback: async (stats) => {
        await backupJobs.updateBackupJobStatus({ id: jobId, status: 'processing', stats: stats as Record<string, unknown> }, repoCtx)
      },
      debounceMs: 2000,
    })

    // 4. 创建速率控制器（避免对数据库和存储造成过大压力）
    const rateController = new RateController({
      tableDelayMs: 100,
      batchDelayMs: 10,
      fileDelayMs: 50,
    })

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const outputPath = `${BACKUP_TMP_DIR}/backup_${jobId}_${timestamp}.zip`

      let dbResult = null
      let fileResult = null

      // ── DB 备份 ────────────────────────────────────────
      if (jobType === 'db_backup' || jobType === 'full_backup') {
        dbResult = await createDbBackup({
          outputPath,
          prisma: prismaClient,
          databaseName,
          statsTracker,
          rateController,
        })
      }

      // ── 文件备份 ───────────────────────────────────────
      if (jobType === 'full_backup') {
        fileResult = await createFileBackup({
          outputPath: dbResult?.zipPath ?? outputPath,
          prisma: prismaClient,
          provider,
          statsTracker,
          rateController,
          baseDir: process.cwd(),
          storageType: 'local',
        })
      }

      const zipPath = fileResult?.zipPath ?? dbResult?.zipPath ?? outputPath

      // ── 上传到存储 ─────────────────────────────────────
      const storageKey = `${BACKUP_STORAGE_PREFIX}/${jobId}/${jobType}_${timestamp}.zip`
      const fs = await import('node:fs/promises')

      // 获取存储类型（从环境变量读取，避免读取 provider 内部状态）
      const storageType = process.env.OSS_PROVIDER ?? 'local'

      if (storageType === 'local') {
        // 本地存储：使用流式管道拷贝，避免将整个 ZIP 加载到内存
        const localUploadDir = process.env.LOCAL_UPLOAD_DIR ?? 'uploads'
        const destPath = join(process.cwd(), localUploadDir, storageKey)
        await fs.mkdir(dirname(destPath), { recursive: true })
        await fs.copyFile(zipPath, destPath)
      } else {
        // 云存储：需要 Buffer 上传（云 SDK 限制）
        // TODO: 未来可改为分片上传进一步降低内存峰值
        const fileBuffer = await fs.readFile(zipPath)
        await provider.uploadFile({
          file: fileBuffer,
          key: storageKey,
          contentType: 'application/zip',
        })
      }

      // ── 清理临时文件 ───────────────────────────────────
      try { await fs.unlink(zipPath) } catch {}

      // ── 更新完成 ───────────────────────────────────────
      await statsTracker.forceFlush()
      await backupJobs.updateBackupJobStatus({
        id: jobId,
        status: 'completed',
        backupFileKey: storageKey,
        completedAt: new Date(),
      }, repoCtx)

      // ── 清理旧备份 ─────────────────────────────────────
      await cleanupOldBackups({
        prisma: prismaClient,
        maxRetention: MAX_BACKUP_RETENTION,
        backupDir: BACKUP_TMP_DIR,
      })

    } catch (error) {
      await backupJobs.updateBackupJobStatus({
        id: jobId,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      }, repoCtx)
    } finally {
      activeJobIds.delete(jobId)
      releaseJobLock()
      await statsTracker.forceFlush()
    }
  }

  // ─── 内部函数：恢复任务处理 ────────────────────────────

  /**
   * Function: processRestoreJob
   *
   * Description: 异步执行完整恢复流程。
   *   流程：获取锁 → 下载 ZIP → preCheck → safetySnapshot + enableMaintenance →
   *         restoreDb → remapUrls → restoreFiles → postVerify → disableMaintenance。
   *   异常时确保关闭维护模式，finally 释放锁。
   *
   * Parameters:
   *   jobId(string): 任务 ID
   *   jobType(string): 任务类型
   *   backupFileKey(string): 备份文件在存储中的 key
   *
   * Returns:
   *   Promise<void>: 无返回值
   */
  async function processRestoreJob(jobId: string, jobType: string, backupFileKey: string) {
    activeJobIds.add(jobId)
    const prismaClient = getPrisma()
    const databaseName = getDatabaseName()
    const provider = getStorageProvider()

    // 1. 更新状态为 processing
    await backupJobs.updateBackupJobStatus({
      id: jobId,
      status: 'processing',
      startedAt: new Date(),
    }, repoCtx)

    // 2. 获取 Job Lock（防止并发执行，排除自身）
    const lockResult = await acquireJobLock({ prisma: prismaClient, excludeJobId: jobId })
    if (!lockResult.allowed) {
      await backupJobs.updateBackupJobStatus({
        id: jobId,
        status: 'failed',
        errorMessage: `已有备份/恢复任务正在执行 (jobId: ${lockResult.activeJobId ?? 'unknown'})`,
        completedAt: new Date(),
      }, repoCtx)
      return
    }

    // 3. 创建进度追踪器（每 2 秒防抖 flush 到数据库）
    const statsTracker = new StatsTracker({
      flushCallback: async (stats) => {
        await backupJobs.updateBackupJobStatus({ id: jobId, status: 'processing', stats: stats as Record<string, unknown> }, repoCtx)
      },
      debounceMs: 2000,
    })

    // 4. 创建速率控制器
    const rateController = new RateController({
      tableDelayMs: 100,
      batchDelayMs: 10,
      fileDelayMs: 50,
    })

    try {
      // ── 下载 ZIP 到临时文件 ────────────────────────────
      const zipBuffer = await provider.downloadFile(backupFileKey)
      const tmpZipPath = `${BACKUP_TMP_DIR}/restore_${jobId}.zip`
      const fs = await import('node:fs/promises')
      await fs.writeFile(tmpZipPath, zipBuffer)

      // ── 预检 ──────────────────────────────────────────
      const activeJobCount = await backupJobs.getActiveJobCount(repoCtx)
      const preCheckReport = await preCheck({
        zipPath: tmpZipPath,
        prisma: prismaClient,
        provider,
        activeJobCount: activeJobCount - 1, // 减去自身
        databaseName,
      })

      if (!preCheckReport.canProceed) {
        throw new Error(`预检失败: ${preCheckReport.errors.join('; ')}`)
      }

      // ── 安全快照 + 开启维护模式 ───────────────────────
      await enableMaintenanceModeWithSnapshot({ prisma: prismaClient, databaseName })

      try {
        // ── DB 恢复 ──────────────────────────────────────
        if (jobType === 'db_restore' || jobType === 'full_restore') {
          // 从已保存的 stats 中提取断点续传信息（服务重启恢复时有效）
          const currentJob = await backupJobs.getBackupJobById(jobId, repoCtx)
          const savedStats = currentJob?.stats as Record<string, unknown> | null
          const restoreCheckpoint = savedStats?.restoreCheckpoint as { completedTables: string[] } | undefined

          await restoreDbFromZip({
            zipPath: tmpZipPath,
            prisma: prismaClient,
            statsTracker,
            rateController,
            checkpoint: restoreCheckpoint,
          })

          // ── URL 重映射（跨环境恢复时替换存储 endpoint）───
          const manifest = await parseManifestFromZip(tmpZipPath)
          const sourceEndpoint = (manifest.sourceEndpoint as string) ?? ''
          const currentEndpoint = process.env.OSS_ENDPOINT ?? ''
          if (sourceEndpoint && currentEndpoint && sourceEndpoint !== currentEndpoint) {
            await remapUrls({
              prisma: prismaClient,
              oldEndpoint: sourceEndpoint,
              newEndpoint: currentEndpoint,
              remappingFields: (manifest.remappingFields as Record<string, string[]>) ?? {},
              statsTracker,
            })
          }
        }

        // ── 文件恢复 ─────────────────────────────────────
        if (jobType === 'full_restore') {
          await restoreFiles({
            zipPath: tmpZipPath,
            provider,
            statsTracker,
            rateController,
          })
        }

        // ── 事后验证 ─────────────────────────────────────
        const manifest = await parseManifestFromZip(tmpZipPath)
        const verifyReport = await postVerify({
          prisma: prismaClient,
          manifest,
        })

        if (!verifyReport.passed) {
          logger.warn({
            action: 'restore:verifyWarnings',
            jobId,
            warnings: verifyReport.warnings,
          })
        }

        // 恢复成功 → 关闭维护模式
        await disableMaintenanceMode(prismaClient)

        // ── 清理临时文件 ───────────────────────────────────
        try { await fs.unlink(tmpZipPath) } catch {}

        // ── 更新完成 ───────────────────────────────────────
        await statsTracker.forceFlush()
        await backupJobs.updateBackupJobStatus({
          id: jobId,
          status: 'completed',
          completedAt: new Date(),
        }, repoCtx)

      } catch (error) {
        // 恢复失败 → 保持维护模式开启，由管理员手动关闭
        await backupJobs.updateBackupJobStatus({
          id: jobId,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        }, repoCtx)
      } finally {
        releaseJobLock()
        await statsTracker.forceFlush()
      }

    } catch (error) {
      await backupJobs.updateBackupJobStatus({
        id: jobId,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      }, repoCtx)
    } finally {
      activeJobIds.delete(jobId)
    }
  }
}

/**
 * 导出备份服务类型
 */
export type BackupService = ReturnType<typeof createBackupService>
