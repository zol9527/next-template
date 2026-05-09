/**
 * MFA Policy Repository Factory
 *
 * Description: MFA Policy Repository 工厂函数，提供单例模式管理
 */

import type { MfaPolicyRepository } from '@/repositories/interfaces/core/mfa-policy.interface'
import { createPrismaMfaPolicyRepository } from '@/repositories/prisma/core/mfa-policy.repository'

/**
 * Type: MfaPolicyRepositoryFactory
 *
 * Description: MFA Policy Repository 工厂类型定义
 */
type MfaPolicyRepositoryFactory = {
  _instance: MfaPolicyRepository | null
}

/**
 * 缓存的 Repository 实例
 */
const factoryInstance: MfaPolicyRepositoryFactory = {
  _instance: null,
}

/**
 * Function: createMfaPolicyRepository
 *
 * Description: 创建或获取缓存的 MFA Policy Repository 实例
 *
 * Returns:
 *   repository(MfaPolicyRepository): MFA Policy Repository 实例
 *
 * Implementation:
 *   - 如果缓存中存在实例，直接返回缓存实例
 *   - 如果缓存中不存在，创建新的 PrismaMfaPolicyRepository 实例并缓存
 */
export function createMfaPolicyRepository(): MfaPolicyRepository {
  // 检查缓存实例是否存在
  if (factoryInstance._instance) {
    return factoryInstance._instance
  }

  // 创建新的 Repository 实例
  const repository = createPrismaMfaPolicyRepository()

  // 缓存实例以供后续使用
  factoryInstance._instance = repository

  return repository
}

/**
 * Function: resetMfaPolicyRepository
 *
 * Description: 重置 MFA Policy Repository 缓存实例
 *
 * Implementation:
 *   - 主要用于测试场景，清除缓存的实例
 */
export function resetMfaPolicyRepository(): void {
  factoryInstance._instance = null
}

/**
 * 默认导出工厂函数
 */
export default createMfaPolicyRepository
