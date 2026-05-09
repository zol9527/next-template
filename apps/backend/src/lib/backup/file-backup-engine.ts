/**
 * 文件备份引擎
 *
 * 职责：从存储后端下载媒体文件并流式写入 ZIP 归档
 * 支持 local / aliyun_oss / tencent_cos 三种存储类型
 *
 * 设计要点：
 * - 使用 STORE（无压缩）方法 + seek 回写实现流式写入
 * - 逐块读取源流并计算 CRC32，写入完成后回填文件头
 * - 单个文件失败不中断整体备份（通过截断 + 回退 offset 恢复）
 * - mapping.json 记录 objectKey → ZIP 内路径的映射关系
 */

import {
  openSync,
  writeSync,
  closeSync,
  ftruncateSync,
  createReadStream,
  mkdirSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { Readable } from 'node:stream'
import { RateController } from './rate-controller'
import { StatsTracker } from './stats-tracker'
import type { ObjectStorageProvider } from '@/lib/storage/types/provider'

// ============================================================
// 类型定义
// ============================================================

/**
 * Prisma 客户端接口（仅暴露原始查询方法）
 */
export interface PrismaClientLike {
  $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T>
}

/**
 * 媒体资源查询结果行
 */
export interface MediaAssetRow {
  object_key: string
  file_name: string
  content_type: string
  size_bytes: number
}

/**
 * 文件备份参数
 */
export interface FileBackupParams {
  /** ZIP 输出路径 */
  outputPath: string
  /** Prisma 客户端实例 */
  prisma: PrismaClientLike
  /** 对象存储提供者 */
  provider: ObjectStorageProvider
  /** 存储类型 */
  storageType: 'local' | 'aliyun_oss' | 'tencent_cos'
  /** 进度追踪器 */
  statsTracker: StatsTracker
  /** 速率控制器 */
  rateController: RateController
  /** local 存储的根目录 */
  baseDir?: string
}

/**
 * 文件备份结果
 */
export interface FileBackupResult {
  /** ZIP 文件路径 */
  zipPath: string
  /** 文件总数 */
  totalFiles: number
  /** 成功文件数 */
  successFiles: number
  /** 失败文件数 */
  failedFiles: number
  /** 失败文件列表 */
  failedFileList: string[]
  /** 总传输字节数 */
  totalBytes: number
  /** objectKey → ZIP 内路径映射 */
  mapping: Record<string, string>
}

// ============================================================
// CRC32 查找表（预计算 256 项）
// ============================================================

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[i] = c
  }
  return table
})()

// ============================================================
// ZIP 格式常量
// ============================================================

const LOCAL_FILE_HEADER_SIG = 0x04034b50
const CENTRAL_DIR_SIG = 0x02014b50
const EOCD_SIG = 0x06054b50
const METHOD_STORE = 0
const VERSION_NEEDED = 20
const LOCAL_HEADER_SIZE = 30
const CENTRAL_DIR_HEADER_SIZE = 46
const EOCD_SIZE = 22

// ============================================================
// StreamingZipWriter - 流式 ZIP 写入器
// ============================================================

/**
 * ZIP 条目元数据（用于写入中央目录）
 */
interface ZipEntry {
  /** 文件名（ZIP 内路径） */
  name: string
  /** CRC32 校验值 */
  crc32: number
  /** 压缩/未压缩大小（STORE 模式下两者相同） */
  size: number
  /** 本地文件头在文件中的偏移 */
  localHeaderOffset: number
}

/**
 * 流式 ZIP 写入器
 *
 * 使用同步文件 IO + seek 回写实现流式写入：
 * 1. 先写占位文件头（CRC/size 置 0）
 * 2. 逐块写入数据并计算 CRC32
 * 3. 写完后 seek 回文件头填入实际 CRC 和 size
 * 4. 失败时截断文件 + 回退 offset，保证 ZIP 结构完整
 */
class StreamingZipWriter {
  private fd: number
  private offset = 0
  private entries: ZipEntry[] = []

