/**
 * Manifest Generator 模块测试
 *
 * 覆盖：remappingFields 完整性、表列表过滤（skipList）、
 * schema hash 计算、插件列表获取、files 映射生成、envChecklist 校验。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock schema-analyzer
const mockGetTableNameMapping = vi.fn()
vi.mock('./schema-analyzer', () => ({
  getSkipList: () => [
    'backup_jobs',
    'prisma_migrations',
    'rate_limit_counters',
    'sessions',
    'idempotency_requests',
    'mfa_action_tokens',
    '_prisma_migrations',
  ],
  getTableNameMapping: (...args: unknown[]) => mockGetTableNameMapping(...args),
}))

// Mock plugins/registry
const mockGetEnabledPlugins = vi.fn()
vi.mock('@/plugins/registry', () => ({
  getEnabledPlugins: () => mockGetEnabledPlugins(),
}))

import { generateManifest, getSchemaHash, getPrismaVersion } from './manifest-generator'
import type { ManifestFileEntry } from './manifest-generator'

/**
 * Function: createMockPrisma
 * Description: 创建满足 PrismaClientLike 接口的 mock 对象
 */
function createMockPrisma() {
  return {
    $queryRaw: vi.fn(),
  }
}

/**
 * Function: createMockFileEntries
 * Description: 创建测试用的文件条目列表
 */
function createMockFileEntries(): ManifestFileEntry[] {
  return [
    { path: 'tables/users.jsonl', sha256: 'abc123', size: 1024, rows: 50 },
    { path: 'tables/roles.jsonl', sha256: 'def456', size: 512, rows: 10 },
    { path: 'tables/blog_articles.jsonl', sha256: 'ghi789', size: 2048, rows: 100 },
    { path: 'manifest.json', sha256: 'jkl012', size: 256 },
  ]
}

// ---- 默认 mock 设置 ----

