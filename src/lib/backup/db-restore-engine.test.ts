/**
 * DB 恢复引擎单元测试
 *
 * @module lib/backup/db-restore-engine.test
 *
 * 覆盖：
 * 1. 完整恢复 3 张表（含分批插入）
 * 2. 单表失败不中断整体流程
 * 3. 断点续传（跳过已完成的表）
 * 4. FK 检查正确禁用和恢复
 * 5. AUTO_INCREMENT 正确重置
 * 6. 空表正常处理
 *
 * 使用 vi.spyOn 而非 vi.mock，避免 Bun test runner 跨文件 mock 泄漏
 */

// @vitest-environment node

import { describe, it, expect, vi, afterEach } from 'vitest'
import { existsSync, rmSync } from 'node:fs'

import { restoreDbFromZip } from './db-restore-engine'
import { serializeRow } from './serializer'
import * as integrityCheck from './integrity-check'

// ─── 辅助工具 ─────────────────────────────────────────

const tempDirs: string[] = []

function rowsToJsonl(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  return rows.map((row) => JSON.stringify(serializeRow(row))).join('\n')
}

function createMockPrisma() {
  const sqlLog: { sql: string; values: unknown[] }[] = []

  const prisma = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    $queryRawUnsafe: vi.fn().mockImplementation((sql: string, ...values: unknown[]) => {
      sqlLog.push({ sql, values })
      return Promise.resolve([])
    }),
  }

  return { prisma, sqlLog }
}

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

function createMockRateController() {
  return {
    waitForBatch: vi.fn().mockResolvedValue(undefined),
    waitForTable: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
  }
}

/** 配置 extractFileFromZip spy 来返回表的 JSONL 数据 */
function setupExtractMock(
  tableData: Record<string, Record<string, unknown>[]>,
  manifestTables: string[],
) {
  vi.spyOn(integrityCheck, 'parseManifestFromZip').mockResolvedValue({
    version: '1.0',
    createdAt: new Date().toISOString(),
    tables: manifestTables,
    models: [],
    plugins: [],
    files: {},
  })

  vi.spyOn(integrityCheck, 'extractFileFromZip').mockImplementation(
    (_zipPath: string, targetFileName: string) => {
      if (targetFileName === 'manifest.json') {
        return Promise.resolve(Buffer.from('{}'))
      }

      const match = targetFileName.match(/^tables\/(.+)\.jsonl$/)
      if (match) {
        const tableName = match[1]
        const rows = tableData[tableName] ?? []
        const jsonl = rowsToJsonl(rows)
        return Promise.resolve(Buffer.from(jsonl, 'utf8'))
      }

      return Promise.reject(new Error(`未找到文件: ${targetFileName}`))
    },
  )
}

// ─── 清理 ─────────────────────────────────────────────

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

