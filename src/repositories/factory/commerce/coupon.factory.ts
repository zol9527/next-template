/**
 * Coupon Repositories
 *
 * @module repositories/factory/coupon
 * @description 优惠券相关的 Repository 工厂函数
 *
 * 包含:
 * - CouponRepository: 优惠券模板管理
 * - UserCouponRepository: 用户优惠券管理
 * - CouponRedemptionRepository: 优惠券核销记录
 */

import type { CouponRepository } from '@/plugins/ecommerce/repositories/interfaces/coupon.interface'
import type { UserCouponRepository } from '@/plugins/ecommerce/repositories/interfaces/coupon.interface'
import type { CouponRedemptionRepository } from '@/plugins/ecommerce/repositories/interfaces/coupon.interface'
import { createPrismaCouponRepository } from '@/plugins/ecommerce/repositories/prisma/coupon.repository'
import { createPrismaUserCouponRepository } from '@/plugins/ecommerce/repositories/prisma/coupon.repository'
import { createPrismaCouponRedemptionRepository } from '@/plugins/ecommerce/repositories/prisma/coupon.repository'
import { getProvider, PROVIDER_NAMES } from '../core/core.factory'

/**
 * Function: createCouponRepository
 *
 * Description: 创建优惠券仓库实例
 *
 * Parameters:
 *   无
 *
 * Returns:
 *   CouponRepository: 优惠券仓库实例
 */
export async function createCouponRepository(): Promise<CouponRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaCouponRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabaseCouponRepository } = await import(/* @vite-ignore */ '@/plugins/ecommerce/repositories/supabase/coupon.repository')
    return createSupabaseCouponRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}

/**
 * Function: createUserCouponRepository
 *
 * Description: 创建用户优惠券仓库实例
 *
 * Parameters:
 *   无
 *
 * Returns:
 *   UserCouponRepository: 用户优惠券仓库实例
 */
export async function createUserCouponRepository(): Promise<UserCouponRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaUserCouponRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabaseUserCouponRepository } = await import(/* @vite-ignore */ '@/plugins/ecommerce/repositories/supabase/coupon.repository')
    return createSupabaseUserCouponRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}

/**
 * Function: createCouponRedemptionRepository
 *
 * Description: 创建优惠券核销记录仓库实例
 *
 * Parameters:
 *   无
 *
 * Returns:
 *   CouponRedemptionRepository: 优惠券核销记录仓库实例
 */
export async function createCouponRedemptionRepository(): Promise<CouponRedemptionRepository> {
  const provider = getProvider()

  if (provider === PROVIDER_NAMES.PRISMA) {
    return createPrismaCouponRedemptionRepository()
  }

  if (provider === PROVIDER_NAMES.SUPABASE) {
    const { createSupabaseCouponRedemptionRepository } = await import(/* @vite-ignore */ '@/plugins/ecommerce/repositories/supabase/coupon.repository')
    return createSupabaseCouponRedemptionRepository()
  }

  throw new Error(`Unsupported database provider: ${provider}`)
}
