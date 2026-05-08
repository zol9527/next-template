/**
 * 文件恢复引擎测试
 *
 * 覆盖场景：
 * - 文件恢复到 provider（多文件正常恢复）
 * - 单文件失败不中断
 * - 空文件正常处理（空 mapping）
 * - statsTracker 更新正确
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createTestZip } from './integrity-check'
import { restoreFiles } from './file-restore-engine'
import { RateController } from './rate-controller'
import { StatsTracker } from './stats-tracker'
import type { ObjectStorageProvider } from '@/lib/storage/types/provider'

// ============================================================
// 测试工具函数
// ============================================================

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

/**
 * Function: createMockProvider
 *
 * Description: 创建模拟对象存储提供者，记录所有上传调用
 *
 * Parameters:
 *   shouldFail(Set<string>): 应该上传失败的 objectKey 集合
 *
 * Returns:
 *   { provider: ObjectStorageProvider, uploads: Map<string, Buffer> }:
 *     模拟提供者和上传记录
 */
function createMockProvider(shouldFail: Set<string> = new Set()) {
  const uploads = new Map<string, Buffer>()

  const provider = {
    uploadFile: vi.fn(async (params: { file: Buffer; key: string; contentType: string }) => {
      if (shouldFail.has(params.key)) {
        throw new Error(`Upload failed: ${params.key}`)
      }
      uploads.set(params.key, params.file)
      return { url: `https://storage.example.com/${params.key}`, key: params.key }
    }),
    issueUploadPolicy: vi.fn(),
    deleteFile: vi.fn(),
    getFileUrl: vi.fn(),
    getSignedUrl: vi.fn(),
    listFiles: vi.fn(),
    searchFiles: vi.fn(),
    downloadFile: vi.fn(),
    downloadFileStream: vi.fn(),
    getImageProcessingUrl: vi.fn(),
    getImageProcessingUrls: vi.fn(),
  } as unknown as ObjectStorageProvider

  return { provider, uploads }
}

// ============================================================
// 测试套件
// ============================================================

