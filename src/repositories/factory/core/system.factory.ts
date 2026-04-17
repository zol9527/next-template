/**
 * System Repositories
 *
 * @module repositories/factory/system
 * @description 系统管理相关的 Repository 工厂函数
 *
 * 包含:
 * - SystemSettingsRepository: 系统设置
 */

import type { SystemSettingsRepository } from '@/repositories/interfaces/core/system-settings.interface'
import { createPrismaSystemSettingsRepository } from '@/repositories/prisma/core/system-settings.repository'
import { getProvider, PROVIDER_NAMES } from './core.factory'

export async function createSystemSettingsRepository(): Promise<SystemSettingsRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaSystemSettingsRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabaseSystemSettingsRepository } = await import(/* @vite-ignore */ '@/repositories/supabase/core/system-settings.repository')
    return createSupabaseSystemSettingsRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}
