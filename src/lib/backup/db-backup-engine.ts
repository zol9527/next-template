/**
 * DB 备份引擎
 *
 * @module lib/backup/db-backup-engine
 *
 * 功能：
 * 1. 逐表分页查询数据库，将每行数据序列化为 JSONL 格式
 * 2. 流式写入 ZIP 文件（每个表一个 .jsonl 文件）
 * 3. 同时计算每张表的 SHA256 校验和
 * 4. 支持进度追踪、速率控制和内存保护
 *
 * 设计要点：
 * - 使用 $queryRawUnsafe 支持通用表名查询
 * - 通过拓扑排序确定备份顺序（先备份被依赖的表）
 * - 内存保护：检查 RSS，超过 512MB 时抛错
 * - 单表失败不中断整体流程
 */

import { createHash } from 'node:crypto'
import { createWriteStream, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { Writable } from 'node:stream'

import { JsonlWriter } from './serializer'
import {
  getForeignKeyGraph,
  topologicalSort,
  getSkipList,
  getTableNameMapping,
} from './schema-analyzer'
import { RateController } from './rate-controller'
import { StatsTracker } from './stats-tracker'

// ─── 常量 ─────────────────────────────────────────────

/** 每批查询行数 */
const BATCH_SIZE = 500

/** 内存限制：512MB */
const MEMORY_LIMIT_BYTES = 512 * 1024 * 1024

// ZIP 格式签名
const LOCAL_FILE_HEADER_SIG = 0x04034b50
const CENTRAL_DIR_SIG = 0x02014b50
const EOCD_SIG = 0x06054b50

// CRC-32 查找表（与 integrity-check.ts 中的实现一致）
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let crc = i
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
    table[i] = crc
  }
  return table
})()

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
 * Function: DbBackupParams
 *
 * Description: 数据库备份函数的参数类型
 *
 * Parameters:
 *   outputPath(string): ZIP 输出文件路径
 *   prisma(PrismaClientLike): Prisma 客户端实例
 *   databaseName(string): 数据库名称
 *   statsTracker(StatsTracker): 进度追踪器
 *   rateController(RateController): 速率控制器
 *   onProgress((table: string, rows: number) => void): 可选的进度回调
 */
export interface DbBackupParams {
  outputPath: string
  prisma: PrismaClientLike
  databaseName: string
  statsTracker: StatsTracker
  rateController: RateController
  onProgress?: (table: string, rows: number) => void
}

/**
 * Function: DbBackupResult
 *
 * Description: 数据库备份函数的返回结果类型
 *
 * Parameters:
 *   zipPath(string): ZIP 文件路径
 *   totalTables(number): 备份的表总数
 *   totalRows(number): 备份的总行数
 *   duration(number): 备份耗时（毫秒）
 *   fileChecksums(Record<string, string>): 表名 → SHA256 校验和
 */
export interface DbBackupResult {
  zipPath: string
  totalTables: number
  totalRows: number
  duration: number
  fileChecksums: Record<string, string>
}

// ─── 内部辅助类型 ─────────────────────────────────────

/** ZIP 条目元数据 */
interface ZipEntry {
  name: string
  offset: number
  crc32: number
  size: number
}

// ─── CRC-32 计算 ──────────────────────────────────────

/**
 * Function: computeCrc32
 *
 * Description: 计算数据的 CRC-32 校验值
 *
 * Parameters:
 *   data(Uint8Array): 输入数据
 *
 * Returns:
 *   number: CRC-32 值（无符号 32 位）
 */
function computeCrc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

// ─── 内存检查 ─────────────────────────────────────────

/**
 * Function: checkMemoryLimit
 *
 * Description: 检查当前进程 RSS 是否超过 512MB 限制
 *
 * Returns:
 *   void
 *
 * Throws:
 *   Error: 当 RSS 超过限制时抛出错误
 */
function checkMemoryLimit(): void {
  const rss = process.memoryUsage().rss
  if (rss > MEMORY_LIMIT_BYTES) {
    throw new Error(
      `内存超限：当前 RSS ${Math.round(rss / 1024 / 1024)}MB 超过限制 ${MEMORY_LIMIT_BYTES / 1024 / 1024}MB`
    )
  }
}

// ─── BufferCollectStream ──────────────────────────────

/**
 * Function: BufferCollectStream
 *
 * Description: 自定义 Writable 流，将写入的数据收集到内存 Buffer 数组中。
 * 用于在写入 JSONL 数据时收集内容，以便后续写入 ZIP 文件。
 * 每次 _write 调用将 chunk 推入数组，最终通过 toBuffer() 合并。
 */
class BufferCollectStream extends Writable {
  private chunks: Buffer[] = []

  _write(
    chunk: Buffer,
    _encoding: string,
    callback: (error?: Error | null) => void
  ): void {
    this.chunks.push(chunk)
    callback()
  }

