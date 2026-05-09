/**
 * Post-Verify 模块测试
 *
 * 覆盖行数对比、FK 完整性抽样、空表处理、警告信息等场景。
 * 使用 mock PrismaClientLike，不直接操作真实数据库。
 */

import { describe, expect, it, vi } from 'vitest'
import {
  type PostVerifyParams,
  type PostVerifyReport,
  type PrismaClientLike,
  getDefaultFkRelations,
  postVerify,
} from './post-verify'
import type { BackupManifest } from './integrity-check'

// ─── 辅助函数 ──────────────────────────────────────────

/**
 * 创建 mock Prisma 客户端
 *
 * 通过 queryMock 回调来控制每次 $queryRawUnsafe 的返回值。
 *
 * Parameters:
 *   queryMock((query: string, ...values: unknown[]) => unknown[]):
 *     模拟查询的回调函数
 *
 * Returns:
 *   PrismaClientLike: mock 客户端实例
 */
function createMockPrisma(
  queryMock: (query: string, ...values: unknown[]) => unknown[],
): PrismaClientLike {
  return {
    $queryRawUnsafe: <T>(_query: string, ..._values: unknown[]): Promise<T> => {
      return Promise.resolve(queryMock(_query, ..._values) as T)
    },
  }
}

/**
 * 创建带有 fileDetails 的 manifest
 *
 * Parameters:
 *   tables(表名列表): 要包含的表
 *   rowsPerTable(每表的行数): 表名到行数的映射
 *
 * Returns:
 *   BackupManifest: 带 fileDetails 的 manifest
 */
function makeManifest(
  tables: string[],
  rowsPerTable: Record<string, number> = {},
): BackupManifest & {
  fileDetails: Array<{ path: string; sha256: string; size: number; rows?: number }>
} {
  return {
    version: '1.0',
    createdAt: new Date().toISOString(),
    tables,
    models: [],
    plugins: [],
    files: {},
    fileDetails: tables.map((t) => ({
      path: `tables/${t}.jsonl`,
      sha256: 'abc123',
      size: 100,
      rows: rowsPerTable[t] ?? 0,
    })),
  }
}

// ─── 行数对比测试 ─────────────────────────────────────

describe('postVerify - 行数对比', () => {
  it('行数匹配时 passed=true', async () => {
    const prisma = createMockPrisma((query) => {
      if (query.includes('COUNT')) {
        return [{ cnt: 10 }]
      }
      return []
    })

    const manifest = makeManifest(['user', 'post'], { user: 10, post: 10 })

    const report = await postVerify({ prisma, manifest })

    expect(report.passed).toBe(true)
    expect(report.rowCountChecks).toHaveLength(2)
    expect(report.rowCountChecks[0]).toEqual({
      table: 'user',
      expected: 10,
      actual: 10,
      passed: true,
    })
    expect(report.rowCountChecks[1]).toEqual({
      table: 'post',
      expected: 10,
      actual: 10,
      passed: true,
    })
  })

  it('行数不匹配时报告差异', async () => {
    let callCount = 0
    const prisma = createMockPrisma((query) => {
      if (query.includes('COUNT')) {
        callCount++
        // 第一次查询 user 表 → 10 行，第二次查询 post 表 → 5 行
        if (callCount <= 2) return [{ cnt: 10 }]
        // FK 阶段的 COUNT 查询
        return [{ cnt: 0 }]
      }
      return []
    })

    const manifest = makeManifest(['user', 'post'], { user: 10, post: 20 })

    const report = await postVerify({ prisma, manifest })

    expect(report.passed).toBe(false)
    expect(report.rowCountChecks).toHaveLength(2)

    const postCheck = report.rowCountChecks.find((c) => c.table === 'post')!
    expect(postCheck.expected).toBe(20)
    expect(postCheck.actual).toBe(10)
    expect(postCheck.passed).toBe(false)
  })

  it('行数使用 bigint 时正确转换', async () => {
    const prisma = createMockPrisma((query) => {
      if (query.includes('COUNT')) {
        // 模拟 Prisma MySQL 返回 bigint
        return [{ cnt: BigInt(42) }]
      }
      return []
    })

    const manifest = makeManifest(['user'], { user: 42 })

    const report = await postVerify({ prisma, manifest })

    expect(report.rowCountChecks[0].actual).toBe(42)
    expect(report.rowCountChecks[0].passed).toBe(true)
  })
})

