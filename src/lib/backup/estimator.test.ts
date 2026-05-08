import { describe, it, expect, vi, beforeEach } from 'vitest'
import { estimateBackup, type PrismaClientLike } from './estimator'
import type { TableStats } from './schema-analyzer'

// vi.hoisted 确保在 vi.mock 工厂函数执行时变量已初始化
const { mockGetSkipList, mockGetTableNameMapping } = vi.hoisted(() => ({
  mockGetSkipList: vi.fn(() => ['backup_jobs', 'prisma_migrations']),
  mockGetTableNameMapping: vi.fn(),
}))

vi.mock('./schema-analyzer', () => ({
  getSkipList: mockGetSkipList,
  getTableNameMapping: mockGetTableNameMapping,
}))

/**
 * 辅助函数：快速构建 Map<string, TableStats>
 */
function buildTableStatsMap(
  entries: Array<[string, { rows?: number; size?: number }]>
): Map<string, TableStats> {
  return new Map(
    entries.map(([name, { rows = 0, size = 0 }]) => [
      name,
      { displayName: name, approxRows: rows, dataLength: size },
    ])
  )
}

describe('estimateBackup', () => {
  let mockPrisma: PrismaClientLike
  let mockQueryRawUnsafe: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    mockQueryRawUnsafe = vi.fn().mockImplementation((query: string) => {
      if (query.includes('media_assets') && query.includes('SUM')) {
        return Promise.resolve([{ cnt: 50n, totalSize: 1024000n }])
      }
      return Promise.resolve([])
    })
    mockPrisma = {
      $queryRawUnsafe: mockQueryRawUnsafe,
    }
  })

  describe('数据库预估', () => {
    it('应正确预估包含多个表的数据库', async () => {
      mockGetTableNameMapping.mockResolvedValue(
        buildTableStatsMap([
          ['users', { rows: 100, size: 50000 }],
          ['posts', { rows: 200, size: 100000 }],
          ['comments', { rows: 300, size: 150000 }],
          ['media_assets', { rows: 10, size: 5000 }],
          ['backup_jobs', { rows: 5, size: 1000 }], // 在 skipList 中
        ])
      )

      const result = await estimateBackup({
        prisma: mockPrisma,
        databaseName: 'test_db',
      })

      // backup_jobs 被过滤，剩下 4 个表
      expect(result.db.tablesTotal).toBe(4)
      // 近似行数总和：100 + 200 + 300 + 10 = 610
      expect(result.db.totalRows).toBe(610)
      // 优先使用 information_schema 的 DATA_LENGTH
      expect(result.db.estimatedSizeBytes).toBe(50000 + 100000 + 150000 + 5000)
      expect(result.db.estimatedDurationMs).toBe(Math.ceil((610 / 5000) * 1000))
    })

    it('空数据库应返回合理默认值', async () => {
      mockGetTableNameMapping.mockResolvedValue(
        buildTableStatsMap([
          ['backup_jobs', { rows: 5, size: 1000 }],
          ['prisma_migrations', { rows: 10, size: 2000 }],
        ])
      )

      const result = await estimateBackup({
        prisma: mockPrisma,
        databaseName: 'test_db',
      })

      expect(result.db.tablesTotal).toBe(0)
      expect(result.db.totalRows).toBe(0)
      expect(result.db.estimatedSizeBytes).toBe(0)
      expect(result.db.estimatedDurationMs).toBe(0)

      // DB 预估不再需要 $queryRawUnsafe（information_schema 一次查询搞定）
      expect(mockQueryRawUnsafe).toHaveBeenCalledTimes(1) // 仅文件查询
    })

    it('当 DATA_LENGTH 为 0 时应使用固定系数估算大小', async () => {
      mockGetTableNameMapping.mockResolvedValue(
        buildTableStatsMap([
          ['users', { rows: 100, size: 0 }],
          ['posts', { rows: 200, size: 0 }],
        ])
      )

      const result = await estimateBackup({
        prisma: mockPrisma,
        databaseName: 'test_db',
      })

      // DATA_LENGTH 为 0，fallback 到 totalRows * AVG_ROW_SIZE_BYTES
      expect(result.db.totalRows).toBe(300)
      expect(result.db.estimatedSizeBytes).toBe(300 * 500)
    })
  })

  describe('文件预估', () => {
    it('应正确统计 active 状态的文件', async () => {
      mockGetTableNameMapping.mockResolvedValue(new Map())

      const result = await estimateBackup({
        prisma: mockPrisma,
        databaseName: 'test_db',
      })

      expect(result.files.totalFiles).toBe(50)
      expect(result.files.totalBytes).toBe(1024000)
      expect(result.files.estimatedDurationMs).toBe(Math.ceil((50 / 5) * 1000))
    })

    it('没有文件时应返回零值', async () => {
      mockGetTableNameMapping.mockResolvedValue(new Map())

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

      expect(result.files.totalFiles).toBe(0)
      expect(result.files.totalBytes).toBe(0)
      expect(result.files.estimatedDurationMs).toBe(0)
    })

    it('文件查询失败时应返回零值', async () => {
      mockGetTableNameMapping.mockResolvedValue(new Map())

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

      expect(result.files.totalFiles).toBe(0)
      expect(result.files.totalBytes).toBe(0)
      expect(result.files.estimatedDurationMs).toBe(0)
    })

    it('应正确处理文件大小总和为 NULL 的情况', async () => {
      mockGetTableNameMapping.mockResolvedValue(new Map())

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

      expect(result.files.totalFiles).toBe(10)
      expect(result.files.totalBytes).toBe(0)
      expect(result.files.estimatedDurationMs).toBe(Math.ceil((10 / 5) * 1000))
    })
  })

  describe('整体预估', () => {
    it('应并行执行数据库和文件预估', async () => {
      mockGetTableNameMapping.mockResolvedValue(
        buildTableStatsMap([
          ['users', { rows: 100, size: 50000 }],
        ])
      )

      let filesQueryCalled = false
      mockQueryRawUnsafe.mockImplementation((query: string) => {
        if (query.includes('media_assets') && query.includes('SUM')) {
          filesQueryCalled = true
          return Promise.resolve([{ cnt: 50n, totalSize: 1024000n }])
        }
        return Promise.resolve([])
      })

      await estimateBackup({
        prisma: mockPrisma,
        databaseName: 'test_db',
      })

      // 数据库预估通过 getTableNameMapping（已 mock），文件预估通过 $queryRawUnsafe
      expect(filesQueryCalled).toBe(true)
      expect(mockGetTableNameMapping).toHaveBeenCalledOnce()
    })

    it('应返回完整的预估结果', async () => {
      mockGetTableNameMapping.mockResolvedValue(
        buildTableStatsMap([
          ['users', { rows: 100, size: 50000 }],
          ['posts', { rows: 200, size: 100000 }],
        ])
      )

      const result = await estimateBackup({
        prisma: mockPrisma,
        databaseName: 'test_db',
      })

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
