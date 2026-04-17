/**
 * Admin Repository Factory
 *
 * Description: Admin Repository 工厂函数
 */

import type { AdminRepository } from '@/repositories/interfaces/core/admin-repository.interface'
import { createPrismaAdminRepository } from '@/repositories/prisma/core/admin-repository'

/**
 * Function: createAdminRepository
 *
 * Description: 创建 Admin Repository 实例
 *
 * Returns:
 *   repository(AdminRepository): Admin Repository 实例
 */
export async function createAdminRepository(): Promise<AdminRepository> {
  // 当前项目只使用 Prisma
  return createPrismaAdminRepository()
}

/**
 * 默认导出工厂函数
 */
export default createAdminRepository
