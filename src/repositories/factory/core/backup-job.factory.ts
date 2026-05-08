/**
 * Backup Job Repository Factory
 *
 * @module repositories/factory/backup-job
 * @description 备份任务仓库工厂，提供数据备份/恢复功能的统一入口
 *
 * =============================================================================
 *
 * 架构设计:
 * - 根据 DATABASE_PROVIDER 环境变量动态选择底层实现
 * - 支持 prisma 实现备份任务的创建、查询和更新
 * - 提供活跃任务数量查询，用于并发控制
 *
 * =============================================================================
 *
 * 使用方式:
 * ```typescript
 * import { getBackupJobRepository } from '@/repositories/factory'
 *
 * const backupRepo = await getBackupJobRepository()
 * const job = await backupRepo.createBackupJob(
 *   { jobType: 'db_backup', requestedBy: 'admin-user-id' },
 *   ctx
 * )
 * ```
 *
 * =============================================================================
 */

import { getProvider } from './core.factory'
import type { BackupJobRepository } from '@/repositories/interfaces/core/backup-job.interface'

/**
 * Function: getBackupJobRepository
 *
 * Description: 获取备份任务仓库实例
 *
 * Returns:
 *   repo(Promise<BackupJobRepository>): 备份任务仓库实例
 *
 * @example
 * ```typescript
 * const backupRepo = await getBackupJobRepository()
 * const jobs = await backupRepo.listBackupJobs(
 *   { status: 'completed', limit: 20 },
 *   ctx
 * )
 * ```
 */
export async function getBackupJobRepository(): Promise<BackupJobRepository> {
  const provider = getProvider()

  if (provider === 'prisma') {
    const { createPrismaBackupJobRepository } = await import(
      '@/repositories/prisma/core/backup-job.repository'
    )
    return createPrismaBackupJobRepository()
  }

  // 当前仅支持 Prisma 实现
  throw new Error(
    `BackupJob repository is not supported for provider: ${provider}. ` +
    `Please use 'prisma' as DATABASE_PROVIDER.`
  )
}

/**
 * 导出类型定义
 */
export type { BackupJobRepository } from '@/repositories/interfaces/core/backup-job.interface'
