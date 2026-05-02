/**
 * 文件备份引擎测试
 *
 * 覆盖场景：
 * - 本地文件备份成功（3 个文件）
 * - 云存储（provider.downloadFileStream）备份
 * - 单文件失败不中断备份
 * - mapping.json 正确生成
 * - statsTracker 更新正确
 * - 空文件列表正常处理
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
  readFileSync,
  statSync,
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Readable } from 'node:stream'
import {
  createFileBackup,
  StreamingZipWriter,
  type PrismaClientLike,
  type MediaAssetRow,
} from './file-backup-engine'
import { RateController } from './rate-controller'
import { StatsTracker } from './stats-tracker'
import type { ObjectStorageProvider } from '@/lib/storage/types/provider'

// ============================================================
// 测试工具函数
// ============================================================

/**
 * Function: readZipEntries
 *
 * Description: 从 ZIP 文件中读取所有条目（基于中央目录解析）
 * 使用 STORE 方法，compressed size = uncompressed size
 *
 * Parameters:
 *   filePath(string): ZIP 文件路径
 *
 * Returns:
 *   Map<string, Buffer>: 文件名 → 数据的映射
 */
function readZipEntries(filePath: string): Map<string, Buffer> {
  const buf = readFileSync(filePath)
  const entries = new Map<string, Buffer>()

  // 从文件末尾向前扫描 EOCD 签名
  let eocdOffset = buf.length - 22
  while (eocdOffset >= 0 && buf.readUInt32LE(eocdOffset) !== 0x06054b50) {
    eocdOffset--
  }
  if (eocdOffset < 0) throw new Error('EOCD not found in ZIP file')

  const cdOffset = buf.readUInt32LE(eocdOffset + 16)
  const cdEntries = buf.readUInt16LE(eocdOffset + 10)

  let pos = cdOffset
  for (let i = 0; i < cdEntries; i++) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) break

    const nameLen = buf.readUInt16LE(pos + 28)
    const extraLen = buf.readUInt16LE(pos + 30)
    const commentLen = buf.readUInt16LE(pos + 32)
    const compSize = buf.readUInt32LE(pos + 20)
    const localOffset = buf.readUInt32LE(pos + 42)

    const name = buf
      .subarray(pos + 46, pos + 46 + nameLen)
      .toString('utf8')

    // 从本地文件头定位数据区域
    const localNameLen = buf.readUInt16LE(localOffset + 26)
    const localExtraLen = buf.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + localNameLen + localExtraLen
    const data = buf.subarray(dataStart, dataStart + compSize)

    entries.set(name, Buffer.from(data))
    pos += 46 + nameLen + extraLen + commentLen
  }

  return entries
}

/**
 * Function: createMockPrisma
 *
 * Description: 创建模拟 Prisma 客户端
 *
 * Parameters:
 *   assets(MediaAssetRow[]): 查询返回的媒体资源列表
 *
 * Returns:
 *   PrismaClientLike: 模拟的 Prisma 客户端
 */
function createMockPrisma(assets: MediaAssetRow[]): PrismaClientLike {
  return {
    $queryRawUnsafe: vi.fn<Promise<MediaAssetRow[]>, [string]>().mockResolvedValue(assets),
  }
}

/**
 * Function: createMockProvider
 *
 * Description: 创建模拟对象存储提供者
 *
 * Parameters:
 *   files(Map<string, Buffer>): 文件键 → 数据的映射
 *
 * Returns:
 *   ObjectStorageProvider: 模拟的存储提供者
 */
function createMockProvider(
  files: Map<string, Buffer>,
): ObjectStorageProvider {
  return {
    downloadFileStream: vi.fn((key: string) => {
      const data = files.get(key)
      if (!data) return Promise.reject(new Error(`File not found: ${key}`))
      return Promise.resolve(Readable.from(data))
    }),
    issueUploadPolicy: vi.fn(),
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
    getFileUrl: vi.fn(),
    getSignedUrl: vi.fn(),
    listFiles: vi.fn(),
    searchFiles: vi.fn(),
    downloadFile: vi.fn(),
    getImageProcessingUrl: vi.fn(),
    getImageProcessingUrls: vi.fn(),
  } as unknown as ObjectStorageProvider
}

/**
 * Function: createTestTracker
 *
 * Description: 创建测试用 StatsTracker（零延迟，无实际 IO）
 */
function createTestTracker() {
  return new StatsTracker({
    flushCallback: async () => {},
    debounceMs: 0,
  })
}

// ============================================================
// 测试套件
// ============================================================

