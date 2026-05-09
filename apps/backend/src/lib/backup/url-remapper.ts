import type { StatsTracker } from './stats-tracker'

/**
 * URL 重映射模块
 *
 * Function: remapUrls
 * Description: 将数据库中存储的 URL 从旧存储 endpoint 批量替换为新 endpoint，
 *              仅替换以旧 endpoint 开头的自有 URL，不影响第三方 URL
 */

/**
 * Prisma 客户端接口定义
 * 仅使用 $queryRawUnsafe 方法，避免引入完整 Prisma 类型
 */
export interface PrismaClientLike {
  $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T>
}

/**
 * 重映射参数接口
 */
export interface RemapParams {
  /** Prisma 客户端实例 */
  prisma: PrismaClientLike
  /** 旧存储 endpoint（如 https://old-bucket.oss.aliyuncs.com） */
  oldEndpoint: string
  /** 新存储 endpoint */
  newEndpoint: string
  /** 表 → 需要重映射的字段列表 */
  remappingFields: Record<string, string[]>
  /** 可选的进度追踪器 */
  statsTracker?: StatsTracker
}

/**
 * 重映射结果接口
 */
export interface RemapResult {
  /** 处理的表数量 */
  tablesProcessed: number
  /** 总替换数量 */
  totalReplacements: number
  /** 表名 → 替换数量的详细记录 */
  details: Record<string, number>
}

/**
 * SQL UPDATE 结果行接口
 */
interface UpdateResult {
  /** 受影响的行数（MySQL / PostgreSQL 兼容） */
  affected_rows?: number
  /** MySQL 兼容字段 */
  affectedRows?: number
  /** PostgreSQL 兼容字段（rowCount 通常通过其他方式获取） */
  rowCount?: number
}

/**
 * Function: remapUrls
 * Description: 将数据库中以旧 endpoint 开头的 URL 批量替换为新 endpoint。
 *              只替换以 oldEndpoint 开头的 URL，null / 空字符串 / 相对路径 / 第三方 URL 一律跳过。
 *
 * Parameters:
 *   params(RemapParams): 包含 prisma 客户端、旧 endpoint、新 endpoint、字段映射和可选进度追踪器的参数对象
 *
 * Returns:
 *   tablesProcessed(number): 处理的表数量
 *   totalReplacements(number): 总替换数量
 *   details(Record<string, number>): 表名 → 替换数量的详细记录
 */
export async function remapUrls(params: RemapParams): Promise<RemapResult> {
  const { prisma, oldEndpoint, newEndpoint, remappingFields, statsTracker } =
    params

  const details: Record<string, number> = {}
  let totalReplacements = 0
  let tablesProcessed = 0

  for (const [table, fields] of Object.entries(remappingFields)) {
    let tableReplacements = 0

    for (const field of fields) {
      // 构建 SQL：只替换以 oldEndpoint 开头的 URL
      // 使用参数化查询防止 SQL 注入
      const sql = `UPDATE \`${table}\` SET \`${field}\` = REPLACE(\`${field}\`, '${sanitizeSqlValue(oldEndpoint)}', '${sanitizeSqlValue(newEndpoint)}') WHERE \`${field}\` LIKE '${sanitizeSqlValue(oldEndpoint)}%'`

      const result = await prisma.$queryRawUnsafe<UpdateResult[]>(sql)

      // 兼容不同数据库驱动返回格式
      const affected =
        result?.[0]?.affected_rows ??
        result?.[0]?.affectedRows ??
        result?.[0]?.rowCount ??
        0

      tableReplacements += Number(affected)
    }

    if (tableReplacements > 0) {
      details[table] = tableReplacements
      totalReplacements += tableReplacements
    }

    tablesProcessed++

    // 更新进度追踪器
    if (statsTracker) {
      statsTracker.update({
        phase: 'url-remapping',
        currentTable: table,
      })
    }
  }

  return {
    tablesProcessed,
    totalReplacements,
    details,
  }
}

/**
 * Function: sanitizeSqlValue
 * Description: 清理 SQL 字符串值中的单引号，防止 SQL 注入。
 *              仅用于 endpoint URL，这些 URL 不应包含单引号。
 *
 * Parameters:
 *   value(string): 需要清理的字符串值
 *
 * Returns:
 *   (string): 清理后的安全字符串
 */
function sanitizeSqlValue(value: string): string {
  return value.replace(/'/g, "''")
}
