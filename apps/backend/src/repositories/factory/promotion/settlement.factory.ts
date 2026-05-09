/**
 * Settlement Repositories
 *
 * @module repositories/factory/settlement
 * @description 结算相关的 Repository 工厂函数
 *
 * 包含:
 * - SettlementRepository: 结算单管理
 * - SettlementApplicationRepository: 结算申请管理
 */

import type { SettlementRepository } from '@/plugins/promotion/repositories/interfaces/settlement.interface'
import type { SettlementApplicationRepository } from '@/plugins/promotion/repositories/interfaces/settlement-application.interface'
import { createPrismaSettlementRepository } from '@/plugins/promotion/repositories/prisma/settlement.repository'
import { createPrismaSettlementApplicationRepository } from '@/plugins/promotion/repositories/prisma/settlement-application.repository'
import { getProvider, PROVIDER_NAMES } from '../core/core.factory'

export async function createSettlementRepository(): Promise<SettlementRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaSettlementRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabaseSettlementRepository } = await import(/* @vite-ignore */ '@/plugins/promotion/repositories/supabase/settlement.repository')
    return createSupabaseSettlementRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}

export async function createSettlementApplicationRepository(): Promise<SettlementApplicationRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaSettlementApplicationRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabaseSettlementApplicationRepository } = await import(/* @vite-ignore */ '@/plugins/promotion/repositories/supabase/settlement-application.repository')
    return createSupabaseSettlementApplicationRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}