describe('restoreFiles', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = join(tmpdir(), `file-restore-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tempDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('文件恢复到 provider', async () => {
    const mapping = {
      'uploads/a.jpg': 'files/uploads/a.jpg',
      'uploads/b.png': 'files/uploads/b.png',
      'uploads/docs/c.pdf': 'files/uploads/docs/c.pdf',
    }

    const zipPath = join(tempDir, 'restore-test.zip')
    await createTestZip(zipPath, {
      'manifest.json': JSON.stringify({
        version: '1.0',
        createdAt: new Date().toISOString(),
        tables: [],
        models: [],
        plugins: [],
        files: {},
      }),
      'mapping.json': JSON.stringify(mapping),
      'files/uploads/a.jpg': Buffer.from('image-a-data'),
      'files/uploads/b.png': Buffer.from('image-b-data-longer'),
      'files/uploads/docs/c.pdf': Buffer.from('pdf-content-here'),
    })

    const { provider, uploads } = createMockProvider()
    const tracker = createTestTracker()
    const rateController = new RateController({ fileDelayMs: 0, fileBatchSize: 100 })

    const result = await restoreFiles({
      zipPath,
      provider,
      statsTracker: tracker,
      rateController,
    })

    expect(result.totalFiles).toBe(3)
    expect(result.restoredFiles).toBe(3)
    expect(result.failedFiles).toBe(0)
    expect(result.failedFileList).toHaveLength(0)
    expect(result.totalBytes).toBe(
      'image-a-data'.length + 'image-b-data-longer'.length + 'pdf-content-here'.length,
    )

    // 验证每个文件都被上传到正确的 key
    expect(uploads.has('uploads/a.jpg')).toBe(true)
    expect(uploads.has('uploads/b.png')).toBe(true)
    expect(uploads.has('uploads/docs/c.pdf')).toBe(true)
    expect(uploads.get('uploads/a.jpg')!.toString()).toBe('image-a-data')
    expect(uploads.get('uploads/b.png')!.toString()).toBe('image-b-data-longer')
    expect(uploads.get('uploads/docs/c.pdf')!.toString()).toBe('pdf-content-here')

    // 验证 uploadFile 被正确调用
    expect(provider.uploadFile).toHaveBeenCalledTimes(3)
  })

  it('单文件失败不中断', async () => {
    const mapping = {
      'uploads/ok1.jpg': 'files/uploads/ok1.jpg',
      'uploads/fail.jpg': 'files/uploads/fail.jpg',
      'uploads/ok2.jpg': 'files/uploads/ok2.jpg',
    }

    const zipPath = join(tempDir, 'partial-restore.zip')
    await createTestZip(zipPath, {
      'manifest.json': JSON.stringify({
        version: '1.0',
        createdAt: new Date().toISOString(),
        tables: [],
        models: [],
        plugins: [],
        files: {},
      }),
      'mapping.json': JSON.stringify(mapping),
      'files/uploads/ok1.jpg': Buffer.from('ok1-data'),
      'files/uploads/fail.jpg': Buffer.from('fail-data'),
      'files/uploads/ok2.jpg': Buffer.from('ok2-data'),
    })

    // uploads/fail.jpg 上传失败
    const { provider, uploads } = createMockProvider(new Set(['uploads/fail.jpg']))
    const tracker = createTestTracker()
    const rateController = new RateController({ fileDelayMs: 0, fileBatchSize: 100 })

    const result = await restoreFiles({
      zipPath,
      provider,
      statsTracker: tracker,
      rateController,
    })

    expect(result.totalFiles).toBe(3)
    expect(result.restoredFiles).toBe(2)
    expect(result.failedFiles).toBe(1)
    expect(result.failedFileList).toEqual(['uploads/fail.jpg'])

    // 成功的文件仍被正确上传
    expect(uploads.has('uploads/ok1.jpg')).toBe(true)
    expect(uploads.has('uploads/ok2.jpg')).toBe(true)
    expect(uploads.has('uploads/fail.jpg')).toBe(false)

    // uploadFile 被调用 3 次（包括失败的那次）
    expect(provider.uploadFile).toHaveBeenCalledTimes(3)
  })

  it('空文件正常处理', async () => {
    const zipPath = join(tempDir, 'empty-restore.zip')
    await createTestZip(zipPath, {
      'manifest.json': JSON.stringify({
        version: '1.0',
        createdAt: new Date().toISOString(),
        tables: [],
        models: [],
        plugins: [],
        files: {},
      }),
      'mapping.json': JSON.stringify({}),
    })

    const { provider } = createMockProvider()
    const tracker = createTestTracker()
    const rateController = new RateController({ fileDelayMs: 0, fileBatchSize: 100 })

    const result = await restoreFiles({
      zipPath,
      provider,
      statsTracker: tracker,
      rateController,
    })

    expect(result.totalFiles).toBe(0)
    expect(result.restoredFiles).toBe(0)
    expect(result.failedFiles).toBe(0)
    expect(result.failedFileList).toHaveLength(0)
    expect(result.totalBytes).toBe(0)

    // 无文件上传调用
    expect(provider.uploadFile).not.toHaveBeenCalled()
  })

  it('statsTracker 更新正确', async () => {
    const mapping = {
      'uploads/track1.txt': 'files/uploads/track1.txt',
      'uploads/track2.txt': 'files/uploads/track2.txt',
    }

    const zipPath = join(tempDir, 'tracker-restore.zip')
    await createTestZip(zipPath, {
      'manifest.json': JSON.stringify({
        version: '1.0',
        createdAt: new Date().toISOString(),
        tables: [],
        models: [],
        plugins: [],
        files: {},
      }),
      'mapping.json': JSON.stringify(mapping),
      'files/uploads/track1.txt': Buffer.from('tracker-content-1'),
      'files/uploads/track2.txt': Buffer.from('tracker-content-2-longer'),
    })

    const { provider } = createMockProvider()
    const tracker = createTestTracker()
    const rateController = new RateController({ fileDelayMs: 0, fileBatchSize: 100 })

    await restoreFiles({
      zipPath,
      provider,
      statsTracker: tracker,
      rateController,
    })

    const finalStats = tracker.getStats()
    expect(finalStats.phase).toBe('file-restore')
    expect(finalStats.filesTotal).toBe(2)
    expect(finalStats.filesCompleted).toBe(2)
    expect(finalStats.bytesTransferred).toBe(
      'tracker-content-1'.length + 'tracker-content-2-longer'.length,
    )
    expect(finalStats.failedFiles).toBe(0)
    expect(finalStats.failedFileList).toHaveLength(0)
  })
})
