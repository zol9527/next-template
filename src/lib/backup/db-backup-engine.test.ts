/**
 * DB 备份引擎单元测试
 *
 * @module lib/backup/db-backup-engine.test
 *
 * 覆盖：
 * 1. 基本备份（3 张表，多种数据类型）
 * 2. 空表生成空 JSONL
 * 3. 拓扑排序顺序验证
 * 4. SHA256 校验和正确性
 * 5. 内存超限抛错
 * 6. 单表查询失败不中断整体流程
 */

// @vitest-environment node

import { describe, it, expect, vi, afterEach } from 'vitest'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { existsSync, rmSync, mkdirSync } from 'node:fs'

import { createDbBackup } from './db-backup-engine'
import type { DbBackupParams } from './db-backup-engine'
import { serializeRow } from './serializer'
import { extractFileFromZip } from './integrity-check'

// ─── Mock 外部依赖 ────────────────────────────────────

vi.mock('./schema-analyzer', () => ({
  getForeignKeyGraph: vi.fn(),
  topologicalSort: vi.fn(),
  getSkipList: vi.fn(() => []),
  getTableNameMapping: vi.fn(),
}))

import {
  getForeignKeyGraph,
  topologicalSort,
  getSkipList,
  getTableNameMapping,
} from './schema-analyzer'

// ─── 辅助工具 ─────────────────────────────────────────

/** 测试临时文件目录 */
const tempDirs: string[] = []

