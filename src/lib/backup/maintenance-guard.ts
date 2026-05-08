/**
 * 维护模式守护器
 *
 * @module lib/backup/maintenance-guard
 *
 * 功能：
 * 1. 控制系统维护模式的开启和关闭
 * 2. 在维护模式变更前创建安全快照
 * 3. 提供自动化的维护模式管理能力
 *
 * 设计要点：
 * - 使用原始 SQL 修改 system_settings 表
 * - 维护模式变更前自动创建快照保护
 * - 与 db-backup-engine 集成实现快速备份
 */

import { createDbBackup, type PrismaClientLike } from './db-backup-engine'
import { RateController } from './rate-controller'
import { StatsTracker } from './stats-tracker'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

// ─── 类型定义 ─────────────────────────────────────────

/**
 * Function: MaintenanceGuardDeps
 *
 * Description: 维护模式守护器依赖类型
 *
 * Parameters:
 *   prisma(PrismaClientLike): Prisma 客户端实例
 */
export interface MaintenanceGuardDeps {
  prisma: PrismaClientLike
}

/**
 * Function: SafetySnapshotResult
 *
 * Description: 安全快照结果类型
 *
 * Parameters:
 *   zipPath(string): 快照 ZIP 文件路径
 *   snapshotTime(Date): 快照创建时间
 */
export interface SafetySnapshotResult {
  zipPath: string
  snapshotTime: Date
}

/**
 * Function: CreateSafetySnapshotParams
 *
 * Description: 创建安全快照的参数类型
 *
 * Parameters:
 *   prisma(PrismaClientLike): Prisma 客户端实例
 *   databaseName(string): 数据库名称
 *   outputDir(string): 输出目录（默认为 'backups/snapshots'）
 */
export interface CreateSafetySnapshotParams {
  prisma: PrismaClientLike
  databaseName: string
  outputDir?: string
}

// ─── 常量 ─────────────────────────────────────────────

/** 维护模式配置键 */
const MAINTENANCE_MODE_KEY = 'feature.maintenance_mode'

/** 默认快照输出目录 */
const DEFAULT_SNAPSHOT_DIR = 'backups/snapshots'

// ─── 维护模式控制 ─────────────────────────────────────

/**
 * Function: enableMaintenanceMode
 *
 * Description: 开启系统维护模式
 * 通过修改 system_settings 表中的配置键来实现
 *
 * Parameters:
 *   prisma(PrismaClientLike): Prisma 客户端实例
 *
 * Returns:
 *   Promise<void>: 无返回值，成功时 Promise resolve
 *
 * Throws:
 *   Error: 数据库操作失败时抛出错误
 */
export async function enableMaintenanceMode(
  prisma: PrismaClientLike
): Promise<void> {
  await prisma.$queryRawUnsafe(
    `INSERT INTO system_settings (key, value) VALUES (?, 'true') ON DUPLICATE KEY UPDATE value = 'true'`,
    MAINTENANCE_MODE_KEY
  )
}

/**
 * Function: disableMaintenanceMode
 *
 * Description: 关闭系统维护模式
 * 通过修改 system_settings 表中的配置键来实现
 *
 * Parameters:
 *   prisma(PrismaClientLike): Prisma 客户端实例
 *
 * Returns:
 *   Promise<void>: 无返回值，成功时 Promise resolve
 *
 * Throws:
 *   Error: 数据库操作失败时抛出错误
 */
export async function disableMaintenanceMode(
  prisma: PrismaClientLike
): Promise<void> {
  await prisma.$queryRawUnsafe(
    `INSERT INTO system_settings (key, value) VALUES (?, 'false') ON DUPLICATE KEY UPDATE value = 'false'`,
    MAINTENANCE_MODE_KEY
  )
}

// ─── 安全快照 ─────────────────────────────────────────

/**
 * Function: createSafetySnapshot
 *
 * Description: 创建安全快照
 * 在执行危险操作前快速备份整个数据库，用于紧急恢复
 *
 * Parameters:
 *   params(CreateSafetySnapshotParams): 快照参数
 *
 * Returns:
 *   Promise<SafetySnapshotResult>: 快照结果，包含 ZIP 路径和创建时间
 *
 * Throws:
 *   Error: 备份失败时抛出错误
 */
export async function createSafetySnapshot(
  params: CreateSafetySnapshotParams
): Promise<SafetySnapshotResult> {
  const { prisma, databaseName, outputDir = DEFAULT_SNAPSHOT_DIR } = params

  // 确保输出目录存在
  mkdirSync(outputDir, { recursive: true })

  // 生成快照文件名：safety_snapshot_<timestamp>.zip
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `safety_snapshot_${timestamp}.zip`
  const zipPath = join(outputDir, fileName)

  // 创建速率控制器和进度追踪器
  const rateController = new RateController({
    tableDelayMs: 1000,
    batchDelayMs: 200,
  })

  const statsTracker = new StatsTracker({
    flushCallback: async (stats) => {
      // 安全快照创建过程中不持久化 stats，仅在内存中追踪
      console.debug('Safety snapshot progress:', stats)
    },
    debounceMs: 1000,
  })

  // 执行快速数据库备份
  const result = await createDbBackup({
    outputPath: zipPath,
    prisma,
    databaseName,
    statsTracker,
    rateController,
  })

  // 确保文件路径正确
  if (!result.zipPath) {
    throw new Error('安全快照创建失败：未生成 ZIP 文件路径')
  }

  return {
    zipPath: result.zipPath,
    snapshotTime: new Date(),
  }
}

/**
 * Function: enableMaintenanceModeWithSnapshot
 *
 * Description: 开启维护模式并预先创建安全快照
 * 组合操作：先创建快照，再开启维护模式
 *
 * Parameters:
 *   params(CreateSafetySnapshotParams & MaintenanceGuardDeps): 参数
 *
 * Returns:
 *   Promise<SafetySnapshotResult>: 快照结果
 *
 * Throws:
 *   Error: 快照创建或维护模式开启失败时抛出错误
 */
export async function enableMaintenanceModeWithSnapshot(
  params: CreateSafetySnapshotParams & MaintenanceGuardDeps
): Promise<SafetySnapshotResult> {
  // 先创建安全快照
  const snapshot = await createSafetySnapshot(params)

  // 再开启维护模式
  await enableMaintenanceMode(params.prisma)

  return snapshot
}
