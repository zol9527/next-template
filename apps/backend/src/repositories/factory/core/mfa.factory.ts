/**
 * MFA Repository Factory
 *
 * Description: MFA Repository 工厂函数
 */

import type { MfaRepository } from '@/repositories/interfaces/core/mfa.interface'
import { createPrismaMfaRepository } from '@/repositories/prisma/core/mfa.repository'

/**
 * Function: createMfaRepository
 *
 * Description: 创建 MFA Repository 实例
 *
 * Returns:
 *   repository(MfaRepository): MFA Repository 实例
 */
export async function createMfaRepository(): Promise<MfaRepository> {
  // 根据数据库提供者选择实现
  // 当前只实现了 Prisma 版本
  return createPrismaMfaRepository()
}

/**
 * 默认导出工厂函数
 */
export default createMfaRepository
