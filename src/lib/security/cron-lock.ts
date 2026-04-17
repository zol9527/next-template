/**
 * File: src/lib/security/cron-lock.ts
 * Description: 基于 MySQL Advisory Lock 的 cron 并发控制工具
 *              利用 Prisma 交互式事务保证 GET_LOCK / RELEASE_LOCK 在同一数据库连接上执行，
 *              避免连接池复用导致的锁泄漏问题。
 */

import type { Logger } from 'pino'

import { prisma } from '@/lib/prisma'
import { ConflictError } from '@/lib/errors/app-error'

/** 获取锁的最大等待时间（秒），超出后放弃获取 */
const LOCK_ACQUIRE_TIMEOUT_SECONDS = 5

/** 锁的最大持有时间（毫秒），对应 Prisma 交互式事务超时，防止死锁 */
const LOCK_MAX_DURATION_MS = 5 * 60 * 1000

/**
 * Function: withCronLock
 *
 * Description: 使用 MySQL Advisory Lock 确保同一 cron 任务不会被并发执行。
 *              获取锁失败时抛出 ConflictError (409)，由 withV1Route 统一处理为 API 响应。
 *
 * Parameters:
 *     lockKey(string): 锁名称，建议格式 `cron:<endpoint-name>`
 *     logger(Logger): 已绑定 traceId 等上下文的请求日志实例
 *     fn(() => Promise<T>): 受锁保护的业务逻辑
 *
 * Returns:
 *     result(Promise<T>): 业务逻辑的返回值
 *
 * Throws:
 *     ConflictError(409): 获取锁失败（并发执行中或获取出错）
 */
export async function withCronLock<T>(
  lockKey: string,
  logger: Logger,
  fn: () => Promise<T>,
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<Array<{ lock_result: number | bigint | null }>>`
        SELECT GET_LOCK(${lockKey}, ${LOCK_ACQUIRE_TIMEOUT_SECONDS}) AS lock_result
      `

      const lockResult = rows[0]?.lock_result
      const acquired = Number(lockResult) === 1

      if (!acquired) {
        if (lockResult === 0) {
          logger.warn(
            { lockKey, action: 'cron_lock.acquire_timeout' },
            '获取 cron 锁超时，任务可能正在并发执行',
          )
        } else {
          logger.error(
            { lockKey, action: 'cron_lock.acquire_error', lockResult },
            '获取 cron 锁失败',
          )
        }

        throw new ConflictError('Cron 任务正在执行中，请稍后重试')
      }

      logger.info({ lockKey, action: 'cron_lock.acquired' }, '获取 cron 锁成功')

      try {
        return await fn()
      } finally {
        try {
          await tx.$queryRaw`SELECT RELEASE_LOCK(${lockKey})`
          logger.info({ lockKey, action: 'cron_lock.released' }, '释放 cron 锁成功')
        } catch (releaseError) {
          logger.warn(
            { err: releaseError, lockKey, action: 'cron_lock.release_failed' },
            '释放 cron 锁异常（连接可能已断开，锁将随连接关闭自动释放）',
          )
        }
      }
    },
    {
      maxWait: LOCK_ACQUIRE_TIMEOUT_SECONDS * 1000 + 2000,
      timeout: LOCK_MAX_DURATION_MS,
    },
  )
}