  /**
   * Function: toBuffer
   *
   * Description: 将收集的所有数据块合并为一个 Buffer
   *
   * Returns:
   *   Buffer: 合并后的完整数据
   */
  toBuffer(): Buffer {
    return Buffer.concat(this.chunks)
  }
}

// ─── ZipFileWriter ────────────────────────────────────

/**
 * Function: ZipFileWriter
 *
 * Description: 流式 ZIP 文件写入器。
 * 将数据逐文件写入 ZIP 格式，使用 store（无压缩）方式。
 * 每次调用 addFile 写入一个完整的文件条目（Local File Header + Data），
 * 最后调用 finalize 写入 Central Directory 和 EOCD。
 */
class ZipFileWriter {
  private stream: ReturnType<typeof createWriteStream>
  private entries: ZipEntry[] = []
  private offset = 0

  constructor(filePath: string) {
    // 确保输出目录存在
    mkdirSync(dirname(filePath), { recursive: true })
    this.stream = createWriteStream(filePath)
  }

  /**
   * Function: addFile
   *
   * Description: 添加一个文件到 ZIP 中
   *
   * Parameters:
   *   name(string): 文件名（在 ZIP 内的路径）
   *   content(Buffer): 文件内容
   */
  addFile(name: string, content: Buffer): void {
    const fileNameBuf = Buffer.from(name, 'utf8')
    const crc = computeCrc32(content)

    // Local File Header（30 字节固定头 + 文件名）
    const header = Buffer.alloc(30)
    header.writeUInt32LE(LOCAL_FILE_HEADER_SIG, 0)  // 签名
    header.writeUInt16LE(20, 4)                       // 所需版本
    header.writeUInt16LE(0, 6)                        // 标志位
    header.writeUInt16LE(0, 8)                        // 压缩方式：store
    header.writeUInt16LE(0, 10)                       // 修改时间
    header.writeUInt16LE(0, 12)                       // 修改日期
    header.writeUInt32LE(crc, 14)                     // CRC-32
    header.writeUInt32LE(content.length, 18)          // 压缩大小
    header.writeUInt32LE(content.length, 22)          // 原始大小
    header.writeUInt16LE(fileNameBuf.length, 26)      // 文件名长度
    header.writeUInt16LE(0, 28)                       // 额外字段长度

    this.stream.write(Buffer.concat([header, fileNameBuf, content]))

    this.entries.push({
      name,
      offset: this.offset,
      crc32: crc,
      size: content.length,
    })

    this.offset += 30 + fileNameBuf.length + content.length
  }

  /**
   * Function: finalize
   *
   * Description: 写入 Central Directory 和 EOCD，完成 ZIP 文件并关闭流
   *
   * Returns:
   *   Promise<void>: 写入完成的 Promise
   */
  async finalize(): Promise<void> {
    const centralDirOffset = this.offset

    // 写入 Central Directory 条目
    for (const entry of this.entries) {
      const fileNameBuf = Buffer.from(entry.name, 'utf8')
      const centralEntry = Buffer.alloc(46)
      centralEntry.writeUInt32LE(CENTRAL_DIR_SIG, 0)
      centralEntry.writeUInt16LE(20, 4)                   // 创建版本
      centralEntry.writeUInt16LE(20, 6)                   // 所需版本
      centralEntry.writeUInt16LE(0, 8)                    // 标志位
      centralEntry.writeUInt16LE(0, 10)                   // 压缩方式：store
      centralEntry.writeUInt16LE(0, 12)                   // 修改时间
      centralEntry.writeUInt16LE(0, 14)                   // 修改日期
      centralEntry.writeUInt32LE(entry.crc32, 16)         // CRC-32
      centralEntry.writeUInt32LE(entry.size, 20)          // 压缩大小
      centralEntry.writeUInt32LE(entry.size, 24)          // 原始大小
      centralEntry.writeUInt16LE(fileNameBuf.length, 28)  // 文件名长度
      centralEntry.writeUInt16LE(0, 30)                   // 额外字段长度
      centralEntry.writeUInt16LE(0, 32)                   // 文件注释长度
      centralEntry.writeUInt16LE(0, 34)                   // 起始磁盘号
      centralEntry.writeUInt16LE(0, 36)                   // 内部文件属性
      centralEntry.writeUInt32LE(0, 38)                   // 外部文件属性
      centralEntry.writeUInt32LE(entry.offset, 42)        // Local Header 偏移量

      this.stream.write(Buffer.concat([centralEntry, fileNameBuf]))
    }

    // 计算 Central Directory 总大小
    let cdSize = 0
    for (const entry of this.entries) {
      cdSize += 46 + Buffer.byteLength(entry.name, 'utf8')
    }

    // End of Central Directory Record（22 字节）
    const eocd = Buffer.alloc(22)
    eocd.writeUInt32LE(EOCD_SIG, 0)
    eocd.writeUInt16LE(0, 4)                             // 当前磁盘号
    eocd.writeUInt16LE(0, 6)                             // Central Directory 起始磁盘号
    eocd.writeUInt16LE(this.entries.length, 8)           // 当前磁盘上的记录数
    eocd.writeUInt16LE(this.entries.length, 10)          // 总记录数
    eocd.writeUInt32LE(cdSize, 12)                       // Central Directory 大小
    eocd.writeUInt32LE(centralDirOffset, 16)             // Central Directory 偏移量
    eocd.writeUInt16LE(0, 20)                            // 注释长度

    this.stream.write(eocd)
    this.stream.end()

    // 等待流完成写入并释放文件描述符
    return new Promise<void>((resolve, reject) => {
      this.stream.on('close', resolve)
      this.stream.on('error', reject)
    })
  }
}