  /**
   * Function: constructor
   *
   * Description: 创建 ZIP 写入器，打开输出文件
   *
   * Parameters:
   *   outputPath(string): ZIP 文件输出路径
   */
  constructor(outputPath: string) {
    mkdirSync(dirname(outputPath), { recursive: true })
    this.fd = openSync(outputPath, 'w')
  }

  /**
   * Function: writeBuffer
   *
   * Description: 在当前 offset 位置写入 Buffer
   *
   * Parameters:
   *   buffer(Buffer): 待写入的数据
   */
  private writeBuffer(buffer: Buffer): void {
    writeSync(this.fd, buffer, 0, buffer.length, this.offset)
    this.offset += buffer.length
  }

  /**
   * Function: updateAt
   *
   * Description: 在指定位置覆写 CRC32 和 size 字段
   *
   * Parameters:
   *   position(number): 文件内偏移位置
   *   crc32(number): CRC32 校验值
   *   size(number): 文件大小
   */
  private updateAt(position: number, crc32: number, size: number): void {
    const buf = Buffer.alloc(12)
    buf.writeUInt32LE(crc32, 0)
    buf.writeUInt32LE(size, 4)
    buf.writeUInt32LE(size, 8)
    writeSync(this.fd, buf, 0, 12, position)
  }

  /**
   * Function: addFile
   *
   * Description: 添加 Buffer 数据作为 ZIP 条目（适用于小文件如 mapping.json）
   * 已知 CRC 和大小，无需 seek 回写
   *
   * Parameters:
   *   name(string): ZIP 内文件名
   *   data(Buffer): 文件数据
   */
  addFile(name: string, data: Buffer): void {
    const nameBuf = Buffer.from(name, 'utf8')
    const crc = computeCrc32(data)
    const size = data.length
    const localHeaderOffset = this.offset

    // 构建本地文件头（30 字节 + 文件名）
    const header = Buffer.alloc(LOCAL_HEADER_SIZE + nameBuf.length)
    header.writeUInt32LE(LOCAL_FILE_HEADER_SIG, 0)
    header.writeUInt16LE(VERSION_NEEDED, 4)
    header.writeUInt16LE(0, 6)                       // 无特殊标志
    header.writeUInt16LE(METHOD_STORE, 8)             // STORE（无压缩）
    header.writeUInt16LE(0, 10)                       // last mod time
    header.writeUInt16LE(0, 12)                       // last mod date
    header.writeUInt32LE(crc, 14)                     // CRC32
    header.writeUInt32LE(size, 18)                    // compressed size
    header.writeUInt32LE(size, 22)                    // uncompressed size
    header.writeUInt16LE(nameBuf.length, 26)          // 文件名长度
    header.writeUInt16LE(0, 28)                       // extra field 长度
    nameBuf.copy(header, LOCAL_HEADER_SIZE)

    this.writeBuffer(header)
    this.writeBuffer(data)

    this.entries.push({ name, crc32: crc, size, localHeaderOffset })
  }

