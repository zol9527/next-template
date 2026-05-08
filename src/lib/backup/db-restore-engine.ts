/**
 * DB 恢复引擎
 *
 * @module lib/backup/db-restore-engine
 *
 * 功能：
 * 1. 从 ZIP 备份文件逐表恢复数据库（TRUNCATE + 分批 INSERT）
 * 2. 支持断点续传（跳过已完成的表）
 * 3. 禁用 FK 检查后按拓扑顺序恢复，完成后重置 AUTO_INCREMENT
 * 4. 单表失败不中断整体流程，记录错误继续
 *
 * 设计要点：
 * - 使用参数化查询防止 SQL 注入
 * - 每批 500 行插入，配合 rateController 控制速率
 * - 通过 statsTracker 追踪进度和维护断点信息
 * - 不恢复 backup_jobs 表自身（由 manifest 决定表列表）
 */

import { deserializeRow, JsonlReader } from './serializer'
import { parseManifestFromZip, extractFileFromZip } from './integrity-check'
import { StreamingZipReader } from './streaming-zip-reader'
import type { BackupManifest } from './integrity-check'
import { RateController } from './rate-controller'
import { StatsTracker } from './stats-tracker'

// ─── 常量 ─────────────────────────────────────────────

/** 每批插入行数 */
const BATCH_SIZE = 500

// ─── 类型定义 ─────────────────────────────────────────

/**
 * Function: PrismaClientLike
 *
 * Description: 兼容 Prisma Client 的最小接口定义，
 * 仅包含 $queryRaw 和 $queryRawUnsafe 两个原始查询方法。
 */
export interface PrismaClientLike {
  $queryRaw: <T>(
    query: TemplateStringsArray | string,
    ...values: unknown[]
  ) => Promise<T>
  $queryRawUnsafe: <T>(
    query: string,
    ...values: unknown[]
  ) => Promise<T>
}

/**
 * Function: DbRestoreParams
 *
 * Description: 数据库恢复函数的参数类型
 *
 * Parameters:
 *   zipPath(string): ZIP 备份文件路径
 *   prisma(PrismaClientLike): Prisma 客户端实例
 *   statsTracker(StatsTracker): 进度追踪器
 *   rateController(RateController): 速率控制器
 *   checkpoint({ completedTables: string[], currentTable?: string }): 可选的断点续传信息
 */
export interface DbRestoreParams {
  zipPath: string
  prisma: PrismaClientLike
  statsTracker: StatsTracker
  rateController: RateController
  checkpoint?: {
    completedTables: string[]
    currentTable?: string
  }
}

/**
 * Function: DbRestoreResult
 *
 * Description: 数据库恢复函数的返回结果类型
 *
 * Returns:
 *   totalTables(number): 恢复涉及的表总数
 *   restoredTables(number): 成功恢复的表数量
 *   failedTables(string[]): 恢复失败的表名列表
 *   totalRows(number): 恢复的总行数
 *   duration(number): 恢复耗时（毫秒）
 */
export interface DbRestoreResult {
  totalTables: number
  restoredTables: number
  failedTables: string[]
  totalRows: number
  duration: number
}

// ─── 内部辅助函数 ─────────────────────────────────────

/**
 * Function: extractAndParseJsonl
 *
 * Description: 从 ZIP 中提取指定表的 JSONL 数据并解析为行数组。
 * 每行 JSONL 数据经过 deserializeRow 反序列化恢复原始类型。
 *
 * Parameters:
 *   zipPath(string): ZIP 文件路径
 *   tableName(string): 表名（对应 ZIP 中的 tables/<tableName>.jsonl）
 *
 * Returns:
 *   Promise<Record<string, unknown>[]>: 反序列化后的行数据数组
 */
async function extractAndParseJsonl(
  zipPath: string,
  tableName: string,
): Promise<Record<string, unknown>[]> {
  const jsonlBuffer = await extractFileFromZip(zipPath, `tables/${tableName}.jsonl`)
  const content = jsonlBuffer.toString('utf8')

  // 空内容返回空数组
  if (!content.trim()) {
    return []
  }

  const lines = content.split('\n').filter((line) => line.trim())
  return lines.map((line) => deserializeRow(JSON.parse(line)))
}