describe('restoreDbFromZip', () => {
  it('应完整恢复 3 张表的数据', async () => {
    const tableData: Record<string, Record<string, unknown>[]> = {
      users: [
        { id: 1, name: 'Alice', age: 30 },
        { id: 2, name: 'Bob', age: 25 },
      ],
      posts: [
        { id: 1, title: 'Hello', user_id: 1 },
      ],
      comments: [
        { id: 1, post_id: 1, content: 'Nice' },
      ],
    }
    const tables = ['users', 'posts', 'comments']

    setupExtractMock(tableData, tables)

    const { prisma, sqlLog } = createMockPrisma()
    const statsTracker = createMockStatsTracker()
    const rateController = createMockRateController()

    const result = await restoreDbFromZip({
      zipPath: '/fake/backup.zip',
      prisma,
      statsTracker: statsTracker as any,
      rateController: rateController as any,
    })

    expect(result.totalTables).toBe(3)
    expect(result.restoredTables).toBe(3)
    expect(result.failedTables).toHaveLength(0)
    expect(result.totalRows).toBe(4)
    expect(result.duration).toBeGreaterThanOrEqual(0)

    const fkDisableCall = sqlLog.find((l) => l.sql === 'SET FOREIGN_KEY_CHECKS=0')
    const fkEnableCall = sqlLog.find((l) => l.sql === 'SET FOREIGN_KEY_CHECKS=1')
    expect(fkDisableCall).toBeDefined()
    expect(fkEnableCall).toBeDefined()

    const truncateCalls = sqlLog.filter((l) => l.sql.includes('TRUNCATE'))
    expect(truncateCalls).toHaveLength(3)
    for (const table of tables) {
      expect(truncateCalls.some((l) => l.sql.includes(`\`${table}\``))).toBe(true)
    }

    const insertCalls = sqlLog.filter((l) => l.sql.includes('INSERT INTO'))
    expect(insertCalls.length).toBeGreaterThanOrEqual(3)

    const usersInsert = insertCalls.find((l) => l.sql.includes('`users`'))
    expect(usersInsert).toBeDefined()
    expect(usersInsert!.values).toContain(1)
    expect(usersInsert!.values).toContain('Alice')

    const autoIncCalls = sqlLog.filter((l) => l.sql.includes('AUTO_INCREMENT'))
    expect(autoIncCalls).toHaveLength(3)

    expect(rateController.waitForBatch).toHaveBeenCalled()
  })

  it('单表失败不应中断整体流程', async () => {
    const tableData: Record<string, Record<string, unknown>[]> = {
      users: [{ id: 1, name: 'Alice' }],
      fail_table: [{ id: 1, data: 'will fail' }],
      good_table: [{ id: 1, data: 'OK' }],
    }
    const tables = ['users', 'fail_table', 'good_table']

    setupExtractMock(tableData, tables)

    const { prisma, sqlLog } = createMockPrisma()
    const statsTracker = createMockStatsTracker()
    const rateController = createMockRateController()

    ;(prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockImplementation(
      (sql: string, ...values: unknown[]) => {
        if (sql.includes('TRUNCATE') && sql.includes('`fail_table`')) {
          return Promise.reject(new Error('Table locked'))
        }
        sqlLog.push({ sql, values })
        return Promise.resolve([])
      },
    )

    const result = await restoreDbFromZip({
      zipPath: '/fake/backup.zip',
      prisma,
      statsTracker: statsTracker as any,
      rateController: rateController as any,
    })

    expect(result.totalTables).toBe(3)
    expect(result.failedTables).toEqual(['fail_table'])
    expect(result.restoredTables).toBe(2)
    expect(result.totalRows).toBe(2)

    const fkEnableCall = sqlLog.find((l) => l.sql === 'SET FOREIGN_KEY_CHECKS=1')
    expect(fkEnableCall).toBeDefined()

    expect(statsTracker.update).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.arrayContaining([
          expect.stringContaining('fail_table'),
        ]),
      }),
    )
  })

  it('断点续传应跳过已完成的表', async () => {
    const tableData: Record<string, Record<string, unknown>[]> = {
      users: [{ id: 1, name: 'Alice' }],
      posts: [{ id: 1, title: 'Hello' }],
      comments: [{ id: 1, content: 'Nice' }],
    }
    const tables = ['users', 'posts', 'comments']

    setupExtractMock(tableData, tables)

    const { prisma, sqlLog } = createMockPrisma()
    const statsTracker = createMockStatsTracker()
    const rateController = createMockRateController()

    const result = await restoreDbFromZip({
      zipPath: '/fake/backup.zip',
      prisma,
      statsTracker: statsTracker as any,
      rateController: rateController as any,
      checkpoint: {
        completedTables: ['users'],
      },
    })

    expect(result.totalTables).toBe(3)
    expect(result.restoredTables).toBe(2)
    expect(result.totalRows).toBe(2)

    const usersTruncate = sqlLog.find(
      (l) => l.sql.includes('TRUNCATE') && l.sql.includes('`users`'),
    )
    expect(usersTruncate).toBeUndefined()

    const usersInsert = sqlLog.find(
      (l) => l.sql.includes('INSERT INTO') && l.sql.includes('`users`'),
    )
    expect(usersInsert).toBeUndefined()

    const postsInsert = sqlLog.find(
      (l) => l.sql.includes('INSERT INTO') && l.sql.includes('`posts`'),
    )
    expect(postsInsert).toBeDefined()

    const commentsInsert = sqlLog.find(
      (l) => l.sql.includes('INSERT INTO') && l.sql.includes('`comments`'),
    )
    expect(commentsInsert).toBeDefined()
  })

  it('FK 检查应在异常时也正确恢复', async () => {
    const tableData: Record<string, Record<string, unknown>[]> = {
      bad_table: [{ id: 1 }],
    }
    const tables = ['bad_table']

    setupExtractMock(tableData, tables)

    const { prisma, sqlLog } = createMockPrisma()
    const statsTracker = createMockStatsTracker()
    const rateController = createMockRateController()

    ;(prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockImplementation(
      (sql: string, ...values: unknown[]) => {
        sqlLog.push({ sql, values })
        if (sql.includes('TRUNCATE')) {
          return Promise.reject(new Error('Permission denied'))
        }
        return Promise.resolve([])
      },
    )

    await restoreDbFromZip({
      zipPath: '/fake/backup.zip',
      prisma,
      statsTracker: statsTracker as any,
      rateController: rateController as any,
    })

    const fkEnableCall = sqlLog.find((l) => l.sql === 'SET FOREIGN_KEY_CHECKS=1')
    expect(fkEnableCall).toBeDefined()

    const fkDisableIdx = sqlLog.findIndex((l) => l.sql === 'SET FOREIGN_KEY_CHECKS=0')
    const fkEnableIdx = sqlLog.findIndex((l) => l.sql === 'SET FOREIGN_KEY_CHECKS=1')
    expect(fkDisableIdx).toBeLessThan(fkEnableIdx)
  })

  it('AUTO_INCREMENT 应在每张成功的表上正确重置', async () => {
    const tableData: Record<string, Record<string, unknown>[]> = {
      users: [
        { id: 1, name: 'Alice' },
        { id: 5, name: 'Bob' },
      ],
      posts: [{ id: 10, title: 'Test' }],
    }
    const tables = ['users', 'posts']

    setupExtractMock(tableData, tables)

    const { prisma, sqlLog } = createMockPrisma()
    const statsTracker = createMockStatsTracker()
    const rateController = createMockRateController()

    await restoreDbFromZip({
      zipPath: '/fake/backup.zip',
      prisma,
      statsTracker: statsTracker as any,
      rateController: rateController as any,
    })

    const autoIncCalls = sqlLog.filter((l) => l.sql.includes('AUTO_INCREMENT'))
    expect(autoIncCalls).toHaveLength(2)

    const usersAutoInc = autoIncCalls.find((l) => l.sql.includes('`users`'))
    expect(usersAutoInc?.sql).toContain('COALESCE(MAX(id) + 1, 1)')

    const postsAutoInc = autoIncCalls.find((l) => l.sql.includes('`posts`'))
    expect(postsAutoInc?.sql).toContain('COALESCE(MAX(id) + 1, 1)')
  })

  it('空表应正常处理（无 INSERT 但有 TRUNCATE）', async () => {
    const tableData: Record<string, Record<string, unknown>[]> = {
      empty_table: [],
      has_data: [{ id: 1, name: 'test' }],
    }
    const tables = ['empty_table', 'has_data']

    setupExtractMock(tableData, tables)

    const { prisma, sqlLog } = createMockPrisma()
    const statsTracker = createMockStatsTracker()
    const rateController = createMockRateController()

    const result = await restoreDbFromZip({
      zipPath: '/fake/backup.zip',
      prisma,
      statsTracker: statsTracker as any,
      rateController: rateController as any,
    })

    expect(result.totalTables).toBe(2)
    expect(result.restoredTables).toBe(2)
    expect(result.failedTables).toHaveLength(0)
    expect(result.totalRows).toBe(1)

    const emptyInsert = sqlLog.find(
      (l) => l.sql.includes('INSERT INTO') && l.sql.includes('`empty_table`'),
    )
    expect(emptyInsert).toBeUndefined()

    const emptyTruncate = sqlLog.find(
      (l) => l.sql.includes('TRUNCATE') && l.sql.includes('`empty_table`'),
    )
    expect(emptyTruncate).toBeDefined()
  })

  it('大量数据应分批插入（每批 500 行）', async () => {
    const rows: Record<string, unknown>[] = []
    for (let i = 1; i <= 1200; i++) {
      rows.push({ id: i, name: `user_${i}` })
    }

    const tableData: Record<string, Record<string, unknown>[]> = {
      big_table: rows,
    }
    const tables = ['big_table']

    setupExtractMock(tableData, tables)

    const { prisma, sqlLog } = createMockPrisma()
    const statsTracker = createMockStatsTracker()
    const rateController = createMockRateController()

    const result = await restoreDbFromZip({
      zipPath: '/fake/backup.zip',
      prisma,
      statsTracker: statsTracker as any,
      rateController: rateController as any,
    })

    expect(result.totalRows).toBe(1200)

    const insertCalls = sqlLog.filter((l) => l.sql.includes('INSERT INTO'))
    expect(insertCalls).toHaveLength(3)

    const firstBatch = insertCalls[0]
    expect(firstBatch.values).toHaveLength(1000)

    const lastBatch = insertCalls[2]
    expect(lastBatch.values).toHaveLength(400)

    expect(rateController.waitForBatch).toHaveBeenCalledTimes(3)
  })

  it('应正确更新 statsTracker 的进度信息', async () => {
    const tableData: Record<string, Record<string, unknown>[]> = {
      users: [{ id: 1, name: 'Alice' }],
      posts: [{ id: 1, title: 'Test' }],
    }
    const tables = ['users', 'posts']

    setupExtractMock(tableData, tables)

    const { prisma } = createMockPrisma()
    const statsTracker = createMockStatsTracker()
    const rateController = createMockRateController()

    await restoreDbFromZip({
      zipPath: '/fake/backup.zip',
      prisma,
      statsTracker: statsTracker as any,
      rateController: rateController as any,
    })

    expect(statsTracker.update).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'db-restore' }),
    )

    expect(statsTracker.update).toHaveBeenCalledWith(
      expect.objectContaining({ tablesTotal: 2 }),
    )

    expect(statsTracker.forceFlush).toHaveBeenCalledTimes(2)

    expect(statsTracker.update).toHaveBeenCalledWith(
      expect.objectContaining({
        restoreCheckpoint: expect.objectContaining({
          completedTables: expect.arrayContaining(['users']),
        }),
      }),
    )
  })

  it('INSERT SQL 应使用参数化查询', async () => {
    const tableData: Record<string, Record<string, unknown>[]> = {
      users: [
        { id: 1, name: "Alice'; DROP TABLE users; --" },
      ],
    }
    const tables = ['users']

    setupExtractMock(tableData, tables)

    const { prisma, sqlLog } = createMockPrisma()
    const statsTracker = createMockStatsTracker()
    const rateController = createMockRateController()

    await restoreDbFromZip({
      zipPath: '/fake/backup.zip',
      prisma,
      statsTracker: statsTracker as any,
      rateController: rateController as any,
    })

    const insertCall = sqlLog.find((l) => l.sql.includes('INSERT INTO'))
    expect(insertCall).toBeDefined()
    expect(insertCall!.sql).toContain('?')

    expect(insertCall!.values).toContain("Alice'; DROP TABLE users; --")
    expect(insertCall!.sql).not.toContain("Alice'; DROP TABLE users; --")
  })
})