  /**
   * Function: addFileStream
   *
   * Description: 流式添加文件到 ZIP（适用于大文件）
   * 使用 seek 回写方式：先写占位文件头，流式写入数据，最后回填 CRC/size
   * 失败时截断文件并回退 offset，保证 ZIP 结构不被破坏
   *
   * Parameters:
   *   name(string): ZIP 内文件名
   *   source(Readable): 文件数据流
   *
   * Returns:
   *   { crc32: number, size: number }: CRC32 校验值和文件大小
   */
  async addFileStream(
    name: string,
    source: Readable,
  ): Promise<{ crc32: number; size: number }> {
    const nameBuf = Buffer.from(name, 'utf8')
    const localHeaderOffset = this.offset

    // 写入占位文件头（CRC/size 置 0，后续回填）
    const header = Buffer.alloc(LOCAL_HEADER_SIZE + nameBuf.length)
    header.writeUInt32LE(LOCAL_FILE_HEADER_SIG, 0)
    header.writeUInt16LE(VERSION_NEEDED, 4)
    header.writeUInt16LE(0, 6)
    header.writeUInt16LE(METHOD_STORE, 8)
    header.writeUInt16LE(0, 10)
    header.writeUInt16LE(0, 12)
    header.writeUInt32LE(0, 14)                       // CRC32 占位
    header.writeUInt32LE(0, 18)                       // size 占位
    header.writeUInt32LE(0, 22)                       // size 占位
    header.writeUInt16LE(nameBuf.length, 26)
    header.writeUInt16LE(0, 28)
    nameBuf.copy(header, LOCAL_HEADER_SIZE)

    this.writeBuffer(header)

    // 逐块读取源流，计算 CRC32 并写入文件
    let crcState = 0xFFFFFFFF
    let totalSize = 0

    try {
      for await (const chunk of source) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array)
        // 逐字节更新 CRC32 状态
        for (let i = 0; i < buf.length; i++) {
          crcState = CRC32_TABLE[(crcState ^ buf[i]) & 0xFF] ^ (crcState >>> 8)
        }
        totalSize += buf.length
        this.writeBuffer(buf)
      }

      const crcValue = (crcState ^ 0xFFFFFFFF) >>> 0

      // 回填文件头中的 CRC 和 size 字段
      this.updateAt(localHeaderOffset + 14, crcValue, totalSize)

      this.entries.push({ name, crc32: crcValue, size: totalSize, localHeaderOffset })

      return { crc32: crcValue, size: totalSize }
    } catch (error) {
      // 销毁源流防止资源泄漏
      if (!source.destroyed) {
        source.destroy()
      }

      // 截断文件到文件头之前的位置，移除部分写入的数据
      this.offset = localHeaderOffset
      ftruncateSync(this.fd, this.offset)

      throw error
    }
  }

  /**
   * Function: finalize
   *
   * Description: 写入中央目录和 EOCD 记录，关闭 ZIP 文件
   */
  finalize(): void {
    const cdOffset = this.offset

    // 写入所有条目的中央目录头
    for (const entry of this.entries) {
      const nameBuf = Buffer.from(entry.name, 'utf8')
      const cdHeader = Buffer.alloc(CENTRAL_DIR_HEADER_SIZE + nameBuf.length)
      cdHeader.writeUInt32LE(CENTRAL_DIR_SIG, 0)
      cdHeader.writeUInt16LE(VERSION_NEEDED, 4)       // version made by
      cdHeader.writeUInt16LE(VERSION_NEEDED, 6)       // version needed
      cdHeader.writeUInt16LE(0, 8)                     // general purpose flags
      cdHeader.writeUInt16LE(METHOD_STORE, 10)         // compression method
      cdHeader.writeUInt16LE(0, 12)                    // last mod time
      cdHeader.writeUInt16LE(0, 14)                    // last mod date
      cdHeader.writeUInt32LE(entry.crc32, 16)
      cdHeader.writeUInt32LE(entry.size, 20)           // compressed size
      cdHeader.writeUInt32LE(entry.size, 24)           // uncompressed size
      cdHeader.writeUInt16LE(nameBuf.length, 28)
      cdHeader.writeUInt16LE(0, 30)                    // extra field length
      cdHeader.writeUInt16LE(0, 32)                    // file comment length
      cdHeader.writeUInt16LE(0, 34)                    // disk number start
      cdHeader.writeUInt16LE(0, 36)                    // internal file attributes
      cdHeader.writeUInt32LE(0, 38)                    // external file attributes
      cdHeader.writeUInt32LE(entry.localHeaderOffset, 42)
      nameBuf.copy(cdHeader, CENTRAL_DIR_HEADER_SIZE)

      this.writeBuffer(cdHeader)
    }

    const cdSize = this.offset - cdOffset

    // 写入 EOCD（End of Central Directory Record）
    const eocd = Buffer.alloc(EOCD_SIZE)
    eocd.writeUInt32LE(EOCD_SIG, 0)
    eocd.writeUInt16LE(0, 4)                          // disk number
    eocd.writeUInt16LE(0, 6)                          // disk with CD start
    eocd.writeUInt16LE(this.entries.length, 8)         // entries on this disk
    eocd.writeUInt16LE(this.entries.length, 10)        // total entries
    eocd.writeUInt32LE(cdSize, 12)                     // CD size
    eocd.writeUInt32LE(cdOffset, 16)                   // CD offset
    eocd.writeUInt16LE(0, 20)                          // comment length

    this.writeBuffer(eocd)
    closeSync(this.fd)
  }
}

