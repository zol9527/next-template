/**
 * 依赖图解析引擎
 * 基于 Kahn's algorithm 实现拓扑排序，支持循环依赖检测和缺失依赖检测
 *
 * Function: resolveExecutionOrder
 *
 * Description: 接收 discovery 返回的模块 Map，根据 meta.dependsOn 构建依赖图，
 *   使用 Kahn's algorithm 进行拓扑排序，返回按依赖顺序排列的模块列表。
 *
 * Parameters:
 *   modules(Map<string, {meta, filePath, module, type}>): discovery 发现的模块映射
 *
 * Returns:
 *   sorted(Array<{meta, filePath, module, type}>): 按依赖顺序排列的模块列表
 *
 * Throws:
 *   Error: 循环依赖或缺失依赖时抛出明确错误信息
 */

/**
 * 构建依赖图并返回拓扑排序结果（Kahn's algorithm）
 *
 * Parameters:
 *   modules(Map<string, {meta, filePath, module, type}>): discovery 返回的模块 Map
 *
 * Returns:
 *   sorted(Array<{meta, filePath, module, type}>): 按依赖顺序排列的模块列表（依赖在前）
 *
 * Throws:
 *   Error: 当存在循环依赖或 dependsOn 引用不存在的模块时抛出
 */
export function resolveExecutionOrder(modules) {
  const moduleIds = new Set(modules.keys())

  // 1. 校验所有 dependsOn 引用都指向已存在的模块
  for (const [id, mod] of modules) {
    const deps = mod.meta.dependsOn || []
    for (const depId of deps) {
      if (!moduleIds.has(depId)) {
        throw new Error(
          `Module '${id}' depends on unknown module '${depId}'. Available modules: ${[...moduleIds].join(', ')}`
        )
      }
    }
  }

  // 2. 构建邻接表和入度表
  const inDegree = new Map()
  const adjacency = new Map() // dep → Set<依赖它的模块>

  for (const id of moduleIds) {
    inDegree.set(id, 0)
    adjacency.set(id, new Set())
  }

  for (const [id, mod] of modules) {
    const deps = mod.meta.dependsOn || []
    for (const depId of deps) {
      adjacency.get(depId).add(id)
      inDegree.set(id, inDegree.get(id) + 1)
    }
  }

  // 3. BFS 拓扑排序（Kahn's algorithm）
  const queue = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id)
    }
  }
  // 按字典序排序初始队列，确保输出确定性
  queue.sort()

  const sortedIds = []
  while (queue.length > 0) {
    const current = queue.shift()
    sortedIds.push(current)

    const dependents = [...adjacency.get(current)].sort()
    for (const depId of dependents) {
      inDegree.set(depId, inDegree.get(depId) - 1)
      if (inDegree.get(depId) === 0) {
        queue.push(depId)
        queue.sort()
      }
    }
  }

  // 4. 检测循环依赖
  if (sortedIds.length < moduleIds.size) {
    const remaining = [...moduleIds].filter(id => !sortedIds.includes(id))
    // 追踪循环路径
    const cyclePath = findCyclePath(remaining, modules)
    throw new Error(
      `Circular dependency detected: ${cyclePath}`
    )
  }

  // 5. 返回排序后的模块对象
  return sortedIds.map(id => modules.get(id))
}

/**
 * 追踪循环依赖路径
 *
 * Parameters:
 *   remainingIds(string[]): 未被排序的模块 ID（存在循环）
 *   modules(Map): 模块映射
 *
 * Returns:
 *   path(string): 循环路径字符串，如 "A → B → C → A"
 */
function findCyclePath(remainingIds, modules) {
  const visited = new Set()
  const path = []

  function dfs(current) {
    if (visited.has(current)) {
      // 找到循环起点
      const cycleStart = path.indexOf(current)
      if (cycleStart >= 0) {
        return [...path.slice(cycleStart), current].join(' → ')
      }
      return null
    }

    visited.add(current)
    path.push(current)

    const deps = (modules.get(current)?.meta?.dependsOn || [])
      .filter(d => remainingIds.includes(d))

    for (const dep of deps) {
      const result = dfs(dep)
      if (result) return result
    }

    path.pop()
    return null
  }

  for (const id of remainingIds) {
    const result = dfs(id)
    if (result) return result
  }

  // 降级：无法追踪具体路径时列出所有未排序模块
  return remainingIds.join(' → ') + ' (circular)'
}
