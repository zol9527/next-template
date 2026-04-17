/**
 * Interface: RateLimitRepository
 *
 * Description: Rate Limit 数据访问层接口，定义计数器的 CRUD 操作
 */

/**
 * Type: RateLimitCounter
 *
 * Description: Rate Limit 计数器实体
 */
export type RateLimitCounter = {
  id: string
  bucketKey: string
  count: number
  resetAt: Date
  version: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Type: CounterResult
 *
 * Description: 计数器递增操作的结果
 */
export type CounterResult = {
  count: number
  resetAt: Date
  allowed: boolean
}

/**
 * Interface: RateLimitRepository
 */
export interface RateLimitRepository {
  // ==================== 计数器管理 ====================

  /**
   * Function: getCounter
   *
   * Description: 获取计数器
   *
   * Parameters:
   *   bucketKey(string): 计数器键
   *
   * Returns:
   *   Promise<RateLimitCounter | null>: 计数器实体或 null
   */
  getCounter(bucketKey: string): Promise<RateLimitCounter | null>

  /**
   * Function: incrementCounter
   *
   * Description: 原子性递增计数器（使用事务）
   *
   * Parameters:
   *   bucketKey(string): 计数器键
   *   windowMs(number): 窗口长度（毫秒）
   *   limit(number): 限制次数（用于判断 allowed）
   *
   * Returns:
   *   Promise<CounterResult>: 计数器结果
   */
  incrementCounter(
    bucketKey: string,
    windowMs: number,
    limit: number
  ): Promise<CounterResult>

  /**
   * Function: resetCounter
   *
   * Description: 重置计数器
   *
   * Parameters:
   *   bucketKey(string): 计数器键
   *
   * Returns:
   *   Promise<void>: 无返回值
   */
  resetCounter(bucketKey: string): Promise<void>

  /**
   * Function: cleanupExpiredCounters
   *
   * Description: 清理过期的计数器
   *
   * Parameters:
   *   now(Date): 当前时间
   *
   * Returns:
   *   Promise<number>: 删除的记录数
   */
  cleanupExpiredCounters(now: Date): Promise<number>
}
