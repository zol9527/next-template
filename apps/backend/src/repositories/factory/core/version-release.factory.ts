import type { VersionReleaseRepository } from '@/repositories/interfaces/core/version-release.repository.interface'
import { createPrismaVersionReleaseRepository } from '@/repositories/prisma/core/version-release.repository.prisma'
import { getProvider, PROVIDER_NAMES } from './core.factory'

/**
Function: createVersionReleaseRepository

Description: 创建版本发布记录仓储实例，根据配置选择数据库提供商

Parameters:

Returns:
	repository(Promise<VersionReleaseRepository>): VersionReleaseRepository 实例
*/
export async function createVersionReleaseRepository(): Promise<VersionReleaseRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaVersionReleaseRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabaseVersionReleaseRepository } = await import(
      /* @vite-ignore */
      '@/repositories/supabase/core/version-release.repository.supabase'
    )
    return createSupabaseVersionReleaseRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}