/**
 * Function: restoreTableFromZipStream
 *
 * Description: 使用流式方式从 ZIP 中读取指定表的 JSONL 数据并逐批 INSERT。
 * 通过 StreamingZipReader + JsonlReader 实现零缓冲逐行处理，
 * 内存峰值仅取决于单批大小（约 500 行，~50KB）。
 *
 * Parameters:
 *   reader(StreamingZipReader): 已打开的 ZIP 读取器
 *   zipPath(string): ZIP 文件路径（仅用于日志）
 *   tableName(string): 表名
 *   prisma(PrismaClientLike): Prisma 客户端
 *   statsTracker(StatsTracker): 进度追踪器
 *   rateController(RateController): 速率控制器
 *
 * Returns:
 *   Promise<{ insertedRows: number }>: 插入的行数
 */
async function restoreTableFromZipStream(
  reader: StreamingZipReader,
  _zipPath: string,
  tableName: string,
  prisma: PrismaClientLike,
  statsTracker: StatsTracker,
  rateController: RateController,
): Promise<{ insertedRows: number }> {
  const entryName = `tables/${tableName}.jsonl`

  // 如果 entry 不存在，跳过（空表）
  if (!reader.hasEntry(entryName)) {
    return { insertedRows: 0 }
  }

  const stream = await reader.streamEntry(entryName)
  const jsonlReader = new JsonlReader(stream)

  let totalInserted = 0
  let columns: string[] | null = null
  let batch: Record<string, unknown>[] = []

  for await (const row of jsonlReader.readRows()) {
    // 第一行时确定列名
    if (columns === null) {
      columns = Object.keys(row)
    }

    batch.push(row)

    // 每批 BATCH_SIZE 行执行 INSERT
    if (batch.length >= BATCH_SIZE) {
      const { sql, values } = buildBatchInsertSql(tableName, columns, batch)
      await prisma.$queryRawUnsafe(sql, ...values)
      totalInserted += batch.length

      statsTracker.update({
        currentRows: totalInserted,
        totalRows: totalInserted,
      })

      await rateController.waitForBatch(batch.length)
      batch = []
    }
  }

  // 处理剩余的行
  if (batch.length > 0 && columns !== null) {
    const { sql, values } = buildBatchInsertSql(tableName, columns, batch)
    await prisma.$queryRawUnsafe(sql, ...values)
    totalInserted += batch.length

    statsTracker.update({
      currentRows: totalInserted,
      totalRows: totalInserted,
    })

    await rateController.waitForBatch(batch.length)
  }

  return { insertedRows: totalInserted }
}

/**
 * Function: getColumnsFromRows
 *
 * Description: 从行数据中提取有序的列名列表。
 * 以第一行的 key 顺序为准，确保所有 INSERT 语句的列顺序一致。
 *
 * Parameters:
 *   rows(Record<string, unknown>[]): 行数据数组
 *
 * Returns:
 *   string[]: 列名数组
 */
function getColumnsFromRows(rows: Record<string, unknown>[]): string[] {
  if (rows.length === 0) return []
  return Object.keys(rows[0])
}

/**
 * Function: buildBatchInsertSql
 *
 * Description: 构建批量 INSERT SQL 语句。
 * 使用参数化查询（? 占位符）防止 SQL 注入。
 *
 * Parameters:
 *   tableName(string): 目标表名
 *   columns(string[]): 列名数组
 *   rows(Record<string, unknown>[]): 要插入的行数据
 *
 * Returns:
 *   { sql: string, values: unknown[] }: SQL 语句和参数值数组
 */
function buildBatchInsertSql(
  tableName: string,
  columns: string[],
  rows: Record<string, unknown>[],
): { sql: string; values: unknown[] } {
  const columnList = columns.map((col) => `\`${col}\``).join(', ')
  const rowPlaceholder = `(${columns.map(() => '?').join(', ')})`
  const placeholders = rows.map(() => rowPlaceholder).join(', ')

  const sql = `INSERT INTO \`${tableName}\` (${columnList}) VALUES ${placeholders}`
  const values = rows.flatMap((row) => columns.map((col) => row[col]))

  return { sql, values }
}

// ─── 主函数 ───────────────────────────────────────────

