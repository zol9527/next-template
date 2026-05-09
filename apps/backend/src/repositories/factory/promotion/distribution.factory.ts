/**
 * Commission & Distribution Repositories
 *
 * @module repositories/factory/distribution
 * @description 分销与佣金相关的 Repository 工厂函数
 *
 * 包含:
 * - CommissionRepository: 佣金记录管理
 * - PromoterRepository: 推广员管理
 * - PromoterCodeRepository: 推广码管理
 * - DistributionRepository: 分销关系管理
 */

import type { CommissionRepository } from '@/plugins/promotion/repositories/interfaces/commission.interface'
import type { PromoterRepository } from '@/plugins/promotion/repositories/interfaces/promoter.interface'
import type { PromoterCodeRepository } from '@/plugins/promotion/repositories/interfaces/promoter-code.interface'
import type { DistributionRepository } from '@/plugins/promotion/repositories/interfaces/distribution.interface'
import { createPrismaCommissionRepository } from '@/plugins/promotion/repositories/prisma/commission.repository'
import { createPrismaPromoterRepository } from '@/plugins/promotion/repositories/prisma/promoter.repository'
import { createPrismaPromoterCodeRepository } from '@/plugins/promotion/repositories/prisma/promoter-code.repository'
import { createPrismaDistributionRepository } from '@/plugins/promotion/repositories/prisma/distribution.repository'
import { getProvider, PROVIDER_NAMES } from '../core/core.factory'

/**
 * 创建佣金记录仓库实例
 *
 * @returns Promise<CommissionRepository> 佣金记录仓库实例
 */
export async function createCommissionRepository(): Promise<CommissionRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaCommissionRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabaseCommissionRepository } = await import(/* @vite-ignore */ '@/plugins/promotion/repositories/supabase/commission.repository')
    return createSupabaseCommissionRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}

/**
 * 创建推广员仓库实例
 *
 * @returns Promise<PromoterRepository> 推广员仓库实例
 */
export async function createPromoterRepository(): Promise<PromoterRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaPromoterRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabasePromoterRepository } = await import(/* @vite-ignore */ '@/plugins/promotion/repositories/supabase/promoter.repository')
    return createSupabasePromoterRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}

/**
 * 创建推广码仓库实例
 *
 * @returns Promise<PromoterCodeRepository> 推广码仓库实例
 */
export async function createPromoterCodeRepository(): Promise<PromoterCodeRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaPromoterCodeRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabasePromoterCodeRepository } = await import(/* @vite-ignore */ '@/plugins/promotion/repositories/supabase/promoter-code.repository')
    return createSupabasePromoterCodeRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}

/**
 * 创建分销关系仓库实例
 *
 * @returns Promise<DistributionRepository> 分销关系仓库实例
 */
export async function createDistributionRepository(): Promise<DistributionRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaDistributionRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabaseDistributionRepository } = await import(/* @vite-ignore */ '@/plugins/promotion/repositories/supabase/distribution.repository')
    return createSupabaseDistributionRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}