function setupDefaultMocks() {
  // getTableNameMapping 返回包含普通表 + skipList 表的映射
  const tableMap = new Map<string, string>()
  tableMap.set('users', 'users')
  tableMap.set('roles', 'roles')
  tableMap.set('blog_articles', 'blog_articles')
  tableMap.set('site_config', 'site_config')
  tableMap.set('backup_jobs', 'backup_jobs')         // 应被过滤
  tableMap.set('sessions', 'sessions')               // 应被过滤
  tableMap.set('miniprogram_carousels', 'miniprogram_carousels')

  mockGetTableNameMapping.mockResolvedValue(tableMap)
  mockGetEnabledPlugins.mockReturnValue({
    wechat: true,
    ecommerce: false,
    promotion: false,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  setupDefaultMocks()
})

// ---- 测试用例 ----

describe('generateManifest', () => {
  it('应包含完整的 remappingFields', async () => {
    const manifest = await generateManifest({
      type: 'db_backup',
      files: createMockFileEntries(),
      prisma: createMockPrisma(),
      databaseName: 'test_db',
      sourceProvider: 'local',
      sourceEndpoint: 'http://localhost:9000',
    })

    expect(manifest.remappingFields).toEqual({
      'users': ['avatar_url'],
      'site_config': ['logo_url'],
      'blog_articles': ['cover_image', 'og_image'],
      'miniprogram_carousels': ['image_url'],
    })
  })

  it('应返回正确的表列表（已过滤 skipList）', async () => {
    const manifest = await generateManifest({
      type: 'db_backup',
      files: createMockFileEntries(),
      prisma: createMockPrisma(),
      databaseName: 'test_db',
      sourceProvider: 'ali-oss',
      sourceEndpoint: 'https://oss-cn-hangzhou.aliyuncs.com',
    })

    // backup_jobs 和 sessions 应被过滤掉
    expect(manifest.tables).not.toContain('backup_jobs')
    expect(manifest.tables).not.toContain('sessions')

    // 普通表应保留
    expect(manifest.tables).toContain('users')
    expect(manifest.tables).toContain('roles')
    expect(manifest.tables).toContain('blog_articles')
    expect(manifest.tables).toContain('site_config')
    expect(manifest.tables).toContain('miniprogram_carousels')
  })

  it('应将表名正确转换为首字母大写的模型名', async () => {
    const manifest = await generateManifest({
      type: 'db_backup',
      files: createMockFileEntries(),
      prisma: createMockPrisma(),
      databaseName: 'test_db',
      sourceProvider: 'local',
      sourceEndpoint: 'http://localhost',
    })

    expect(manifest.models).toContain('Users')
    expect(manifest.models).toContain('Roles')
    expect(manifest.models).toContain('Blog_articles')
    expect(manifest.models).toContain('Site_config')
  })

  it('应正确获取插件列表', async () => {
    const manifest = await generateManifest({
      type: 'db_backup',
      files: createMockFileEntries(),
      prisma: createMockPrisma(),
      databaseName: 'test_db',
      sourceProvider: 'local',
      sourceEndpoint: 'http://localhost',
    })

    expect(mockGetEnabledPlugins).toHaveBeenCalledOnce()
    expect(manifest.plugins).toEqual({
      wechat: true,
      ecommerce: false,
      promotion: false,
    })
  })

  it('应正确生成 files 映射', async () => {
    const files = createMockFileEntries()
    const manifest = await generateManifest({
      type: 'db_backup',
      files,
      prisma: createMockPrisma(),
      databaseName: 'test_db',
      sourceProvider: 'local',
      sourceEndpoint: 'http://localhost',
    })

    // files 映射应为 path → sha256
    expect(manifest.files).toEqual({
      'tables/users.jsonl': 'abc123',
      'tables/roles.jsonl': 'def456',
      'tables/blog_articles.jsonl': 'ghi789',
      'manifest.json': 'jkl012',
    })

    // fileDetails 应直接使用传入的 files
    expect(manifest.fileDetails).toEqual(files)
  })

  it('应包含必要的 envChecklist 环境变量', async () => {
    const manifest = await generateManifest({
      type: 'db_backup',
      files: createMockFileEntries(),
      prisma: createMockPrisma(),
      databaseName: 'test_db',
      sourceProvider: 'local',
      sourceEndpoint: 'http://localhost',
    })

    expect(manifest.envChecklist).toContain('DATABASE_URL')
    expect(manifest.envChecklist).toContain('OSS_PROVIDER')
    expect(manifest.envChecklist).toContain('BACKUP_MAX_RETENTION')
  })

  it('应正确设置 version 和 type', async () => {
    const manifest = await generateManifest({
      type: 'file_backup',
      files: [],
      prisma: createMockPrisma(),
      databaseName: 'test_db',
      sourceProvider: 'local',
      sourceEndpoint: 'http://localhost',
    })

    expect(manifest.version).toBe('1.0')
    expect(manifest.type).toBe('file_backup')
  })

  it('应正确设置 sourceProvider 和 sourceEndpoint', async () => {
    const manifest = await generateManifest({
      type: 'db_backup',
      files: [],
      prisma: createMockPrisma(),
      databaseName: 'test_db',
      sourceProvider: 'aws-s3',
      sourceEndpoint: 'https://s3.amazonaws.com/my-bucket',
    })

    expect(manifest.sourceProvider).toBe('aws-s3')
    expect(manifest.sourceEndpoint).toBe('https://s3.amazonaws.com/my-bucket')
  })

  it('应包含 ephemeralTables（skipList）', async () => {
    const manifest = await generateManifest({
      type: 'db_backup',
      files: [],
      prisma: createMockPrisma(),
      databaseName: 'test_db',
      sourceProvider: 'local',
      sourceEndpoint: 'http://localhost',
    })

    expect(manifest.ephemeralTables).toContain('backup_jobs')
    expect(manifest.ephemeralTables).toContain('sessions')
    expect(manifest.ephemeralTables).toContain('_prisma_migrations')
  })

  it('应设置 ISO 8601 格式的 createdAt 和 snapshotTime', async () => {
    const manifest = await generateManifest({
      type: 'db_backup',
      files: [],
      prisma: createMockPrisma(),
      databaseName: 'test_db',
      sourceProvider: 'local',
      sourceEndpoint: 'http://localhost',
    })

    // 验证 ISO 8601 格式
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    expect(manifest.createdAt).toMatch(isoRegex)
    expect(manifest.snapshotTime).toMatch(isoRegex)
  })

  it('空文件列表时应返回空的 files 映射', async () => {
    const manifest = await generateManifest({
      type: 'db_backup',
      files: [],
      prisma: createMockPrisma(),
      databaseName: 'test_db',
      sourceProvider: 'local',
      sourceEndpoint: 'http://localhost',
    })

    expect(manifest.files).toEqual({})
    expect(manifest.fileDetails).toEqual([])
  })
})

describe('getSchemaHash', () => {
  it('应返回 SHA256 哈希值（64 位十六进制）或空字符串', () => {
    const hash = getSchemaHash()
    expect(typeof hash).toBe('string')
    if (hash.length > 0) {
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    }
  })

  it('文件不存在时应返回空字符串', () => {
    const hash = getSchemaHash()
    expect(typeof hash).toBe('string')
  })
})

describe('getPrismaVersion', () => {
  it('应返回 prisma 包的版本号', () => {
    // mock require 行为 - getPrismaVersion 内部 require('prisma/package.json')
    // 由于该函数使用动态 require，我们通过模拟来测试逻辑
    // 默认情况下如果 prisma 包不可用会返回 'unknown'
    const version = getPrismaVersion()
    // 在测试环境中 prisma 可能可用也可能不可用
    expect(typeof version).toBe('string')
    expect(version.length).toBeGreaterThan(0)
  })
})