/**
 * Function: restoreDbFromZip
 *
 * Description: 从 ZIP 备份文件恢复数据库。
 * 流程：
 * 1. 解析 manifest 获取表列表和拓扑顺序
 * 2. 禁用 FK 检查
 * 3. 逐表：TRUNCATE → 分批 INSERT → 更新进度
 * 4. 恢复 FK 检查
 * 5. 重置每张表的 AUTO_INCREMENT
 * 6. 生成恢复报告
 *
 * Parameters:
 *   params(DbRestoreParams): 恢复参数
 *
 * Returns:
 *   Promise<DbRestoreResult>: 恢复结果，包含统计信息和失败表列表
 */
export async function restoreDbFromZip(
  params: DbRestoreParams,
): Promise<DbRestoreResult> {
  const { zipPath, prisma, statsTracker, rateController, checkpoint } = params

  const startTime = Date.now()

  // 打开流式 ZIP 读取器（贯穿整个恢复流程，在 finally 中关闭）
  const reader = await StreamingZipReader.open(zipPath)

  // 1. 解析 manifest 获取表列表
  const manifest: BackupManifest = await parseManifestFromZip(zipPath)
  const tables: string[] = manifest.tables ?? []

  // 断点续传：构建已完成表集合
  const completedSet = new Set<string>(checkpoint?.completedTables ?? [])

  // 初始化结果追踪
  const failedTables: string[] = []
  let totalRows = 0
  let restoredTables = 0

  // 初始化进度追踪
  statsTracker.update({
    phase: 'db-restore',
    tablesTotal: tables.length,
    tablesCompleted: completedSet.size,
    totalRows: 0,
    restoreCheckpoint: {
      completedTables: [...completedSet],
    },
  })

  // 2. 禁用 FK 检查
  await prisma.$queryRawUnsafe('SET FOREIGN_KEY_CHECKS=0')

  try {
    // 3. 逐表恢复（按 manifest 中的拓扑顺序）
    for (const tableName of tables) {
      // 断点续传：跳过已完成的表
      if (completedSet.has(tableName)) {
        continue
      }

      statsTracker.update({
        currentTable: tableName,
        currentRows: 0,
      })

      try {
        // 3a. TRUNCATE TABLE
        await prisma.$queryRawUnsafe(`TRUNCATE TABLE \`${tableName}\``)

        // 3b. 流式读取 JSONL 数据并逐批 INSERT（内存峰值 ~50KB）
        const { insertedRows } = await restoreTableFromZipStream(
          reader, zipPath, tableName, prisma, statsTracker, rateController,
        )
        totalRows += insertedRows

        restoredTables++

        // 更新断点信息
        completedSet.add(tableName)
        const completedTables = [...completedSet]
        statsTracker.update({
          restoreCheckpoint: { completedTables },
        })
      } catch (error) {
        // 4. 失败的表记录错误，跳过，继续
        const errorMsg = error instanceof Error ? error.message : String(error)
        const currentErrors = statsTracker.getStats().errors ?? []
        failedTables.push(tableName)
        statsTracker.update({
          errors: [...currentErrors, `表 ${tableName} 恢复失败: ${errorMsg}`],
        })
      }

      // 表完成后更新进度
      statsTracker.update({
        tablesCompleted: completedSet.size,
      })
      await statsTracker.forceFlush()
    }
  } finally {
    // 5. 无论成功与否，恢复 FK 检查
    await prisma.$queryRawUnsafe('SET FOREIGN_KEY_CHECKS=1')
  }

  // 关闭 ZIP 读取器
  reader.close()

  // 6. 重置 AUTO_INCREMENT（仅对成功恢复的表）
  for (const tableName of tables) {
    // 跳过失败的表和已在断点中跳过的表（断点跳过的不需要重置，因为之前已经恢复了）
    // 实际上我们只对本次成功恢复的表重置
    if (failedTables.includes(tableName)) {
      continue
    }

    try {
      await prisma.$queryRawUnsafe(
        `ALTER TABLE \`${tableName}\` AUTO_INCREMENT = (SELECT COALESCE(MAX(id) + 1, 1) FROM \`${tableName}\`)`,
      )
    } catch {
      // AUTO_INCREMENT 重置失败不阻塞流程（表可能没有 id 列）
    }
  }

  const duration = Date.now() - startTime

  // 7. 生成恢复报告
  return {
    totalTables: tables.length,
    restoredTables,
    failedTables,
    totalRows,
    duration,
  }
}