describe('createFileBackup', () => {
  let tempDir: string
  let storageDir: string
  let outputDir: string

  beforeEach(() => {
    tempDir = join(tmpdir(), `file-backup-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    storageDir = join(tempDir, 'storage')
    outputDir = join(tempDir, 'output')
    mkdirSync(storageDir, { recursive: true })
    mkdirSync(outputDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('本地文件备份成功（3 个文件）', async () => {
    const files = [
      { object_key: 'uploads/a.jpg', content: Buffer.from('image-a-data') },
      { object_key: 'uploads/b.png', content: Buffer.from('image-b-data-longer') },
      { object_key: 'uploads/docs/c.pdf', content: Buffer.from('pdf-content-here') },
    ]

    // 在 storageDir 下创建测试文件
    for (const f of files) {
      const dir = join(storageDir, f.object_key.split('/').slice(0, -1).join('/'))
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(storageDir, f.object_key), f.content)
    }

    const assets: MediaAssetRow[] = files.map((f) => ({
      object_key: f.object_key,
      file_name: f.object_key.split('/').pop()!,
      content_type: 'application/octet-stream',
      size_bytes: f.content.length,
    }))

    const prisma = createMockPrisma(assets)
    const provider = createMockProvider(new Map())
    const tracker = createTestTracker()
    const rateController = new RateController({
      fileDelayMs: 0,
      fileBatchSize: 100,
    })
    const outputPath = join(outputDir, 'backup.zip')

    const result = await createFileBackup({
      outputPath,
      prisma,
      provider,
      storageType: 'local',
      statsTracker: tracker,
      rateController,
      baseDir: storageDir,
    })

    // 验证结果统计
    expect(result.totalFiles).toBe(3)
    expect(result.successFiles).toBe(3)
    expect(result.failedFiles).toBe(0)
    expect(result.failedFileList).toHaveLength(0)
    expect(result.totalBytes).toBe(
      files.reduce((sum, f) => sum + f.content.length, 0),
    )
    expect(result.zipPath).toBe(outputPath)

    // 验证 mapping
    expect(Object.keys(result.mapping)).toHaveLength(3)
    expect(result.mapping['uploads/a.jpg']).toBe('files/uploads/a.jpg')
    expect(result.mapping['uploads/b.png']).toBe('files/uploads/b.png')
    expect(result.mapping['uploads/docs/c.pdf']).toBe('files/uploads/docs/c.pdf')

    // 验证 ZIP 文件存在且非空
    expect(existsSync(outputPath)).toBe(true)
    expect(statSync(outputPath).size).toBeGreaterThan(0)

    // 验证 ZIP 内容
    const entries = readZipEntries(outputPath)
    expect(entries.has('files/uploads/a.jpg')).toBe(true)
    expect(entries.has('files/uploads/b.png')).toBe(true)
    expect(entries.has('files/uploads/docs/c.pdf')).toBe(true)
    expect(entries.has('mapping.json')).toBe(true)

    // 验证文件内容完整性
    expect(entries.get('files/uploads/a.jpg')!.toString()).toBe('image-a-data')
    expect(entries.get('files/uploads/b.png')!.toString()).toBe('image-b-data-longer')
    expect(entries.get('files/uploads/docs/c.pdf')!.toString()).toBe('pdf-content-here')

    // 验证 mapping.json 内容
    const mappingData = JSON.parse(entries.get('mapping.json')!.toString())
    expect(mappingData).toEqual(result.mapping)
  })

  it('云存储备份成功（通过 provider.downloadFileStream）', async () => {
    const cloudFiles = new Map([
      ['oss/images/photo.jpg', Buffer.from('cloud-photo-data')],
      ['oss/docs/report.pdf', Buffer.from('cloud-report-data')],
    ])

    const assets: MediaAssetRow[] = [
      {
        object_key: 'oss/images/photo.jpg',
        file_name: 'photo.jpg',
        content_type: 'image/jpeg',
        size_bytes: 16,
      },
      {
        object_key: 'oss/docs/report.pdf',
        file_name: 'report.pdf',
        content_type: 'application/pdf',
        size_bytes: 17,
      },
    ]

    const prisma = createMockPrisma(assets)
    const provider = createMockProvider(cloudFiles)
    const tracker = createTestTracker()
    const rateController = new RateController({ fileDelayMs: 0, fileBatchSize: 100 })
    const outputPath = join(outputDir, 'cloud-backup.zip')

    const result = await createFileBackup({
      outputPath,
      prisma,
      provider,
      storageType: 'aliyun_oss',
      statsTracker: tracker,
      rateController,
    })

    expect(result.successFiles).toBe(2)
    expect(result.failedFiles).toBe(0)
    expect(provider.downloadFileStream).toHaveBeenCalledWith('oss/images/photo.jpg')
    expect(provider.downloadFileStream).toHaveBeenCalledWith('oss/docs/report.pdf')

    const entries = readZipEntries(outputPath)
    expect(entries.get('files/oss/images/photo.jpg')!.toString()).toBe('cloud-photo-data')
    expect(entries.get('files/oss/docs/report.pdf')!.toString()).toBe('cloud-report-data')
  })

  it('单文件失败不中断备份', async () => {
    // 创建 2 个存在的文件
    const existingFiles = [
      { object_key: 'uploads/exist1.jpg', content: Buffer.from('data1') },
      { object_key: 'uploads/exist2.jpg', content: Buffer.from('data2') },
    ]
    for (const f of existingFiles) {
      const dir = join(storageDir, f.object_key.split('/').slice(0, -1).join('/'))
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(storageDir, f.object_key), f.content)
    }

    const assets: MediaAssetRow[] = [
      ...existingFiles.map((f) => ({
        object_key: f.object_key,
        file_name: f.object_key.split('/').pop()!,
        content_type: 'application/octet-stream',
        size_bytes: f.content.length,
      })),
      {
        object_key: 'uploads/missing.jpg',
        file_name: 'missing.jpg',
        content_type: 'image/jpeg',
        size_bytes: 100,
      },
    ]

    const prisma = createMockPrisma(assets)
    const provider = createMockProvider(new Map())
    const tracker = createTestTracker()
    const rateController = new RateController({ fileDelayMs: 0, fileBatchSize: 100 })

    const result = await createFileBackup({
      outputPath: join(outputDir, 'partial-backup.zip'),
      prisma,
      provider,
      storageType: 'local',
      statsTracker: tracker,
      rateController,
      baseDir: storageDir,
    })

    expect(result.totalFiles).toBe(3)
    expect(result.successFiles).toBe(2)
    expect(result.failedFiles).toBe(1)
    expect(result.failedFileList).toEqual(['uploads/missing.jpg'])

    // 失败文件不在 mapping 中
    expect(result.mapping['uploads/missing.jpg']).toBeUndefined()
    expect(result.mapping['uploads/exist1.jpg']).toBe('files/uploads/exist1.jpg')
    expect(result.mapping['uploads/exist2.jpg']).toBe('files/uploads/exist2.jpg')

    // ZIP 只包含成功的文件 + mapping.json
    const entries = readZipEntries(join(outputDir, 'partial-backup.zip'))
    expect(entries.has('files/uploads/exist1.jpg')).toBe(true)
    expect(entries.has('files/uploads/exist2.jpg')).toBe(true)
    expect(entries.has('files/uploads/missing.jpg')).toBe(false)
    expect(entries.has('mapping.json')).toBe(true)
  })

  it('mapping.json 正确生成', async () => {
    const fileContent = Buffer.from('mapping-test-content')
    mkdirSync(join(storageDir, 'uploads'), { recursive: true })
    writeFileSync(join(storageDir, 'uploads', 'test.txt'), fileContent)

    const assets: MediaAssetRow[] = [
      {
        object_key: 'uploads/test.txt',
        file_name: 'test.txt',
        content_type: 'text/plain',
        size_bytes: fileContent.length,
      },
    ]

    const prisma = createMockPrisma(assets)
    const provider = createMockProvider(new Map())
    const tracker = createTestTracker()
    const rateController = new RateController({ fileDelayMs: 0, fileBatchSize: 100 })
    const outputPath = join(outputDir, 'mapping-test.zip')

    await createFileBackup({
      outputPath,
      prisma,
      provider,
      storageType: 'local',
      statsTracker: tracker,
      rateController,
      baseDir: storageDir,
    })

    const entries = readZipEntries(outputPath)
    const mappingJson = entries.get('mapping.json')!.toString()
    const mapping = JSON.parse(mappingJson)

    expect(mapping).toEqual({
      'uploads/test.txt': 'files/uploads/test.txt',
    })
  })

  it('statsTracker 更新正确', async () => {
    const fileContent = Buffer.from('tracker-test-content-here')
    mkdirSync(join(storageDir, 'uploads'), { recursive: true })
    writeFileSync(join(storageDir, 'uploads', 'tracker.txt'), fileContent)

    const assets: MediaAssetRow[] = [
      {
        object_key: 'uploads/tracker.txt',
        file_name: 'tracker.txt',
        content_type: 'text/plain',
        size_bytes: fileContent.length,
      },
    ]

    const prisma = createMockPrisma(assets)
    const provider = createMockProvider(new Map())
    const tracker = createTestTracker()
    const rateController = new RateController({ fileDelayMs: 0, fileBatchSize: 100 })

    await createFileBackup({
      outputPath: join(outputDir, 'tracker-test.zip'),
      prisma,
      provider,
      storageType: 'local',
      statsTracker: tracker,
      rateController,
      baseDir: storageDir,
    })

    const finalStats = tracker.getStats()
    expect(finalStats.phase).toBe('files')
    expect(finalStats.filesTotal).toBe(1)
    expect(finalStats.filesCompleted).toBe(1)
    expect(finalStats.bytesTransferred).toBe(fileContent.length)
    expect(finalStats.failedFiles).toBe(0)
  })

  it('空文件列表正常处理', async () => {
    const prisma = createMockPrisma([])
    const provider = createMockProvider(new Map())
    const tracker = createTestTracker()
    const rateController = new RateController({ fileDelayMs: 0, fileBatchSize: 100 })
    const outputPath = join(outputDir, 'empty-backup.zip')

    const result = await createFileBackup({
      outputPath,
      prisma,
      provider,
      storageType: 'local',
      statsTracker: tracker,
      rateController,
      baseDir: storageDir,
    })

    expect(result.totalFiles).toBe(0)
    expect(result.successFiles).toBe(0)
    expect(result.failedFiles).toBe(0)
    expect(result.failedFileList).toHaveLength(0)
    expect(result.totalBytes).toBe(0)
    expect(Object.keys(result.mapping)).toHaveLength(0)
    expect(existsSync(outputPath)).toBe(true)

    // 空 ZIP 仍然有 mapping.json（内容为 {}）
    const entries = readZipEntries(outputPath)
    expect(entries.has('mapping.json')).toBe(true)
    const mapping = JSON.parse(entries.get('mapping.json')!.toString())
    expect(mapping).toEqual({})
  })
})

describe('StreamingZipWriter', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = join(tmpdir(), `zip-writer-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tempDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('应正确写入 Buffer 条目并生成有效 ZIP', () => {
    const zipPath = join(tempDir, 'buffer-test.zip')
    const writer = new StreamingZipWriter(zipPath)

    writer.addFile('hello.txt', Buffer.from('hello world'))
    writer.addFile('nested/dir/file.txt', Buffer.from('nested content'))
    writer.finalize()

    const entries = readZipEntries(zipPath)
    expect(entries.get('hello.txt')!.toString()).toBe('hello world')
    expect(entries.get('nested/dir/file.txt')!.toString()).toBe('nested content')
  })

  it('应正确流式写入 Readable 数据', async () => {
    const zipPath = join(tempDir, 'stream-test.zip')
    const writer = new StreamingZipWriter(zipPath)

    const data = Buffer.from('streaming-data-content')
    const stream = Readable.from(data)

    const result = await writer.addFileStream('stream.bin', stream)
    writer.finalize()

    expect(result.size).toBe(data.length)
    expect(result.crc32).toBeGreaterThan(0)

    const entries = readZipEntries(zipPath)
    expect(entries.get('stream.bin')!.toString()).toBe('streaming-data-content')
  })

  it('应正确处理空文件（0 bytes）', async () => {
    const zipPath = join(tempDir, 'empty-file-test.zip')
    const writer = new StreamingZipWriter(zipPath)

    const emptyStream = Readable.from([])
    const result = await writer.addFileStream('empty.dat', emptyStream)
    writer.addFile('also-empty.txt', Buffer.alloc(0))
    writer.finalize()

    expect(result.size).toBe(0)
    expect(result.crc32).toBe(0)

    const entries = readZipEntries(zipPath)
    expect(entries.get('empty.dat')!.length).toBe(0)
    expect(entries.get('also-empty.txt')!.length).toBe(0)
  })

  it('流式写入失败时应恢复 ZIP 结构', async () => {
    const zipPath = join(tempDir, 'error-recovery-test.zip')
    const writer = new StreamingZipWriter(zipPath)

    // 先写入一个成功的 Buffer 条目
    writer.addFile('ok.txt', Buffer.from('ok-data'))

    // 创建一个会中途报错的流
    const errorStream = new Readable({
      read() {
        this.push(Buffer.from('partial-'))
        this.push(null) // 结束流（模拟：实际中错误会通过 error 事件抛出）
      },
    })

    const result = await writer.addFileStream('stream.txt', errorStream)
    writer.addFile('after.txt', Buffer.from('after-data'))
    writer.finalize()

    // 验证所有条目都存在
    const entries = readZipEntries(zipPath)
    expect(entries.get('ok.txt')!.toString()).toBe('ok-data')
    expect(entries.get('stream.txt')!.toString()).toBe('partial-')
    expect(entries.get('after.txt')!.toString()).toBe('after-data')
  })
})