// ─── 主函数 ───────────────────────────────────────────

/**
 * Function: createDbBackup
 *
 * Description: 执行数据库备份，逐表分页查询并将数据以 JSONL 格式写入 ZIP 文件。
 * 流程：获取 FK 图 → 获取表名 → 过滤跳过表 → 拓扑排序 → 逐表备份 → 生成 ZIP
 *
 * Parameters:
 *   params(DbBackupParams): 备份参数
 *
 * Returns:
 *   Promise<DbBackupResult>: 备份结果，包含 ZIP 路径、统计信息和校验和
 */
export async function createDbBackup(
  params: DbBackupParams
): Promise<DbBackupResult> {
  const {
    outputPath,
    prisma,
    databaseName,
    statsTracker,
    rateController,
    onProgress,
  } = params

  const startTime = Date.now()

  // 1. 获取外键关系图
  const graph = await getForeignKeyGraph(prisma, databaseName)

  // 2. 获取表名映射
  const tableNameMapping = await getTableNameMapping(prisma, databaseName)

  // 3. 过滤掉跳过列表中的表
  const skipList = getSkipList()
  const allTables = Array.from(tableNameMapping.keys()).filter(
    (t) => !skipList.includes(t)
  )

  // 4. 拓扑排序确定备份顺序
  const { orderedTables } = topologicalSort(graph, allTables)

  // 5. 创建 ZIP 写入器
  const zipWriter = new ZipFileWriter(outputPath)

  const fileChecksums: Record<string, string> = {}
  let totalRows = 0

  statsTracker.update({
    phase: 'db-backup',
    tablesTotal: orderedTables.length,
    tablesCompleted: 0,
    totalRows: 0,
  })

  // 6. 逐表处理
  for (const tableName of orderedTables) {
    // 内存检查
    checkMemoryLimit()

    statsTracker.update({
      currentTable: tableName,
      currentRows: 0,
    })

    let tableRows = 0
    const fileName = `${tableName}.jsonl`

    // 创建收集流和 JSONL 写入器
    const collectStream = new BufferCollectStream()
    const jsonlWriter = new JsonlWriter(collectStream)

    try {
      let offset = 0
      let hasMore = true

      while (hasMore) {
        checkMemoryLimit()

        // 分页查询
        const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`,
          BATCH_SIZE,
          offset
        )

        if (rows.length === 0) {
          hasMore = false
          break
        }

        // 逐行序列化并写入 JSONL
        for (const row of rows) {
          jsonlWriter.writeRow(row)
          tableRows++
        }

        totalRows += rows.length
        offset += rows.length

        statsTracker.update({
          currentRows: tableRows,
          totalRows,
        })

        // 进度回调
        if (onProgress) {
          onProgress(tableName, tableRows)
        }

        // 速率控制
        await rateController.waitForBatch(rows.length)

        // 返回行数少于批次大小，说明没有更多数据
        if (rows.length < BATCH_SIZE) {
          hasMore = false
        }
      }
    } catch (error) {
      // 查询失败：记录错误，继续处理后续表
      const errorMsg = error instanceof Error ? error.message : String(error)
      const currentErrors = statsTracker.getStats().errors ?? []
      statsTracker.update({
        errors: [...currentErrors, `表 ${tableName} 备份失败: ${errorMsg}`],
      })
    }

    // 获取收集到的 JSONL 内容
    const content = collectStream.toBuffer()
    const sha256 = createHash('sha256').update(content).digest('hex')

    // 添加到 ZIP（空表生成 0 字节文件）
    zipWriter.addFile(fileName, content)
    fileChecksums[tableName] = sha256

    // 更新进度
    statsTracker.update({
      tablesCompleted:
        (statsTracker.getStats().tablesCompleted ?? 0) + 1,
    })

    // 速率控制：表完成后延迟
    await rateController.waitForTable()
    await statsTracker.forceFlush()
  }

  // 7. 完成 ZIP 文件
  await zipWriter.finalize()

  const duration = Date.now() - startTime

  return {
    zipPath: outputPath,
    totalTables: orderedTables.length,
    totalRows,
    duration,
    fileChecksums,
  }
}