// ============================================================
// 工具函数
// ============================================================

/**
 * Function: computeCrc32
 *
 * Description: 计算 Buffer 的 CRC32 校验值
 *
 * Parameters:
 *   data(Buffer): 输入数据
 *
 * Returns:
 *   number: CRC32 校验值（无符号 32 位）
 */
function computeCrc32(data: Buffer): number {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

// ============================================================
// 导出
// ============================================================

export { StreamingZipWriter }

/**
 * Function: createFileBackup
 *
 * Description: 创建文件备份 ZIP，从存储后端下载所有活跃媒体文件并流式写入
 * 支持本地文件系统和云存储（阿里云 OSS / 腾讯云 COS）
 *
 * Parameters:
 *   params(FileBackupParams): 备份参数集合
 *
 * Returns:
 *   FileBackupResult: 备份结果（含统计信息和文件映射）
 */
export async function createFileBackup(
  params: FileBackupParams,
): Promise<FileBackupResult> {
  const {
    outputPath,
    prisma,
    provider,
    storageType,
    statsTracker,
    rateController,
    baseDir,
  } = params

  // 1. 查询所有活跃的媒体资源记录
  const assets = await prisma.$queryRawUnsafe<MediaAssetRow[]>(
    `SELECT object_key, file_name, content_type, size_bytes FROM media_assets WHERE status = 'active' ORDER BY created_at`,
  )

  const mapping: Record<string, string> = {}
  const failedFileList: string[] = []
  let totalBytes = 0

  // 初始化进度追踪
  statsTracker.update({
    phase: 'files',
    filesTotal: assets.length,
    filesCompleted: 0,
    failedFiles: 0,
    failedFileList: [],
    bytesTransferred: 0,
  })

  // 2. 创建 ZIP 写入器
  const zipWriter = new StreamingZipWriter(outputPath)

  // 3. 逐文件处理
  for (const asset of assets) {
    const zipPath = `files/${asset.object_key}`

    try {
      let stream: Readable

      if (storageType === 'local') {
        // 本地存储：直接从文件系统读取
        if (!baseDir) {
          throw new Error('baseDir is required for local storage type')
        }
        stream = createReadStream(join(baseDir, asset.object_key))
      } else {
        // 云存储：通过 provider 下载流
        stream = await provider.downloadFileStream(asset.object_key)
      }

      const result = await zipWriter.addFileStream(zipPath, stream)
      mapping[asset.object_key] = zipPath
      totalBytes += result.size
    } catch {
      // 单个文件失败不中断整体备份
      failedFileList.push(asset.object_key)
    }

    // 更新进度
    statsTracker.update({
      filesCompleted: (statsTracker.getStats().filesCompleted ?? 0) + 1,
      failedFiles: failedFileList.length,
      failedFileList: [...failedFileList],
      bytesTransferred: totalBytes,
    })

    // 速率控制
    await rateController.waitForFile()
  }

  // 4. 添加 mapping.json（记录 objectKey → ZIP 路径的映射）
  const mappingJson = JSON.stringify(mapping, null, 2)
  zipWriter.addFile('mapping.json', Buffer.from(mappingJson, 'utf8'))

  // 5. 完成 ZIP（写入中央目录 + EOCD）
  zipWriter.finalize()

  return {
    zipPath: outputPath,
    totalFiles: assets.length,
    successFiles: assets.length - failedFileList.length,
    failedFiles: failedFileList.length,
    failedFileList,
    totalBytes,
    mapping,
  }
}
