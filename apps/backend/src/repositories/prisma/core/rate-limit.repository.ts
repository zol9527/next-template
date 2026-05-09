/**
 * Repository: RateLimitRepository (Prisma 实现)
 *
 * Description: Rate Limit 数据访问层的 Prisma ORM 实现
 */

import { prisma } from '@/lib/prisma'
import type { Logger } from 'pino'
import {
  type RateLimitRepository,
  type RateLimitCounter,
  type CounterResult,
} from '@/repositories/interfaces/core/rate-limit.interface'

/**
 * Function: createRateLimitRepository
 *
 * Description: 创建 Rate Limit Repository 实例
 *
 * Parameters:
 *   logger(Logger): Pino logger 实例
 *
 * Returns:
 *   RateLimitRepository: Repository 实例
 */
export function createRateLimitRepository(logger: Logger): RateLimitRepository {
  const childLogger = logger.child({ layer: 'repository', component: 'rate_limit' })

  async function incrementCounterWithRetry(
    bucketKey: string,
    windowMs: number,
    limit: number,
    retriesLeft = 3
  ): Promise<CounterResult> {
    const now = new Date()
    const resetAt = new Date(now.getTime() + windowMs)

    const existing = await prisma.rate_limit_counter.findUnique({
      where: { bucket_key: bucketKey },
    })

    if (!existing) {
      try {
        await prisma.rate_limit_counter.create({
          data: {
            bucket_key: bucketKey,
            count: 1,
            reset_at: resetAt,
            version: 1,
          },
        })

        return {
          count: 1,
          resetAt,
          allowed: true,
        }
      } catch (error) {
        if (retriesLeft > 0) {
          childLogger.warn(
            { action: 'counter.create_conflict_retry', bucketKey, retriesLeft, err: error },
            'Rate limit counter create conflicted, retrying'
          )
          return incrementCounterWithRetry(bucketKey, windowMs, limit, retriesLeft - 1)
        }

        throw error
      }
    }

    if (now >= existing.reset_at) {
      const resetResult = await prisma.rate_limit_counter.updateMany({
        where: {
          bucket_key: bucketKey,
          version: existing.version,
        },
        data: {
          count: 1,
          reset_at: resetAt,
          version: { increment: 1 },
          updated_at: now,
        },
      })

      if (resetResult.count === 1) {
        return {
          count: 1,
          resetAt,
          allowed: true,
        }
      }
    } else {
      const nextCount = existing.count + 1
      const updateResult = await prisma.rate_limit_counter.updateMany({
        where: {
          bucket_key: bucketKey,
          version: existing.version,
        },
        data: {
          count: { increment: 1 },
          version: { increment: 1 },
          updated_at: now,
        },
      })

      if (updateResult.count === 1) {
        return {
          count: nextCount,
          resetAt: existing.reset_at,
          allowed: nextCount <= limit,
        }
      }
    }

    if (retriesLeft > 0) {
      childLogger.warn(
        { action: 'counter.optimistic_lock_conflict', bucketKey, retriesLeft },
        'Optimistic lock conflict, retrying'
      )
      return incrementCounterWithRetry(bucketKey, windowMs, limit, retriesLeft - 1)
    }

    throw new Error(`Rate limit counter update conflict exceeded retry limit: ${bucketKey}`)
  }

  return {
    async getCounter(bucketKey: string): Promise<RateLimitCounter | null> {
      const counter = await prisma.rate_limit_counter.findUnique({
        where: { bucket_key: bucketKey },
      })

      if (!counter) return null

      return {
        id: counter.id,
        bucketKey: counter.bucket_key,
        count: counter.count,
        resetAt: counter.reset_at,
        version: counter.version,
        createdAt: counter.created_at,
        updatedAt: counter.updated_at,
      }
    },

    async incrementCounter(
      bucketKey: string,
      windowMs: number,
      limit: number
    ): Promise<CounterResult> {
      return incrementCounterWithRetry(bucketKey, windowMs, limit)
    },

    async resetCounter(bucketKey: string): Promise<void> {
      await prisma.rate_limit_counter.delete({
        where: { bucket_key: bucketKey },
      })
    },

    async cleanupExpiredCounters(now: Date): Promise<number> {
      const result = await prisma.rate_limit_counter.deleteMany({
        where: {
          reset_at: { lt: now },
        },
      })

      return result.count
    },
  }
}
