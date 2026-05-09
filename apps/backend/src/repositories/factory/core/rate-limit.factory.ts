/**
 * Rate Limit Factory
 *
 * Description: Rate Limit Repository 工厂函数
 */

import { createRateLimitRepository as createPrismaRateLimitRepository } from '@/repositories/prisma/core/rate-limit.repository'
import type { RateLimitRepository } from '@/repositories/interfaces/core/rate-limit.interface'
import { logger } from '@/lib/logger'

/**
 * Function: createRateLimitRepository
 *
 * Description: 创建 Rate Limit Repository 实例
 *
 * Returns:
 *   RateLimitRepository: Repository 实例
 */
export function createRateLimitRepository(): RateLimitRepository {
  return createPrismaRateLimitRepository(logger)
}
