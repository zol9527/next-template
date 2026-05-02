import { describe, it, expect, vi, beforeEach } from 'vitest'
import { estimateBackup, type PrismaClientLike } from './estimator'

// vi.hoisted 确保在 vi.mock 工厂函数执行时变量已初始化
const { mockGetSkipList, mockGetTableNameMapping } = vi.hoisted(() => ({
  mockGetSkipList: vi.fn(() => ['backup_jobs', 'prisma_migrations']),
  mockGetTableNameMapping: vi.fn(),
}))

vi.mock('./schema-analyzer', () => ({
  getSkipList: mockGetSkipList,
  getTableNameMapping: mockGetTableNameMapping,
}))

describe('estimateBackup', () => {
  let mockPrisma: PrismaClientLike
  let mockQueryRawUnsafe: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock prisma.$queryRawUnsafe
    mockQueryRawUnsafe = vi.fn().mockImplementation((query: string) => {
      // 根据查询内容返回不同的结果
      if (query.includes('FROM `users`')) {
        return Promise.resolve([{ cnt: 100n }])
      }
      if (query.includes('FROM `posts`')) {
        return Promise.resolve([{ cnt: 200n }])
      }
      if (query.includes('FROM `comments`')) {
        return Promise.resolve([{ cnt: 300n }])
      }
      if (query.includes('FROM `media_assets`') && query.includes('COUNT')) {
        return Promise.resolve([{ cnt: 10n }])
      }
      if (query.includes('FROM `invalid_table`')) {
        return Promise.resolve([{ cnt: 300n }])
      }
      if (query.includes('media_assets') && query.includes('SUM')) {
        // 文件查询
        return Promise.resolve([{ cnt: 50n, totalSize: 1024000n }])
      }
      // 默认返回空数组
      return Promise.resolve([])
    })
    mockPrisma = {
      $queryRaw: vi.fn(),
      $queryRawUnsafe: mockQueryRawUnsafe,
    }
  })

  describe('数据库预估', () => {
    it('应正确预估包含多个表的数据库', async () => {
      // Mock getTableNameMapping 返回 5 个表
      mockGetTableNameMapping.mockResolvedValue(
        new Map([
          ['users', 'users'],
          ['posts', 'posts'],
          ['comments', 'comments'],
          ['media_assets', 'media_assets'],
          ['backup_jobs', 'backup_jobs'], // 在 skipList 中
        ])
      )

      const result = await estimateBackup({
        prisma: mockPrisma,
        databaseName: 'test_db',
      })

      // 验证结果
      expect(result.db.tablesTotal).toBe(4) // users, posts, comments, media_assets（backup_jobs 被过滤）
      expect(result.db.totalRows).toBe(610) // 100 + 200 + 300 + 10
      expect(result.db.estimatedSizeBytes).toBe(610 * 500) // 500 bytes/row
      expect(result.db.estimatedDurationMs).toBe(Math.ceil((610 / 5000) * 1000))
    })

    it('空数据库应返回合理默认值', async () => {
      // Mock getTableNameMapping 返回只有 skipList 表的数据库
      mockGetTableNameMapping.mockResolvedValue(
        new Map([['backup_jobs', 'backup_jobs'], ['prisma_migrations', 'prisma_migrations']])
      )

      const result = await estimateBackup({
        prisma: mockPrisma,
        databaseName: 'test_db',
      })

      // 验证结果
      expect(result.db.tablesTotal).toBe(0)
      expect(result.db.totalRows).toBe(0)
      expect(result.db.estimatedSizeBytes).toBe(0)
      expect(result.db.estimatedDurationMs).toBe(0)

      // 应该只执行文件查询，不执行数据库表的 COUNT(*) 查询
      expect(mockQueryRawUnsafe).toHaveBeenCalledTimes(1)
    })

    it('应正确处理表查询失败的情况', async () => {
      // Mock getTableNameMapping 返回 3 个表
      mockGetTableNameMapping.mockResolvedValue(
        new Map([
          ['users', 'users'],
          ['posts', 'posts'],
          ['invalid_table', 'invalid_table'],
        ])
      )

      // Override mock to make posts query fail
      mockQueryRawUnsafe.mockImplementation((query: string) => {
        if (query.includes('FROM `users`')) {
          return Promise.resolve([{ cnt: 100n }])
        }
        if (query.includes('FROM `posts`')) {
          return Promise.reject(new Error('Table does not exist'))
        }
        if (query.includes('FROM `invalid_table`')) {
          return Promise.resolve([{ cnt: 300n }])
        }
        if (query.includes('media_assets') && query.includes('SUM')) {
          return Promise.resolve([{ cnt: 50n, totalSize: 1024000n }])
        }
        return Promise.resolve([])
      })

      const result = await estimateBackup({
        prisma: mockPrisma,
        databaseName: 'test_db',
      })

      // 应该跳过失败的表，继续统计其他表
      expect(result.db.tablesTotal).toBe(3)
      expect(result.db.totalRows).toBe(400) // 100 + 300 (跳过失败的 posts)
      expect(result.db.estimatedSizeBytes).toBe(400 * 500)
    })
  })

  describe('文件预估', () => {
    it('应正确统计 active 状态的文件', async () => {
      // Mock getTableNameMapping 返回空映射（文件预估不依赖）
      mockGetTableNameMapping.mockResolvedValue(new Map())

      const result = await estimateBackup({
        prisma: mockPrisma,
        databaseName: 'test_db',
      })

      // 验证结果
      expect(result.files.totalFiles).toBe(50)
      expect(result.files.totalBytes).toBe(1024000)
      expect(result.files.estimatedDurationMs).toBe(Math.ceil((50 / 5) * 1000)) // 10000ms
    })

    it('没有文件时应返回零值', async () => {
      // Mock getTableNameMapping 返回空映射
      mockGetTableNameMapping.mockResolvedValue(new Map())

      // Override mock to return 0 files
      mockQueryRawUnsafe.mockImplementation((query: string) => {
        if (query.includes('media_assets') && query.includes('SUM')) {
          return Promise.resolve([{ cnt: 0n, totalSize: 0n }])
        }
        return Promise.resolve([])
      })

      const result = await estimateBackup({
        prisma: mockPrisma,
        databaseName: 'test_db',
      })

      // 验证结果
      expect(result.files.totalFiles).toBe(0)
      expect(result.files.totalBytes).toBe(0)
      expect(result.files.estimatedDurationMs).toBe(0)
    })

    it('文件查询失败时应返回零值', async () => {
      // Mock getTableNameMapping 返回空映射
      mockGetTableNameMapping.mockResolvedValue(new Map())

      // Override mock to make file query fail
      mockQueryRawUnsafe.mockImplementation((query: string) => {
        if (query.includes('media_assets') && query.includes('SUM')) {
          return Promise.reject(new Error('Table does not exist'))
        }
        return Promise.resolve([])
      })

      const result = await estimateBackup({
        prisma: mockPrisma,
        databaseName: 'test_db',
      })

      // 验证结果
      expect(result.files.totalFiles).toBe(0)
      expect(result.files.totalBytes).toBe(0)
      expect(result.files.estimatedDurationMs).toBe(0)
    })

    it('应正确处理文件大小总和为 NULL 的情况', async () => {
      // Mock getTableNameMapping 返回空映射
      mockGetTableNameMapping.mockResolvedValue(new Map())

      // Override mock to return NULL for totalSize
      mockQueryRawUnsafe.mockImplementation((query: string) => {
        if (query.includes('media_assets') && query.includes('SUM')) {
          return Promise.resolve([{ cnt: 10n, totalSize: null }])
        }
        return Promise.resolve([])
      })

      const result = await estimateBackup({
        prisma: mockPrisma,
        databaseName: 'test_db',
      })

      // 验证结果（COALESCE 应该将 NULL 转换为 0）
      expect(result.files.totalFiles).toBe(10)
      expect(result.files.totalBytes).toBe(0)
      expect(result.files.estimatedDurationMs).toBe(Math.ceil((10 / 5) * 1000)) // 2000ms
    })
  })

  describe('整体预估', () => {
    it('应并行执行数据库和文件预估', async () => {
      // Mock getTableNameMapping
      mockGetTableNameMapping.mockResolvedValue(
        new Map([
          ['users', 'users'],
          ['media_assets', 'media_assets'],
        ])
      )

      let dbQueryStarted = false
      let filesQueryStarted = false

      // Override mock to track query execution
      mockQueryRawUnsafe.mockImplementation((query: string) => {
        if (query.includes('users')) {
          dbQueryStarted = true
          return Promise.resolve([{ cnt: 100n }])
        }
        if (query.includes('media_assets') && query.includes('COUNT')) {
          filesQueryStarted = true
          return Promise.resolve([{ cnt: 50n, totalSize: 1024000n }])
        }
        return Promise.resolve([])
      })

      await estimateBackup({
        prisma: mockPrisma,
        databaseName: 'test_db',
      })

      // 验证两个查询都被执行了
      expect(dbQueryStarted).toBe(true)
      expect(filesQueryStarted).toBe(true)
    })

    it('应返回完整的预估结果', async () => {
      // Mock getTableNameMapping
      mockGetTableNameMapping.mockResolvedValue(
        new Map([
          ['users', 'users'],
          ['posts', 'posts'],
        ])
      )

      const result = await estimateBackup({
        prisma: mockPrisma,
        databaseName: 'test_db',
      })

      // 验证结果结构
      expect(result).toHaveProperty('db')
      expect(result).toHaveProperty('files')
      expect(result.db).toHaveProperty('tablesTotal')
      expect(result.db).toHaveProperty('totalRows')
      expect(result.db).toHaveProperty('estimatedSizeBytes')
      expect(result.db).toHaveProperty('estimatedDurationMs')
      expect(result.files).toHaveProperty('totalFiles')
      expect(result.files).toHaveProperty('totalBytes')
      expect(result.files).toHaveProperty('estimatedDurationMs')
    })
  })
})
