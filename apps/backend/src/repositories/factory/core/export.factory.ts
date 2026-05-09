/**
 * Export Job Repository Factory
 *
 * @module repositories/factory/export
 * @description 导出任务仓库工厂，提供数据导出功能的统一入口
 *
 * =============================================================================
 *
 * 架构设计:
 * - 根据 DATABASE_PROVIDER 环境变量动态选择底层实现
 * - 支持 prisma 实现导出任务的创建、查询和更新
 * - 提供购买者支付记录和推广员佣金记录的聚合查询
 *
 * =============================================================================
 *
 * 使用方式:
 * ```typescript
 * import { getExportJobRepository } from '@/repositories/factory'
 *
 * const exportRepo = await getExportJobRepository()
 * const job = await exportRepo.createExportJob(ctx, {
 *   jobType: 'buyers_payment',
 *   requestedBy: 'admin-user-id',
 *   filters: { startTime: '2024-01-01', endTime: '2024-12-31' }
 * })
 * ```
 *
 * =============================================================================
 */

import { getProvider } from './core.factory'
import type { ExportJobRepository } from '@/repositories/interfaces/core/export-job.interface'

/**
 * Function: getExportJobRepository
 *
 * Description: 获取导出任务仓库实例
 *
 * Returns:
 *   repo(Promise<ExportJobRepository>): 导出任务仓库实例
 *
 * @example
 * ```typescript
 * const exportRepo = await getExportJobRepository()
 * const jobs = await exportRepo.listExportJobs(ctx, {
 *   jobType: 'buyers_payment',
 *   status: 'completed',
 *   limit: 20
 * })
 * ```
 */
export async function getExportJobRepository(): Promise<ExportJobRepository> {
  const provider = getProvider()

  if (provider === 'prisma') {
    const { createPrismaExportJobRepository } = await import(
      '@/repositories/prisma/core/export-job.repository'
    )
    return createPrismaExportJobRepository()
  }

  // 当前仅支持 Prisma 实现（因为需要复杂的聚合查询）
  throw new Error(
    `ExportJob repository is not supported for provider: ${provider}. ` +
    `Please use 'prisma' as DATABASE_PROVIDER.`
  )
}

/**
 * 导出类型定义
 */
export type { ExportJobRepository } from '@/repositories/interfaces/core/export-job.interface'