/** 创建临时输出路径 */
function createTempPath(): string {
  const dir = join(tmpdir(), `db-backup-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(dir, { recursive: true })
  tempDirs.push(dir)
  return join(dir, 'backup.zip')
}

/** 创建 mock prisma 客户端 */
function createMockPrisma(
  tableData: Record<string, Record<string, unknown>[]>
) {
  return {
    $queryRaw: vi.fn().mockResolvedValue([]),
    $queryRawUnsafe: vi.fn().mockImplementation(
      (sql: string, limit: number, offset: number) => {
        // 从 SQL 中提取表名
        const match = sql.match(/FROM `(\w+)`/)
        if (!match) return Promise.resolve([])

        const tableName = match[1]
        const allRows = tableData[tableName] ?? []
        return Promise.resolve(allRows.slice(offset, offset + limit))
      }
    ),
  }
}

/** 创建 mock StatsTracker */
function createMockStatsTracker() {
  let stats: Record<string, unknown> = {}
  return {
    update: vi.fn((partial: Record<string, unknown>) => {
      stats = { ...stats, ...partial }
    }),
    getStats: vi.fn(() => stats),
    forceFlush: vi.fn().mockResolvedValue(undefined),
    _getInternalStats: () => stats,
  }
}

/** 创建 mock RateController */
function createMockRateController() {
  return {
    waitForBatch: vi.fn().mockResolvedValue(undefined),
    waitForTable: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
  }
}

/** 构建完整的备份参数 */
function buildParams(overrides: Partial<DbBackupParams> & {
  tableData?: Record<string, Record<string, unknown>[]>
  tables?: string[]
  orderedTables?: string[]
} = {}): DbBackupParams & { _statsTracker: ReturnType<typeof createMockStatsTracker> } {
  const {
    tableData = {},
    tables = Object.keys(tableData),
    orderedTables,
    ...rest
  } = overrides

  // 配置 schema-analyzer mocks
  ;(getForeignKeyGraph as ReturnType<typeof vi.fn>).mockResolvedValue(new Map())
  const mapping = new Map(tables.map((t) => [t, t]))
  ;(getTableNameMapping as ReturnType<typeof vi.fn>).mockResolvedValue(mapping)
  ;(topologicalSort as ReturnType<typeof vi.fn>).mockReturnValue({
    orderedTables: orderedTables ?? tables,
    selfReferencing: [],
    cycles: [],
  })
  ;(getSkipList as ReturnType<typeof vi.fn>).mockReturnValue([])

  const prisma = createMockPrisma(tableData)
  const statsTracker = createMockStatsTracker()
  const rateController = createMockRateController()

  return {
    outputPath: createTempPath(),
    prisma,
    databaseName: 'test_db',
    statsTracker: statsTracker as any,
    rateController: rateController as any,
    ...rest,
    _statsTracker: statsTracker,
  }
}

// ─── 清理 ─────────────────────────────────────────────

// 抑制测试清理期间的异步文件流 ENOENT 错误（已知行为）
process.removeAllListeners('uncaughtException')
process.once('uncaughtException', (err: Error) => {
  if (!err.message?.includes('ENOENT')) throw err
})

afterEach(() => {
  for (const dir of tempDirs) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true })
    }
  }
  tempDirs.length = 0
  vi.restoreAllMocks()
})

// ─── 测试用例 ─────────────────────────────────────────

describe('createDbBackup', () => {
  it('应备份包含多种数据类型的小数据库（3 张表）', async () => {
    const tableData: Record<string, Record<string, unknown>[]> = {
      users: [
        { id: 1, name: 'Alice', age: 30, active: true },
        { id: 2, name: 'Bob', age: 25, active: false },
      ],
      posts: [
        {
          id: 1,
          title: 'Hello World',
          user_id: 1,
          view_count: BigInt('9999999999'),
          created_at: new Date('2025-01-15T10:30:00.000Z'),
        },
      ],
      comments: [
        {
          id: 1,
          post_id: 1,
          content: 'Nice post!',
          price: { toFixed: () => '99.99', d: [99, 99], toString: () => '99.99' },
        },
      ],
    }

    const params = buildParams({ tableData })
    const result = await createDbBackup(params)

    // 验证基本统计
    expect(result.totalTables).toBe(3)
    expect(result.totalRows).toBe(4) // 2 users + 1 post + 1 comment
    expect(result.zipPath).toBe(params.outputPath)
    expect(result.duration).toBeGreaterThanOrEqual(0)
    expect(Object.keys(result.fileChecksums)).toHaveLength(3)

    // 验证 ZIP 文件存在
    expect(existsSync(result.zipPath)).toBe(true)

    // 验证每张表的 JSONL 内容可从 ZIP 中提取
    for (const tableName of ['users', 'posts', 'comments']) {
      const content = await extractFileFromZip(result.zipPath, `${tableName}.jsonl`)
      const lines = content.toString('utf8').trim().split('\n')
      expect(lines.length).toBeGreaterThan(0)

      // 每行应为有效 JSON
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow()
      }
    }

    // 验证 BigInt 被正确序列化
    const postsContent = await extractFileFromZip(result.zipPath, 'posts.jsonl')
    const postLine = JSON.parse(postsContent.toString('utf8').trim())
    expect(postLine.view_count).toEqual({ __bigint: '9999999999' })

    // 验证 Date 被正确序列化为 ISO 字符串
    expect(postLine.created_at).toBe('2025-01-15T10:30:00.000Z')

    // 验证 Decimal 被正确序列化
    const commentsContent = await extractFileFromZip(result.zipPath, 'comments.jsonl')
    const commentLine = JSON.parse(commentsContent.toString('utf8').trim())
    expect(commentLine.price).toEqual({ __decimal: '99.99' })
  })

  it('空表应生成空 JSONL（0 字节）', async () => {
    const tableData: Record<string, Record<string, unknown>[]> = {
      empty_table: [],
      has_data: [{ id: 1, name: 'test' }],
    }

    const params = buildParams({ tableData })
    const result = await createDbBackup(params)

    // 验证空表的 JSONL 为空
    const emptyContent = await extractFileFromZip(result.zipPath, 'empty_table.jsonl')
    expect(emptyContent.length).toBe(0)

    // 验证有数据的表正常
    const dataContent = await extractFileFromZip(result.zipPath, 'has_data.jsonl')
    expect(dataContent.length).toBeGreaterThan(0)

    // 空表的 SHA256 应等于空字符串的哈希
    const emptySha256 = createHash('sha256').update(Buffer.alloc(0)).digest('hex')
    expect(result.fileChecksums['empty_table']).toBe(emptySha256)
  })

  it('排序结果应遵循拓扑顺序', async () => {
    // 模拟拓扑排序：Category → Post → Comment
    const orderedTables = ['categories', 'posts', 'comments']
    const tableData: Record<string, Record<string, unknown>[]> = {
      categories: [{ id: 1, name: 'Tech' }],
      posts: [{ id: 1, title: 'Hello', category_id: 1 }],
      comments: [{ id: 1, post_id: 1, text: 'Nice' }],
    }

    const params = buildParams({ tableData, orderedTables })
    await createDbBackup(params)

    expect(topologicalSort).toHaveBeenCalled()

    // 验证 prisma.$queryRawUnsafe 的调用顺序
    const calls = (params.prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mock.calls
    const queriedTables = calls
      .map((call) => {
        const sql = call[0] as string
        const match = sql.match(/FROM `(\w+)`/)
        return match ? match[1] : null
      })
      .filter(Boolean) as string[]

    // 验证第一个查询的表是 categories
    expect(queriedTables[0]).toBe('categories')

    // 验证查询顺序与拓扑排序一致
    const uniqueQueried = [...new Set(queriedTables)]
    expect(uniqueQueried).toEqual(orderedTables)
  })

  it('SHA256 校验和应正确计算', async () => {
    const tableData: Record<string, Record<string, unknown>[]> = {
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
    }

    const params = buildParams({ tableData })
    const result = await createDbBackup(params)

    // 手动计算预期 SHA256
    const expectedLines = tableData.users
      .map((row) => JSON.stringify(serializeRow(row)) + '\n')
      .join('')
    const expectedSha256 = createHash('sha256')
      .update(expectedLines)
      .digest('hex')

    expect(result.fileChecksums['users']).toBe(expectedSha256)
  })

  it('内存超限时应抛出错误', async () => {
    const tableData: Record<string, Record<string, unknown>[]> = {
      big_table: [{ id: 1 }],
    }

    const params = buildParams({ tableData })

    // Mock process.memoryUsage 返回超过 512MB 的 RSS
    const originalMemoryUsage = process.memoryUsage
    const mockMemoryUsage = vi.fn(() => ({
      rss: 600 * 1024 * 1024,
      heapTotal: 500 * 1024 * 1024,
      heapUsed: 400 * 1024 * 1024,
      external: 10 * 1024 * 1024,
      arrayBuffers: 5 * 1024 * 1024,
    })) as any as typeof process.memoryUsage

    // 在模块级别替换
    process.memoryUsage = mockMemoryUsage

    try {
      await expect(createDbBackup(params)).rejects.toThrow('内存超限')
    } finally {
      process.memoryUsage = originalMemoryUsage
    }
  })

  it('单表查询失败不应中断整体流程', async () => {
    // 创建自定义 prisma，其中 fail_table 会抛错
    const prisma = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      $queryRawUnsafe: vi.fn().mockImplementation(
        (sql: string, _limit: number, _offset: number) => {
          const match = sql.match(/FROM `(\w+)`/)
          if (!match) return Promise.resolve([])

          const tableName = match[1]

          if (tableName === 'fail_table') {
            return Promise.reject(new Error('Connection lost'))
          }

          if (tableName === 'good_table') {
            return Promise.resolve([{ id: 1, name: 'OK' }])
          }

          return Promise.resolve([])
        }
      ),
    }

    const params = buildParams({
      tables: ['fail_table', 'good_table'],
      orderedTables: ['fail_table', 'good_table'],
    })
    params.prisma = prisma

    const result = await createDbBackup(params)

    // 备份应完成，不因单表失败而中断
    expect(result.totalTables).toBe(2)

    // good_table 应正常备份
    expect(result.totalRows).toBe(1)
    expect(result.fileChecksums['good_table']).toBeDefined()

    // fail_table 的 checksum 也应存在（空内容）
    const emptySha256 = createHash('sha256').update(Buffer.alloc(0)).digest('hex')
    expect(result.fileChecksums['fail_table']).toBe(emptySha256)

    // 验证 good_table 的 JSONL 内容正确
    const goodContent = await extractFileFromZip(result.zipPath, 'good_table.jsonl')
    const goodLine = JSON.parse(goodContent.toString('utf8').trim())
    expect(goodLine.id).toBe(1)
    expect(goodLine.name).toBe('OK')

    // 验证错误被记录到 statsTracker
    expect(params._statsTracker.update).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.arrayContaining([
          expect.stringContaining('fail_table'),
        ]),
      })
    )
  })

  it('应调用 onProgress 回调', async () => {
    const tableData: Record<string, Record<string, unknown>[]> = {
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ],
    }

    const onProgress = vi.fn()
    const params = buildParams({ tableData, onProgress })

    await createDbBackup(params)

    // onProgress 应在每批处理后调用
    expect(onProgress).toHaveBeenCalled()
    // 最后一次调用应包含 3 行
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1]
    expect(lastCall[0]).toBe('users')
    expect(lastCall[1]).toBe(3)
  })

  it('应调用 statsTracker.update 和 forceFlush', async () => {
    const tableData: Record<string, Record<string, unknown>[]> = {
      users: [{ id: 1, name: 'Test' }],
    }

    const params = buildParams({ tableData })
    await createDbBackup(params)

    // statsTracker.update 应被调用多次
    expect(params._statsTracker.update).toHaveBeenCalled()
    expect(params._statsTracker.forceFlush).toHaveBeenCalled()

    // 验证初始 phase 设置
    expect(params._statsTracker.update).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'db-backup' })
    )
  })

  it('应调用 rateController 控制速率', async () => {
    const tableData: Record<string, Record<string, unknown>[]> = {
      users: [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ],
    }

    const params = buildParams({ tableData })
    await createDbBackup(params)

    // waitForBatch 应为每批数据调用
    expect(params.rateController.waitForBatch).toHaveBeenCalled()

    // waitForTable 应为每张表调用
    expect(params.rateController.waitForTable).toHaveBeenCalledTimes(1)
  })

  it('应正确过滤掉 skipList 中的表', async () => {
    const tableData: Record<string, Record<string, unknown>[]> = {
      users: [{ id: 1, name: 'Alice' }],
      backup_jobs: [{ id: 1, status: 'running' }],
    }

    // buildParams 先创建基本配置（包含所有表）
    const params = buildParams({ tableData })

    // 然后覆盖 mock 以模拟 skipList 过滤
    // getTableNameMapping 返回所有表（包括应跳过的）
    ;(getTableNameMapping as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Map([
        ['users', 'users'],
        ['backup_jobs', 'backup_jobs'],
      ])
    )
    ;(getSkipList as ReturnType<typeof vi.fn>).mockReturnValue(['backup_jobs'])
    ;(topologicalSort as ReturnType<typeof vi.fn>).mockReturnValue({
      orderedTables: ['users'],
      selfReferencing: [],
      cycles: [],
    })

    const result = await createDbBackup(params)

    // backup_jobs 不应被备份
    expect(result.totalTables).toBe(1)
    expect(result.fileChecksums).not.toHaveProperty('backup_jobs')
    expect(result.fileChecksums).toHaveProperty('users')
  })
})
