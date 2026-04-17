/**
 * Module: rate-limit-sync
 *
 * Description: 纯内存的速率限制检查器（供 Edge Middleware 使用）
 *
 * =============================================================================
 *
 * 此模块专为 Edge Runtime 设计：
 * - 不使用任何 Node.js API
 * - 不依赖数据库或外部存储
 * - 使用内存 Map 存储计数器
 *
 * =============================================================================
 */

/**
 * Type: RateLimitBucket
 *
 * Description: 内存存储的限流桶
 */
type RateLimitBucket = {
  count: number
  resetAtMs: number
}

/**
 * Variable: memoryStore
 *
 * Description: 纯内存存储
 */
const memoryStore = new Map<string, RateLimitBucket>()

/**
 * Variable: MAX_MEMORY_KEYS
 *
 * Description: 内存存储的最大条目数，防止内存泄漏
 */
const MAX_MEMORY_KEYS = 10_000

/**
 * Function: pruneMemoryStore
 *
 * Description: 清理过期的限流桶
 *
 * Parameters:
 *   nowMs(number): 当前时间戳（毫秒）
 *
 * Returns:
 *   void: 无返回值
 */
function pruneMemoryStore(nowMs: number): void {
  // 1. 删除已过期的桶
  for (const [key, bucket] of memoryStore.entries()) {
    if (nowMs >= bucket.resetAtMs) {
      memoryStore.delete(key)
    }
  }

  // 2. 如果仍然超过最大容量，删除最旧的条目
  if (memoryStore.size > MAX_MEMORY_KEYS) {
    const targetSize = Math.floor(MAX_MEMORY_KEYS * 0.8)
    for (const [key] of memoryStore.entries()) {
      memoryStore.delete(key)
      if (memoryStore.size <= targetSize) break
    }
  }
}

/**
 * Function: checkRateLimitSync
 *
 * Description: 同步内存版本的速率限制检查器
 *
 * Parameters:
 *   params(object): 包含以下字段：
 *     key(string): 限流桶的唯一标识
 *     limit(number): 窗口期内允许的最大请求次数
 *     windowMs(number): 窗口长度（毫秒）
 *     nowMs(number): 当前时间戳（毫秒）
 *
 * Returns:
 *   { allowed: true } | { allowed: false; retryAfterSeconds: number }: 检查结果
 */
export function checkRateLimitSync(params: {
  key: string
  limit: number
  windowMs: number
  nowMs: number
}): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  // 如果存储接近满，先清理
  if (memoryStore.size >= MAX_MEMORY_KEYS) {
    pruneMemoryStore(params.nowMs)
  }

  const existing = memoryStore.get(params.key)

  // 不存在或已过期，重置计数
  if (!existing || params.nowMs >= existing.resetAtMs) {
    memoryStore.set(params.key, { count: 1, resetAtMs: params.nowMs + params.windowMs })
    return { allowed: true }
  }

  // 超出限制
  if (existing.count >= params.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAtMs - params.nowMs) / 1000))
    return { allowed: false, retryAfterSeconds }
  }

  // 增加计数
  existing.count += 1
  memoryStore.set(params.key, existing)
  return { allowed: true }
}
