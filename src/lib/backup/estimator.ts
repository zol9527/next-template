/**
 * Backup Estimator Module
 * @module lib/backup/estimator
 *
 * 功能：
 * 1. 预估数据库备份规模（表数、行数、大小、耗时）
 * 2. 预估文件备份规模（文件数、大小、耗时）
 * 3. 提供备份前的资源评估
 */

import { getSkipList, getTableNameMapping } from './schema-analyzer'

/**
 * Prisma 客户端接口（最小化接口）
 *
 * 仅需要 $queryRawUnsafe 来执行动态 SQL（文件预估查询 media_assets 表）
 */
export interface PrismaClientLike {
  $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T>
}

/**
 * 预估参数
 */
export interface EstimateParams {
  /** Prisma 客户端实例 */
  prisma: PrismaClientLike
  /** 数据库名称 */
  databaseName: string
}

/**
 * 数据库预估结果
 */
export interface DatabaseEstimate {
  /** 表总数（过滤 skipList 后） */
  tablesTotal: number
  /** 总行数 */
  totalRows: number
  /** 预估 JSONL 大小（字节） */
  estimatedSizeBytes: number
  /** 预估耗时（毫秒） */
  estimatedDurationMs: number
}

/**
 * 文件预估结果
 */
export interface FilesEstimate {
  /** 文件总数（仅 active 状态） */
  totalFiles: number
  /** 文件总大小（字节） */
  totalBytes: number
  /** 预估耗时（毫秒） */
  estimatedDurationMs: number
}

/**
 * 预估结果
 */
export interface EstimateResult {
  /** 数据库预估 */
  db: DatabaseEstimate
  /** 文件预估 */
  files: FilesEstimate
}

/**
 * 平均行大小（字节）
 *
 * 用于预估 JSONL 格式的备份大小。
 * 这个值是根据经验估算的，实际大小会根据表结构不同而变化。
 */
const AVG_ROW_SIZE_BYTES = 500

/**
 * 数据库处理速度（行/秒）
 *
 * 用于预估数据库备份耗时。
 */
const DB_PROCESSING_RATE_ROWS_PER_SEC = 5000

/**
 * 文件处理速度（文件/秒）
 *
 * 用于预估文件备份耗时。
 */
const FILE_PROCESSING_RATE_PER_SEC = 5

/**
 * 预估备份规模
 *
 * 计算数据库和文件的备份规模，包括表数、行数、文件数、大小和预估耗时。
 *
 * @param params - 预估参数
 * @returns 预估结果
 */
export async function estimateBackup(params: EstimateParams): Promise<EstimateResult> {
  const { prisma, databaseName } = params

  // 并行执行数据库预估和文件预估
  const [dbEstimate, filesEstimate] = await Promise.all([
    estimateDatabase({ prisma, databaseName }),
    estimateFiles({ prisma }),
  ])

  return {
    db: dbEstimate,
    files: filesEstimate,
  }
}

/**
 * 预估数据库备份规模
 *
 * 步骤：
 * 1. 获取所有表名
 * 2. 过滤掉 skipList 中的表
 * 3. 逐表统计行数
 * 4. 计算预估大小和耗时
 *
 * @param params - 预估参数
 * @returns 数据库预估结果
 */
async function estimateDatabase(params: EstimateParams): Promise<DatabaseEstimate> {
  const { prisma, databaseName } = params

  // 从 information_schema 一次性获取所有表的近似统计（毫秒级，O(1)）
  const tableNameMapping = await getTableNameMapping(prisma, databaseName)

  // 过滤掉需要跳过的表
  const skipList = getSkipList()
  const tablesToBackup = Array.from(tableNameMapping.entries())
    .filter(([table]) => !skipList.includes(table))

  // 直接从 information_schema 汇总近似值（无需逐表 COUNT）
  let totalRows = 0
  let totalDataLength = 0

  for (const [, stats] of tablesToBackup) {
    totalRows += stats.approxRows
    totalDataLength += stats.dataLength
  }

  // 优先使用 information_schema 的 DATA_LENGTH（比固定系数更准确）
  const estimatedSizeBytes = totalDataLength > 0
    ? totalDataLength
    : totalRows * AVG_ROW_SIZE_BYTES

  // 计算预估耗时（毫秒）
  const estimatedDurationMs = Math.ceil((totalRows / DB_PROCESSING_RATE_ROWS_PER_SEC) * 1000)

  return {
    tablesTotal: tablesToBackup.length,
    totalRows,
    estimatedSizeBytes,
    estimatedDurationMs,
  }
}

/**
 * 预估文件备份规模
 *
 * 统计 media_assets 表中 status = 'active' 的文件数量和总大小。
 *
 * @param params - 预估参数
 * @returns 文件预估结果
 */
async function estimateFiles(params: Pick<EstimateParams, 'prisma'>): Promise<FilesEstimate> {
  const { prisma } = params

  try {
    // 查询 active 状态的文件数量和总大小
    const result = await prisma.$queryRawUnsafe<{ cnt: bigint; totalSize: bigint | null }[]>(
      `SELECT COUNT(*) as cnt, COALESCE(SUM(size_bytes), 0) as totalSize FROM media_assets WHERE status = 'active'`
    )

    if (!result || !result[0]) {
      return {
        totalFiles: 0,
        totalBytes: 0,
        estimatedDurationMs: 0,
      }
    }

    const row = result[0]
    const totalFiles = Number(row.cnt ?? 0)
    const totalBytes = Number(row.totalSize ?? 0)

    // 计算预估耗时（毫秒）
    const estimatedDurationMs = Math.ceil((totalFiles / FILE_PROCESSING_RATE_PER_SEC) * 1000)

    return {
      totalFiles,
      totalBytes,
      estimatedDurationMs,
    }
  } catch (error) {
    // 如果表不存在或查询失败，返回零值
    console.warn('Failed to estimate files:', error)
    return {
      totalFiles: 0,
      totalBytes: 0,
      estimatedDurationMs: 0,
    }
  }
}
