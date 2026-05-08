/**
 * 备份恢复事后验证模块
 *
 * 提供恢复后的数据完整性校验功能：
 * 1. 全表行数对比（manifest vs 实际数据库）
 * 2. FK 完整性抽样检查（随机 5% 行验证外键存在性）
 * 3. 生成详细的验证报告
 */

import type { BackupManifest } from './integrity-check'

// ─── 类型定义 ───────────────────────────────────────────

/**
 * 类 Prisma 客户端接口
 *
 * 仅要求 $queryRawUnsafe 方法，用于执行原始 SQL 查询。
 * 这样可以在测试中轻松模拟，无需真实数据库连接。
 */
export interface PrismaClientLike {
  $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T>
}

/**
 * 对象存储提供者接口
 *
 * 用于可选的文件可达性验证，检查备份文件是否仍然可访问。
 */
export interface ObjectStorageProvider {
  /** 检查指定路径的文件是否可达 */
  isAccessible: (path: string) => Promise<boolean>
}

/**
 * 事后验证参数
 */
export interface PostVerifyParams {
  /** Prisma 客户端实例（仅需 $queryRawUnsafe） */
  prisma: PrismaClientLike
  /** 备份清单（包含表名、文件详情等） */
  manifest: BackupManifest
  /** 可选：对象存储提供者，用于文件可达性验证 */
  provider?: ObjectStorageProvider
  /** 可选：URL 重映射结果（URL → 新 ID） */
  remappedUrls?: Record<string, number>
}

/**
 * 行数检查结果
 */
export interface RowCountCheck {
  /** 表名 */
  table: string
  /** manifest 中记录的期望行数 */
  expected: number
  /** 数据库中的实际行数 */
  actual: number
  /** 是否通过 */
  passed: boolean
}

/**
 * FK 完整性检查结果
 */
export interface FkIntegrityCheck {
  /** 来源表名 */
  table: string
  /** 外键列名 */
  column: string
  /** 是否通过 */
  passed: boolean
  /** 抽样数量 */
  sampleSize: number
  /** 失败数量 */
  failedCount: number
}

/**
 * 事后验证报告
 */
export interface PostVerifyReport {
  /** 整体是否通过 */
  passed: boolean
  /** 行数检查结果列表 */
  rowCountChecks: RowCountCheck[]
  /** FK 完整性检查结果列表 */
  fkIntegrityChecks: FkIntegrityCheck[]
  /** 警告信息列表 */
  warnings: string[]
}

// ─── 外键关系描述（用于 FK 完整性检查） ──────────────────

/**
 * 外键关系描述
 *
 * 定义一个外键约束，用于抽样检查恢复后的 FK 完整性。
 */
export interface FkRelation {
  /** 来源表名 */
  fromTable: string
  /** 来源列名 */
  fromColumn: string
  /** 目标表名（被引用的表） */
  toTable: string
  /** 目标列名（被引用的列） */
  toColumn: string
}

// ─── 默认外键关系（基于项目 schema） ────────────────────

/**
 * 获取项目默认的外键关系列表
 *
 * 基于当前 Prisma schema 中定义的外键约束。
 * 在实际使用中，可以通过 schema-analyzer 动态获取，
 * 此处提供静态列表作为后备方案。
 *
 * Returns:
 *   FkRelation[]: 外键关系列表
 */
export function getDefaultFkRelations(): FkRelation[] {
  return [
    { fromTable: 'account', fromColumn: 'userId', toTable: 'user', toColumn: 'id' },
    { fromTable: 'session', fromColumn: 'userId', toTable: 'user', toColumn: 'id' },
    { fromTable: 'post', fromColumn: 'authorId', toTable: 'user', toColumn: 'id' },
    { fromTable: 'post', fromColumn: 'categoryId', toTable: 'category', toColumn: 'id' },
    { fromTable: 'post_tag', fromColumn: 'postId', toTable: 'post', toColumn: 'id' },
    { fromTable: 'post_tag', fromColumn: 'tagId', toTable: 'tag', toColumn: 'id' },
    { fromTable: 'comment', fromColumn: 'postId', toTable: 'post', toColumn: 'id' },
    { fromTable: 'comment', fromColumn: 'authorId', toTable: 'user', toColumn: 'id' },
    { fromTable: 'media', fromColumn: 'userId', toTable: 'user', toColumn: 'id' },
    { fromTable: 'log', fromColumn: 'userId', toTable: 'user', toColumn: 'id' },
    { fromTable: 'user_role', fromColumn: 'userId', toTable: 'user', toColumn: 'id' },
    { fromTable: 'user_role', fromColumn: 'roleId', toTable: 'role', toColumn: 'id' },
    { fromTable: 'role_permission', fromColumn: 'roleId', toTable: 'role', toColumn: 'id' },
    { fromTable: 'role_permission', fromColumn: 'permissionId', toTable: 'permission', toColumn: 'id' },
  ]
}

// ─── 辅助函数 ──────────────────────────────────────────

/**
 * Function: getExpectedRows
 *
 * Description: 从 manifest.fileDetails 中查找指定表的期望行数。
 * 匹配规则：fileDetails 中 path 字段格式为 "tables/<tableName>.jsonl"。
 *
 * Parameters:
 *   manifest(BackupManifest): 备份清单
 *   tableName(string): 表名
 *
 * Returns:
 *   number | undefined: 期望行数，未找到返回 undefined
 */