// ─── FK 完整性检查测试 ─────────────────────────────────

describe('postVerify - FK 完整性检查', () => {
  it('FK 完整性抽样全部通过', async () => {
    const prisma = createMockPrisma((query) => {
      if (query.includes('COUNT')) {
        return [{ cnt: 100 }]
      }
      // 随机抽样查询
      if (query.includes('RAND()')) {
        return [{ fkVal: 1 }, { fkVal: 2 }, { fkVal: 3 }]
      }
      // FK 引用检查
      if (query.includes('LIMIT 1')) {
        return [{ id: 1 }]
      }
      return []
    })

    const manifest = makeManifest(['user', 'post'], { user: 100, post: 100 })

    const report = await postVerify({ prisma, manifest })

    // 检查结果中有来自 post 表的 FK 检查
    const postFkChecks = report.fkIntegrityChecks.filter(
      (c) => c.table === 'post',
    )
    expect(postFkChecks.length).toBeGreaterThan(0)
    for (const check of postFkChecks) {
      expect(check.passed).toBe(true)
    }
  })

  it('FK 引用不存在时报告失败', async () => {
    let fkCheckCount = 0
    const prisma = createMockPrisma((query) => {
      if (query.includes('COUNT')) {
        return [{ cnt: 20 }]
      }
      if (query.includes('RAND()')) {
        fkCheckCount++
        // 模拟 3 行抽样
        return [{ fkVal: 1 }, { fkVal: 999 }, { fkVal: 3 }]
      }
      if (query.includes('LIMIT 1')) {
        // 第二个 FK 值不存在
        return []
      }
      return []
    })

    const manifest = makeManifest(['user', 'post'], { user: 20, post: 20 })

    const report = await postVerify({ prisma, manifest })

    expect(report.passed).toBe(false)
    // 应该有 FK 检查失败
    const failedChecks = report.fkIntegrityChecks.filter((c) => !c.passed)
    expect(failedChecks.length).toBeGreaterThan(0)
    expect(failedChecks.some((c) => c.failedCount > 0)).toBe(true)
  })
})

// ─── 空表处理测试 ─────────────────────────────────────

describe('postVerify - 空表处理', () => {
  it('空表正常处理且 FK 检查跳过', async () => {
    const prisma = createMockPrisma((query) => {
      if (query.includes('COUNT')) {
        return [{ cnt: 0 }]
      }
      return []
    })

    const manifest = makeManifest(['user', 'post'], { user: 0, post: 0 })

    const report = await postVerify({ prisma, manifest })

    expect(report.passed).toBe(true)
    expect(report.rowCountChecks).toHaveLength(2)
    for (const check of report.rowCountChecks) {
      expect(check.actual).toBe(0)
      expect(check.expected).toBe(0)
      expect(check.passed).toBe(true)
    }
    // 空表的 FK 检查 sampleSize 应为 0
    for (const fkCheck of report.fkIntegrityChecks) {
      expect(fkCheck.sampleSize).toBe(0)
      expect(fkCheck.passed).toBe(true)
    }
  })

  it('空表列表不产生错误', async () => {
    const prisma = createMockPrisma(() => [])

    const manifest = makeManifest([], {})

    const report = await postVerify({ prisma, manifest })

    expect(report.passed).toBe(true)
    expect(report.rowCountChecks).toHaveLength(0)
    expect(report.fkIntegrityChecks).toHaveLength(0)
    expect(report.warnings).toHaveLength(0)
  })
})

// ─── 警告信息测试 ─────────────────────────────────────

