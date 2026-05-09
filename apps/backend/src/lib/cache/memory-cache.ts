/**
 * 内存缓存模块
 *
 * 简单的 TTL 缓存实现，无外部依赖。
 * 采用惰性清理策略：读取时检查过期，不使用定时器。
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

/**
 * Function: createMemoryCache
 *
 * Description: 创建一个基于 Map 的内存缓存实例
 *
 * Returns:
 *     cache(object): 提供 get/set/invalidate/invalidatePattern 方法
 */
export function createMemoryCache() {
  const store = new Map<string, CacheEntry<unknown>>()

  /**
   * 清理单个过期项（惰性清理）
   */
  function evictIfExpired(key: string): void {
    const entry = store.get(key)
    if (entry && Date.now() > entry.expiresAt) {
      store.delete(key)
    }
  }

  return {
    /**
     * 获取缓存值，过期返回 undefined
     */
    get<T>(key: string): T | undefined {
      evictIfExpired(key)
      const entry = store.get(key) as CacheEntry<T> | undefined
      return entry?.value
    },

    /**
     * 设置缓存值及 TTL
     *
     * Parameters:
     *     key(string): 缓存键
     *     value(T): 缓存值
     *     ttlMs(number): 过期时间（毫秒）
     */
    set<T>(key: string, value: T, ttlMs: number): void {
      store.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      })
    },

    /**
     * 失效指定缓存键
     */
    invalidate(key: string): void {
      store.delete(key)
    },

    /**
     * 按前缀批量失效缓存
     *
     * Parameters:
     *     prefix(string): 缓存键前缀，如 'feature-flag:'
     */
    invalidatePattern(prefix: string): void {
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
          store.delete(key)
        }
      }
    },
  }
}

/**
 * 全局单例缓存实例
 */
export const memoryCache = createMemoryCache()

/**
 * 缓存 TTL 常量（毫秒）
 */
export const CACHE_TTL = {
  DASHBOARD_STATS: 30_000,       // 30 秒
  SITE_CONFIG: 5 * 60_000,      // 5 分钟
  FEATURE_FLAG: 60_000,          // 1 分钟
} as const
