/**
 * Repository Factory Core
 *
 * @module repositories/factory/core
 * @description 核心工具函数，提供动态加载 Repository 实现的能力
 *
 * 设计理念:
 * - 使用动态 import() 实现懒加载，避免循环依赖
 * - 根据 DATABASE_PROVIDER 环境变量选择底层实现
 * - 支持 supabase、prisma、memory 三种数据库提供商
 */

import { env } from '@/config'

export type DatabaseProvider = 'supabase' | 'prisma'

export function getDatabaseProvider(): DatabaseProvider {
  const provider = env.DATABASE_PROVIDER
  if (provider && (provider === 'supabase' || provider === 'prisma')) {
    return provider
  }
  return 'supabase'
}

/**
 * 获取当前配置的数据库提供商
 *
 * @returns DatabaseProvider - 当前数据库提供商
 *
 * @throws Error - 如果配置了不支持的提供商
 *
 * @example
 * ```typescript
 * const provider = getDatabaseProvider()
 * if (provider === 'supabase') {
 *   // 使用 Supabase 实现
 * }
 * ```
 */
export function getProvider(): ReturnType<typeof getDatabaseProvider> {
  return getDatabaseProvider()
}

/**
 * Provider 名称常量
 */
export const PROVIDER_NAMES = {
  SUPABASE: 'supabase' as const,
  PRISMA: 'prisma' as const,
} as const

/**
 * 验证 Provider 是否支持
 *
 * @param provider - 要验证的提供商
 * @returns boolean - 是否支持
 */
export function isProviderSupported(provider: string): provider is 'supabase' | 'prisma' {
  return provider === 'supabase' || provider === 'prisma'
}