function getExpectedRows(
  manifest: BackupManifest,
  tableName: string,
): number | undefined {
  const targetPath = `tables/${tableName}.jsonl`
  // 尝试从 manifest 的 fileDetails 中获取行数
  const fileDetails = (manifest as BackupManifest & {
    fileDetails?: Array<{ path: string; sha256: string; size: number; rows?: number }>
  }).fileDetails

  if (!fileDetails) return undefined

  const entry = fileDetails.find((f) => f.path === targetPath)
  return entry?.rows
}

/**
 * Function: getRowCount
 *
 * Description: 执行 SELECT COUNT(*) 查询获取指定表的实际行数。
 *
 * Parameters:
 *   prisma(PrismaClientLike): Prisma 客户端
 *   tableName(string): 表名
 *
 * Returns:
 *   Promise<number>: 实际行数
 */
async function getRowCount(prisma: PrismaClientLike, tableName: string): Promise<number> {
  const result = await prisma.$queryRawUnsafe<{ cnt: bigint | number }[]>(
    `SELECT COUNT(*) as cnt FROM \`${tableName}\``,
  )
  const cnt = result[0]?.cnt
  // bigint 转 number（Prisma MySQL 返回 bigint）
  return typeof cnt === 'bigint' ? Number(cnt) : Number(cnt ?? 0)
}

/**
 * Function: sampleFkIntegrity
 *
 * Description: 随机抽样指定表中 5% 的行，验证外键列值在被引用表中是否存在。
 *
 * Parameters:
 *   prisma(PrismaClientLike): Prisma 客户端
 *   relation(FkRelation): 外键关系描述
 *   tableRowCount(number): 表的总行数（用于计算抽样大小）
 *
 * Returns:
 *   Promise<FkIntegrityCheck>: FK 完整性检查结果
 */
async function sampleFkIntegrity(
  prisma: PrismaClientLike,
  relation: FkRelation,
  tableRowCount: number,
): Promise<FkIntegrityCheck> {
  // 抽样 5%，至少 1 行，最多 100 行
  const sampleSize = Math.min(Math.max(Math.ceil(tableRowCount * 0.05), 1), 100)

  // 如果表为空，直接通过
  if (tableRowCount === 0) {
    return {
      table: relation.fromTable,
      column: relation.fromColumn,
      passed: true,
      sampleSize: 0,
      failedCount: 0,
    }
  }

  // 随机抽样获取外键列值
  const sampledRows = await prisma.$queryRawUnsafe<
    Array<Record<string, unknown>>
  >(
    `SELECT \`${relation.fromColumn}\` as fkVal FROM \`${relation.fromTable}\` ORDER BY RAND() LIMIT ${sampleSize}`,
  )

  let failedCount = 0

  for (const row of sampledRows) {
    const fkVal = row.fkVal
    if (fkVal === null || fkVal === undefined) continue // NULL 外键跳过

    // 检查被引用表中是否存在对应记录
    const refRows = await prisma.$queryRawUnsafe<{ id: unknown }[]>(
      `SELECT \`${relation.toColumn}\` as id FROM \`${relation.toTable}\` WHERE \`${relation.toColumn}\` = ? LIMIT 1`,
      fkVal,
    )

    if (refRows.length === 0) {
      failedCount++
    }
  }

  return {
    table: relation.fromTable,
    column: relation.fromColumn,
    passed: failedCount === 0,
    sampleSize: sampledRows.length,
    failedCount,
  }
}

// ─── 主函数 ────────────────────────────────────────────

/**
 * Function: postVerify
 *
 * Description: 备份恢复后的事后验证。逐表检查行数是否与 manifest 一致，
 * 并对外键关系进行抽样完整性验证。生成详细的验证报告。
 *
 * Parameters:
 *   params(PostVerifyParams): 验证参数，包含 prisma 客户端、manifest 等
 *
 * Returns:
 *   Promise<PostVerifyReport>: 验证报告
 */
export async function postVerify(params: PostVerifyParams): Promise<PostVerifyReport> {
  const { prisma, manifest } = params
  const warnings: string[] = []
  const rowCountChecks: RowCountCheck[] = []
  const fkIntegrityChecks: FkIntegrityCheck[] = []

  // 获取所有需要验证的表
  const tables = manifest.tables ?? []

  // ── 1. 全表行数对比 ──
  for (const table of tables) {
    const expected = getExpectedRows(manifest, table)

    // 如果 manifest 中没有该表的行数信息，跳过并记录警告
    if (expected === undefined) {
      warnings.push(`表 "${table}" 在 manifest.fileDetails 中未找到行数信息`)
      continue
    }

    const actual = await getRowCount(prisma, table)

    rowCountChecks.push({
      table,
      expected,
      actual,
      passed: expected === actual,
    })
  }

  // ── 2. FK 完整性抽样 ──
  // 使用默认外键关系，过滤到 manifest 中包含的表
  const fkRelations = getDefaultFkRelations().filter(
    (rel) => tables.includes(rel.fromTable) && tables.includes(rel.toTable),
  )

  for (const relation of fkRelations) {
    const rowCount = await getRowCount(prisma, relation.fromTable)
    const check = await sampleFkIntegrity(prisma, relation, rowCount)
    fkIntegrityChecks.push(check)
  }

  // ── 3. 生成报告 ──
  const allRowCountsPass = rowCountChecks.every((c) => c.passed)
  const allFkPass = fkIntegrityChecks.every((c) => c.passed)

  return {
    passed: allRowCountsPass && allFkPass,
    rowCountChecks,
    fkIntegrityChecks,
    warnings,
  }
}
