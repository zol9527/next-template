/**
 * Module: rate-limit
 *
 * Description: Rate Limit 限流检查服务（双层桶模型，支持数据库存储 + 内存降级）
 *
 * =============================================================================
 *
 * 提供 API Routes 使用的限流检查：
 * - enforceRateLimit (async) - 支持主桶 + IP 桶
 *
 * Edge Middleware 请使用 @/lib/utils/rate-limit-sync 中的 checkRateLimitSync
 *
 * =============================================================================
 */

import type { Logger } from 'pino'
import { createRateLimitRepository } from '@/repositories/factory'

export type RateLimitWhitelist = {
  ips?: string[]
  users?: string[]
  roles?: string[]
}

export type RateLimitNetworkPolicy = {
  max: number
  windowMs: number
}

export interface RateLimitRequest {
  rule: string
  ip: string
  max: number
  windowMs: number
  identity?: string | null
  network?: RateLimitNetworkPolicy
  whitelist?: RateLimitWhitelist
  userId?: string
  userRoles?: string[]
  now?: number
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

type RateLimitBucket = {
  count: number
  resetAtMs: number
}

type RateLimitBucketPolicy = {
  name: 'primary' | 'network'
  bucketKey: string
  limit: number
  windowMs: number
}

type BucketCheckResult = {
  name: 'primary' | 'network'
  bucketKey: string
  count: number
  limit: number
  resetAtMs: number
  allowed: boolean
}

const dbFallbackStore = new Map<string, RateLimitBucket>()
const MAX_FALLBACK_KEYS = 10_000

export async function enforceRateLimit(
  params: RateLimitRequest,
  logger: Logger
): Promise<RateLimitResult> {
  const normalized = normalizeRateLimitRequest(params)

  if (isWhitelisted(normalized)) {
    return { allowed: true }
  }

  const policies = buildBucketPolicies(normalized)

  try {
    const repo = createRateLimitRepository()
    const results = await Promise.all(
      policies.map(async (policy) => {
        const result = await repo.incrementCounter(policy.bucketKey, policy.windowMs, policy.limit)

        return {
          name: policy.name,
          bucketKey: policy.bucketKey,
          count: result.count,
          limit: policy.limit,
          resetAtMs: result.resetAt.getTime(),
          allowed: result.allowed,
        } satisfies BucketCheckResult
      })
    )

    return finalizeRateLimitResult(normalized.rule, normalized.ip, normalized.identity, normalized.nowMs, results, logger)
  } catch (error) {
    logger.error(
      { err: error, action: 'rate_limit.db_fallback', rule: normalized.rule },
      'Rate limit database unavailable, using in-memory fallback'
    )

    const results = policies.map((policy) => checkRateLimitWithMemory(policy, normalized.nowMs))
    return finalizeRateLimitResult(normalized.rule, normalized.ip, normalized.identity, normalized.nowMs, results, logger)
  }
}

export const checkRateLimit = enforceRateLimit

type NormalizedRateLimitRequest = {
  rule: string
  ip: string
  max: number
  windowMs: number
  identity?: string
  network?: RateLimitNetworkPolicy
  whitelist?: RateLimitWhitelist
  userId?: string
  userRoles: string[]
  nowMs: number
}

function normalizeRateLimitRequest(params: RateLimitRequest): NormalizedRateLimitRequest {
  return {
    rule: params.rule,
    ip: params.ip,
    max: params.max,
    windowMs: params.windowMs,
    identity: normalizeIdentity(params.identity),
    network: params.network,
    whitelist: params.whitelist,
    userId: params.userId,
    userRoles: params.userRoles ?? [],
    nowMs: params.now ?? Date.now(),
  }
}

function normalizeIdentity(identity?: string | null): string | undefined {
  const normalized = identity?.trim()
  return normalized ? normalized : undefined
}

function isWhitelisted(params: NormalizedRateLimitRequest): boolean {
  const whitelist = params.whitelist

  if (!whitelist) {
    return false
  }

  if (whitelist.ips?.includes(params.ip)) {
    return true
  }

  if (params.userId && whitelist.users?.includes(params.userId)) {
    return true
  }

  return params.userRoles.some((role) => whitelist.roles?.includes(role))
}

function buildBucketPolicies(params: NormalizedRateLimitRequest): RateLimitBucketPolicy[] {
  const policies: RateLimitBucketPolicy[] = []
  const primaryBucketKey = buildPrimaryBucketKey(params.rule, params.ip, params.identity)

  policies.push({
    name: 'primary',
    bucketKey: primaryBucketKey,
    limit: params.max,
    windowMs: params.windowMs,
  })

  if (params.network) {
    const networkBucketKey = buildNetworkBucketKey(params.rule, params.ip)

    if (
      networkBucketKey !== primaryBucketKey ||
      params.network.max !== params.max ||
      params.network.windowMs !== params.windowMs
    ) {
      policies.push({
        name: 'network',
        bucketKey: networkBucketKey,
        limit: params.network.max,
        windowMs: params.network.windowMs,
      })
    }
  }

  return policies
}

function buildPrimaryBucketKey(rule: string, ip: string, identity?: string): string {
  if (!identity) {
    return ['rate_limit', rule, 'ip', ip].join(':')
  }

  return ['rate_limit', rule, 'identity', ip, identity].join(':')
}

function buildNetworkBucketKey(rule: string, ip: string): string {
  return ['rate_limit', rule, 'network', ip].join(':')
}

function checkRateLimitWithMemory(
  policy: RateLimitBucketPolicy,
  nowMs: number
): BucketCheckResult {
  pruneFallbackStore(nowMs)

  const existing = dbFallbackStore.get(policy.bucketKey)

  if (!existing || nowMs >= existing.resetAtMs) {
    const nextBucket = {
      count: 1,
      resetAtMs: nowMs + policy.windowMs,
    }
    dbFallbackStore.set(policy.bucketKey, nextBucket)

    return {
      name: policy.name,
      bucketKey: policy.bucketKey,
      count: nextBucket.count,
      limit: policy.limit,
      resetAtMs: nextBucket.resetAtMs,
      allowed: true,
    }
  }

  existing.count += 1
  dbFallbackStore.set(policy.bucketKey, existing)

  return {
    name: policy.name,
    bucketKey: policy.bucketKey,
    count: existing.count,
    limit: policy.limit,
    resetAtMs: existing.resetAtMs,
    allowed: existing.count <= policy.limit,
  }
}

function finalizeRateLimitResult(
  rule: string,
  ip: string,
  identity: string | undefined,
  nowMs: number,
  results: BucketCheckResult[],
  logger: Logger
): RateLimitResult {
  const blockedResults = results.filter((result) => !result.allowed)

  if (blockedResults.length === 0) {
    return { allowed: true }
  }

  const retryAfterSeconds = blockedResults.reduce((maxRetryAfter, result) => {
    const seconds = Math.max(1, Math.ceil((result.resetAtMs - nowMs) / 1000))
    return Math.max(maxRetryAfter, seconds)
  }, 1)

  logger.warn(
    {
      action: 'request.rate_limited',
      rule,
      ip,
      identity,
      buckets: blockedResults.map((result) => ({
        name: result.name,
        bucketKey: result.bucketKey,
        count: result.count,
        limit: result.limit,
      })),
      retryAfterSeconds,
    },
    'Request rate limited'
  )

  return { allowed: false, retryAfterSeconds }
}

function pruneFallbackStore(nowMs: number): void {
  for (const [key, bucket] of dbFallbackStore.entries()) {
    if (nowMs >= bucket.resetAtMs) {
      dbFallbackStore.delete(key)
    }
  }

  if (dbFallbackStore.size > MAX_FALLBACK_KEYS) {
    const targetSize = Math.floor(MAX_FALLBACK_KEYS * 0.8)
    for (const [key] of dbFallbackStore.entries()) {
      dbFallbackStore.delete(key)
      if (dbFallbackStore.size <= targetSize) {
        break
      }
    }
  }
}

/**
 * Function: cleanupExpiredCounters
 *
 * Description: 清理过期的计数器（定时任务）
 *
 * Parameters:
 *   logger(Logger): Logger 实例
 *
 * Returns:
 *   Promise<number>: 清理的记录数
 */
export async function cleanupExpiredCounters(logger: Logger): Promise<number> {
  try {
    const repo = createRateLimitRepository()
    const count = await repo.cleanupExpiredCounters(new Date())

    if (count > 0) {
      logger.info(
        { action: 'rate_limit.cleanup', count },
        'Cleaned up expired rate limit counters'
      )
    }

    return count
  } catch (error) {
    logger.error(
      { err: error, action: 'rate_limit.cleanup_failed' },
      'Failed to cleanup expired counters'
    )
    return 0
  }
}

/**
 * Function: scheduleCleanup
 *
 * Description: 启动定时清理任务
 *
 * Parameters:
 *   logger(Logger): Logger 实例
 *   intervalMs(number): 清理间隔（默认 1 小时）
 *
 * Returns:
 *   NodeJS.Timeout: 定时器句柄
 */
export function scheduleCleanup(
  logger: Logger,
  intervalMs: number = 60 * 60 * 1000
): NodeJS.Timeout {
  return setInterval(() => {
    cleanupExpiredCounters(logger)
  }, intervalMs)
}