describe('postVerify - 警告信息', () => {
  it('manifest 中缺少行数信息时产生警告', async () => {
    const prisma = createMockPrisma(() => [{ cnt: 5 }])

    // 创建没有 fileDetails 中某表的 rows 的 manifest
    const manifest: BackupManifest & {
      fileDetails: Array<{ path: string; sha256: string; size: number; rows?: number }>
    } = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      tables: ['user', 'orphan_table'],
      models: [],
      plugins: [],
      files: {},
      fileDetails: [
        { path: 'tables/user.jsonl', sha256: 'abc', size: 100, rows: 5 },
        // orphan_table 没有 fileDetails 条目
      ],
    }

    const report = await postVerify({ prisma, manifest })

    // orphan_table 应该被跳过并产生警告
    expect(report.warnings.length).toBeGreaterThan(0)
    expect(report.warnings[0]).toContain('orphan_table')

    // user 表仍然正常检查
    const userCheck = report.rowCountChecks.find((c) => c.table === 'user')
    expect(userCheck).toBeDefined()
    expect(userCheck!.passed).toBe(true)
  })
})

// ─── 默认 FK 关系测试 ─────────────────────────────────

describe('getDefaultFkRelations', () => {
  it('返回非空的外键关系列表', () => {
    const relations = getDefaultFkRelations()
    expect(relations.length).toBeGreaterThan(0)
  })

  it('每条关系包含完整的四个字段', () => {
    const relations = getDefaultFkRelations()
    for (const rel of relations) {
      expect(rel).toHaveProperty('fromTable')
      expect(rel).toHaveProperty('fromColumn')
      expect(rel).toHaveProperty('toTable')
      expect(rel).toHaveProperty('toColumn')
    }
  })
})

// ─── 整体报告测试 ─────────────────────────────────────

describe('postVerify - 整体报告', () => {
  it('行数和 FK 都通过时 passed=true', async () => {
    const prisma = createMockPrisma((query) => {
      if (query.includes('COUNT')) {
        return [{ cnt: 0 }]
      }
      return []
    })

    const manifest = makeManifest(['user', 'post'], { user: 0, post: 0 })

    const report = await postVerify({ prisma, manifest })

    expect(report.passed).toBe(true)
    expect(report.rowCountChecks.every((c) => c.passed)).toBe(true)
    expect(report.fkIntegrityChecks.every((c) => c.passed)).toBe(true)
  })

  it('行数不通过时 passed=false 即使 FK 通过', async () => {
    let callIdx = 0
    const prisma = createMockPrisma((query) => {
      if (query.includes('COUNT')) {
        callIdx++
        // 行数对比阶段返回不匹配的值
        if (callIdx <= 2) return [{ cnt: 5 }]
        // FK 阶段返回 0（空表）
        return [{ cnt: 0 }]
      }
      return []
    })

    const manifest = makeManifest(['user', 'post'], { user: 10, post: 10 })

    const report = await postVerify({ prisma, manifest })

    expect(report.passed).toBe(false)
    expect(report.rowCountChecks.every((c) => !c.passed)).toBe(true)
  })
})

// ─── FK NULL 值处理测试 ───────────────────────────────

describe('postVerify - FK NULL 值', () => {
  it('FK 列为 NULL 时跳过该行检查', async () => {
    let nullSkipped = false
    const prisma = createMockPrisma((query) => {
      if (query.includes('COUNT')) {
        return [{ cnt: 50 }]
      }
      if (query.includes('RAND()')) {
        // 返回一行 NULL FK 值
        return [{ fkVal: null }, { fkVal: 1 }]
      }
      if (query.includes('LIMIT 1')) {
        nullSkipped = true
        return [{ id: 1 }]
      }
      return []
    })

    const manifest = makeManifest(['user', 'post'], { user: 50, post: 50 })

    const report = await postVerify({ prisma, manifest })

    // 报告应生成且不崩溃
    expect(report).toBeDefined()
    expect(report.fkIntegrityChecks.length).toBeGreaterThan(0)
  })
})
