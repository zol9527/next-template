/**
 * 预检报告单元测试
 *
 * @module lib/backup/pre-check.test
 *
 * 覆盖：
 * 1. 所有检查通过 → canProceed=true
 * 2. Schema 不兼容 → warnings 包含缺失 model
 * 3. 并发 Job 存在 → errors 包含并发信息
 * 4. 数据库不可达 → errors 包含错误信息
 * 5. ZIP 解析失败 → 后续依赖 manifest 的检查跳过
 * 6. ZIP 文件哈希不匹配 → errors 包含详情
 * 7. 插件不匹配 → warnings 包含缺失和多余插件
 * 8. 多项检查同时失败 → 正确汇总 errors 和 warnings
 *
 * 使用 vi.spyOn 而非 vi.mock，避免 Bun test runner 跨文件 mock 泄漏
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as integrityCheck from './integrity-check'
import * as schemaAnalyzer from './schema-analyzer'
import * as pluginRegistry from '@/plugins/registry'
import { preCheck, type PreCheckParams, type PrismaClientLike } from './pre-check'
import type { BackupManifest, IntegrityReport, SchemaCompatReport, PluginCompatReport } from './integrity-check'
import type { ObjectStorageProvider } from '@/lib/storage/types/provider'

// ── 测试辅助 ──────────────────────────────────────────

const createMockPrisma = (selectResult: unknown = [{ '1': 1 }]): PrismaClientLike => {
  return {
    $queryRawUnsafe: vi.fn().mockResolvedValue(selectResult),
    $queryRaw: vi.fn().mockResolvedValue([]),
  }
}

const createMockProvider = (): ObjectStorageProvider => ({
  issueUploadPolicy: vi.fn(),
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
  getFileUrl: vi.fn(),
  getSignedUrl: vi.fn(),
  listFiles: vi.fn(),
  searchFiles: vi.fn(),
  downloadFile: vi.fn(),
  downloadFileStream: vi.fn(),
  getImageProcessingUrl: vi.fn(),
  getImageProcessingUrls: vi.fn(),
})

const defaultManifest: BackupManifest = {
  version: '1.0.0',
  createdAt: '2025-01-01T00:00:00Z',
  tables: ['users', 'posts'],
  models: ['User', 'Post'],
  plugins: ['wechat'],
  files: { 'users.json': 'abc123', 'posts.json': 'def456' },
}

const defaultParams = (): PreCheckParams => ({
  zipPath: '/backup/test.zip',
  prisma: createMockPrisma(),
  provider: createMockProvider(),
  activeJobCount: 0,
  databaseName: 'test_db',
})

// ── 设置默认 spy 返回值 ──────────────────────────────

beforeEach(() => {
  vi.restoreAllMocks()

  // parseManifestFromZip 默认返回有效的 manifest
  vi.spyOn(integrityCheck, 'parseManifestFromZip').mockResolvedValue(defaultManifest)

  // verifyZipIntegrity 默认返回校验通过
  const validReport: IntegrityReport = { valid: true, checkedFiles: 2, mismatchedFiles: [], missingFiles: [] }
  vi.spyOn(integrityCheck, 'verifyZipIntegrity').mockResolvedValue(validReport)

  // checkSchemaCompatibility 默认返回完全兼容
  const compatReport: SchemaCompatReport = { compatible: true, missingModels: [], extraModels: [] }
  vi.spyOn(integrityCheck, 'checkSchemaCompatibility').mockReturnValue(compatReport)

  // checkPluginState 默认返回完全兼容
  const pluginReport: PluginCompatReport = { compatible: true, missingPlugins: [], extraPlugins: [] }
  vi.spyOn(integrityCheck, 'checkPluginState').mockReturnValue(pluginReport)

  // getTableNameMapping 默认返回与 manifest 匹配的表
  vi.spyOn(schemaAnalyzer, 'getTableNameMapping').mockResolvedValue(
    new Map([
      ['users', 'users'],
      ['posts', 'posts'],
    ])
  )

  // getEnabledPlugins 默认返回 wechat 已启用
  vi.spyOn(pluginRegistry, 'getEnabledPlugins').mockReturnValue({ wechat: true })
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── 测试用例 ──────────────────────────────────────────

describe('preCheck', () => {
  it('所有检查通过时 canProceed=true', async () => {
    const result = await preCheck(defaultParams())

    expect(result.canProceed).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
    expect(result.checks.zipIntegrity.passed).toBe(true)
    expect(result.checks.schemaCompatibility.passed).toBe(true)
    expect(result.checks.pluginState.passed).toBe(true)
    expect(result.checks.databaseConnection.passed).toBe(true)
    expect(result.checks.concurrentJob.passed).toBe(true)
  })

  it('Schema 不兼容时 warnings 包含缺失 model', async () => {
    // Arrange: schema 检查返回缺失 model
    vi.spyOn(integrityCheck, 'checkSchemaCompatibility').mockReturnValue({
      compatible: false,
      missingModels: ['Order', 'Product'],
      extraModels: [],
    })

    // Act
    const result = await preCheck(defaultParams())

    // Assert: 不阻止恢复，但产生警告
    expect(result.canProceed).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Order'),
        expect.stringContaining('Product'),
      ])
    )
    expect(result.checks.schemaCompatibility.passed).toBe(false)
    expect(result.checks.schemaCompatibility.missingModels).toEqual(['Order', 'Product'])
  })

  it('Schema 多余 model 时也产生 warnings', async () => {
    vi.spyOn(integrityCheck, 'checkSchemaCompatibility').mockReturnValue({
      compatible: false,
      missingModels: [],
      extraModels: ['Blog'],
    })

    const result = await preCheck(defaultParams())

    expect(result.canProceed).toBe(true)
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('Blog')])
    )
    expect(result.checks.schemaCompatibility.extraModels).toEqual(['Blog'])
  })

  it('并发 Job 存在时 errors 包含并发信息', async () => {
    const params = defaultParams()
    params.activeJobCount = 3

    const result = await preCheck(params)

    expect(result.canProceed).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('3')])
    )
    expect(result.checks.concurrentJob.passed).toBe(false)
    expect(result.checks.concurrentJob.activeJobCount).toBe(3)
  })

  it('数据库不可达时 errors 包含错误信息', async () => {
    const prisma = createMockPrisma()
    ;(prisma.$queryRawUnsafe as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Connection refused')
    )

    const params = defaultParams()
    params.prisma = prisma

    const result = await preCheck(params)

    expect(result.canProceed).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('数据库不可达')])
    )
    expect(result.checks.databaseConnection.passed).toBe(false)
  })

  it('ZIP 解析失败时 errors 包含错误信息且后续依赖 manifest 的检查跳过', async () => {
    vi.spyOn(integrityCheck, 'parseManifestFromZip').mockRejectedValue(
      new Error('Invalid ZIP')
    )

    const result = await preCheck(defaultParams())

    expect(result.canProceed).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('ZIP 解析失败')])
    )
    expect(result.checks.zipIntegrity.passed).toBe(false)

    // manifest 为 null 时 schema 和 plugin 检查保持默认（未通过但不报错）
    expect(result.checks.schemaCompatibility.passed).toBe(false)
    expect(result.checks.pluginState.passed).toBe(false)
  })

  it('ZIP 文件哈希不匹配时 errors 包含详情', async () => {
    vi.spyOn(integrityCheck, 'verifyZipIntegrity').mockResolvedValue({
      valid: false,
      checkedFiles: 2,
      mismatchedFiles: ['users.json'],
      missingFiles: ['posts.json'],
    })

    const result = await preCheck(defaultParams())

    expect(result.canProceed).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('哈希不匹配')])
    )
    expect(result.checks.zipIntegrity.passed).toBe(false)
  })

  it('插件不匹配时 warnings 包含缺失和多余插件', async () => {
    vi.spyOn(integrityCheck, 'checkPluginState').mockReturnValue({
      compatible: false,
      missingPlugins: ['ecommerce'],
      extraPlugins: ['promotion'],
    })

    const result = await preCheck(defaultParams())

    expect(result.canProceed).toBe(true)
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('ecommerce'),
        expect.stringContaining('promotion'),
      ])
    )
    expect(result.checks.pluginState.passed).toBe(false)
    expect(result.checks.pluginState.missingPlugins).toEqual(['ecommerce'])
    expect(result.checks.pluginState.extraPlugins).toEqual(['promotion'])
  })

  it('多项检查同时失败时汇总所有 errors 和 warnings', async () => {
    // Schema 不兼容
    vi.spyOn(integrityCheck, 'checkSchemaCompatibility').mockReturnValue({
      compatible: false,
      missingModels: ['Order'],
      extraModels: [],
    })

    // 数据库不可达
    const prisma = createMockPrisma()
    ;(prisma.$queryRawUnsafe as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('ECONNREFUSED')
    )

    const params = defaultParams()
    params.prisma = prisma
    params.activeJobCount = 2

    const result = await preCheck(params)

    // errors 包含数据库和并发
    expect(result.canProceed).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(2)
    expect(result.warnings.length).toBeGreaterThanOrEqual(1)
  })
})
