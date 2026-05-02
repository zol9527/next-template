/**
 * Schema Analyzer Module
 * @module lib/backup/schema-analyzer
 *
 * 功能：
 * 1. 从 information_schema 获取 FK 关系图
 * 2. 对表进行拓扑排序，确定备份/恢复顺序
 * 3. 处理自引用和循环依赖
 * 4. 提供表名映射（支持未来 @@map 扩展）
 */

/**
 * 单条外键关系
 */
export interface ForeignKeyRelation {
  /** 来源表名 */
  fromTable: string
  /** 来源列名 */
  fromColumn: string
  /** 目标表名（被引用的表） */
  toTable: string
  /** 目标列名（被引用的列） */
  toColumn: string
}

/**
 * FK 关系图（邻接表表示）
 * Map<表名, 该表的外键关系列表>
 */
export type ForeignKeyGraph = Map<string, ForeignKeyRelation[]>

/**
 * 拓扑排序结果
 */
export interface TopologyResult {
  /** 按依赖排序的表名列表 */
  orderedTables: string[]
  /** 包含自引用的表名列表 */
  selfReferencing: string[]
  /** 检测到的循环依赖链 */
  cycles: string[][]
}

/**
 * 获取需要跳过的表列表
 *
 * 这些表在备份/恢复时应该被忽略：
 * - backup_jobs: 任务记录表
 * - prisma_migrations: Prisma 迁移记录
 * - rate_limit_counters: 限流计数器
 * - sessions: 会话存储
 * - idempotency_requests: 幂等性记录
 * - mfa_action_tokens: MFA 动作令牌
 * - _prisma_migrations: Prisma 迁移表（旧名称）
 *
 * @returns 需要跳过的表名数组
 */
export function getSkipList(): string[] {
  return [
    'backup_jobs',
    'prisma_migrations',
    'rate_limit_counters',
    'sessions',
    'idempotency_requests',
    'mfa_action_tokens',
    '_prisma_migrations',
  ]
}

/**
 * 从数据库获取外键关系图
 *
 * @param prisma - Prisma 客户端实例（支持 $queryRaw）
 * @param databaseName - 数据库名称
 * @returns FK 图（邻接表表示）
 */
export async function getForeignKeyGraph(
  prisma: { $queryRaw: <T>(query: TemplateStringsArray | string, ...values: unknown[]) => Promise<T> },
  databaseName: string
): Promise<ForeignKeyGraph> {
  const sql = `
    SELECT
      TABLE_NAME as fromTable,
      COLUMN_NAME as fromColumn,
      REFERENCED_TABLE_NAME as toTable,
      REFERENCED_COLUMN_NAME as toColumn
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = ?
      AND REFERENCED_TABLE_NAME IS NOT NULL
      AND REFERENCED_TABLE_SCHEMA = ?
  `

  const rows = await prisma.$queryRaw<{
    fromTable: string
    fromColumn: string
    toTable: string
    toColumn: string
  }[]>(sql, databaseName, databaseName)

  const graph: ForeignKeyGraph = new Map()

  for (const row of rows) {
    const { fromTable, fromColumn, toTable, toColumn } = row

    const relation: ForeignKeyRelation = {
      fromTable,
      fromColumn,
      toTable,
      toColumn,
    }

    if (!graph.has(fromTable)) {
      graph.set(fromTable, [])
    }
    graph.get(fromTable)!.push(relation)
  }

  return graph
}

/**
 * 拓扑排序（Kahn 算法）
 *
 * 对 FK 图进行排序，返回备份/恢复的表顺序。
 * 自引用表会被特殊处理（加入 selfReferencing，但不产生排序冲突）。
 * 循环依赖会被检测并报告。
 *
 * @param graph - FK 关系图
 * @param allTables - 所有表名列表
 * @returns 拓扑排序结果
 */
export function topologicalSort(graph: ForeignKeyGraph, allTables: string[]): TopologyResult {
  const skipList = getSkipList()

  // 过滤掉需要跳过的表
  const tables = allTables.filter((t) => !skipList.includes(t))

  // 构建邻接表和入度表
  const inDegree = new Map<string, number>()
  const adjacencyList = new Map<string, string[]>()

  // 初始化
  for (const table of tables) {
    inDegree.set(table, 0)
    adjacencyList.set(table, [])
  }

  // 记录自引用表
  const selfReferencing: string[] = []

  // 处理每个表的外键关系
  for (const [fromTable, relations] of graph.entries()) {
    if (!adjacencyList.has(fromTable)) continue

    for (const relation of relations) {
      const { toTable } = relation

      // 检测自引用
      if (fromTable === toTable) {
        if (!selfReferencing.includes(fromTable)) {
          selfReferencing.push(fromTable)
        }
        continue // 跳过自引用边，不影响拓扑排序
      }

      if (adjacencyList.has(toTable)) {
        adjacencyList.get(fromTable)!.push(toTable)
        inDegree.set(toTable, (inDegree.get(toTable) ?? 0) + 1)
      }
    }
  }

  // Kahn 算法
  const queue: string[] = []
  const orderedTables: string[] = []

  // 入度为 0 的节点入队（无依赖的表先处理）
  for (const table of tables) {
    if ((inDegree.get(table) ?? 0) === 0) {
      queue.push(table)
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!
    orderedTables.push(current)

    for (const neighbor of adjacencyList.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 0) - 1
      inDegree.set(neighbor, newDegree)

      if (newDegree === 0) {
        queue.push(neighbor)
      }
    }
  }

  // 检测循环依赖
  const cycles: string[][] = []
  const visited = new Set<string>()
  const inCycle = new Set<string>()

  for (const table of tables) {
    if ((inDegree.get(table) ?? 0) > 0 && !visited.has(table)) {
      // 找到一个新的循环
      const cycle: string[] = []
      let current: string | null = table

      while (current && !inCycle.has(current)) {
        inCycle.add(current)
        cycle.push(current)

        // 找到当前节点的下一个节点（在邻接表中找入度 > 0 的节点）
        const neighbors: string[] = adjacencyList.get(current) ?? []
        current = neighbors.find((n: string) => (inDegree.get(n) ?? 0) > 0) ?? null
      }

      if (cycle.length > 0) {
        cycles.push(cycle)
        for (const node of cycle) {
          visited.add(node)
        }
      }
    }
  }

  // 添加未排序的表（理论上不应该有，如果有说明有环）
  for (const table of tables) {
    if (!orderedTables.includes(table)) {
      orderedTables.push(table)
    }
  }

  return {
    orderedTables,
    selfReferencing,
    cycles,
  }
}

/**
 * 获取表名映射
 *
 * 从 information_schema.TABLES 查询表名和注释，
 * 构建表名到显示名的映射（目前是 identity 映射，
 * 未来可扩展支持 Prisma @@map）
 *
 * @param prisma - Prisma 客户端实例
 * @param databaseName - 数据库名称
 * @returns 表名 → 表名 映射
 */
export async function getTableNameMapping(
  prisma: { $queryRaw: <T>(query: TemplateStringsArray | string, ...values: unknown[]) => Promise<T> },
  databaseName: string
): Promise<Map<string, string>> {
  const sql = `
    SELECT TABLE_NAME, TABLE_COMMENT
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = ?
  `

  const rows = await prisma.$queryRaw<{
    TABLE_NAME: string
    TABLE_COMMENT: string
  }[]>(sql, databaseName)

  const mapping = new Map<string, string>()

  for (const row of rows) {
    mapping.set(row.TABLE_NAME, row.TABLE_NAME)
  }

  return mapping
}