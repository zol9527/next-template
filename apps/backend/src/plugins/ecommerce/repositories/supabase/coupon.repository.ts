/**
 * Function: createSupabaseCouponRepository
 *
 * Description: 创建基于 Supabase（Service Role）的优惠券数据仓储实现
 *
 * Parameters:
 *   无
 *
 * Returns:
 *   CouponRepository: 优惠券 Repository 的 Supabase 实现
 */

import type {
  CouponRepository,
  UserCouponRepository,
  CouponRedemptionRepository,
} from '@/plugins/ecommerce/repositories/interfaces/coupon.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import type { Coupon, UserCoupon, CouponRedemption, CouponStatus, CouponType, UserCouponStatus } from '@/plugins/ecommerce/contracts/coupons.dto'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/client'

// ==================== 类型映射函数 ====================

function toDecimalString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  return typeof value === 'string' ? value : String(value)
}

function mapCoupon(row: Record<string, unknown>): Coupon {
  const allowedTypes: readonly string[] = ['discount', 'fixed_amount', 'threshold', 'gift']
  const allowedStatuses: readonly string[] = ['draft', 'scheduled', 'active', 'paused', 'expired', 'disabled']

  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    type: (allowedTypes.includes(row.type as string) ? row.type : 'discount') as CouponType,
    status: (allowedStatuses.includes(row.status as string) ? row.status : 'draft') as CouponStatus,
    discountPercent: toDecimalString(row.discount_percent),
    discountAmount: toDecimalString(row.discount_amount),
    thresholdAmount: toDecimalString(row.threshold_amount),
    thresholdDiscount: toDecimalString(row.threshold_discount),
    giftProductId: row.gift_product_id as string | null,
    minOrderAmount: toDecimalString(row.min_order_amount),
    maxDiscountAmount: toDecimalString(row.max_discount_amount),
    perUserLimit: row.per_user_limit as number | null,
    usageLimit: row.usage_limit as number | null,
    usedCount: row.used_count as number,
    applicableProductIds: row.applicable_product_ids as string,
    applicableCategoryIds: row.applicable_category_ids as string,
    validFrom: (row.valid_from as Date).toISOString(),
    validTo: (row.valid_to as Date).toISOString(),
    createdBy: row.created_by as string | null,
    updatedBy: row.updated_by as string | null,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  }
}

function mapUserCoupon(row: Record<string, unknown>): UserCoupon {
  const allowedStatuses: readonly string[] = ['available', 'used', 'expired']

  const couponRow = row.coupon as Record<string, unknown> | undefined

  return {
    id: row.id as string,
    couponId: row.coupon_id as string,
    userId: row.user_id as string,
    status: (allowedStatuses.includes(row.status as string) ? row.status : 'available') as UserCouponStatus,
    usedAt: row.used_at ? (row.used_at as Date).toISOString() : null,
    redemptionId: row.redemption_id as string | null,
    expiresAt: (row.expires_at as Date).toISOString(),
    issuedBy: row.issued_by as string | null,
    issuedAt: (row.issued_at as Date).toISOString(),
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
    coupon: couponRow ? mapCoupon(couponRow) : undefined,
  }
}

function mapRedemption(row: Record<string, unknown>): CouponRedemption {
  const couponRow = row.coupon as Record<string, unknown> | undefined
  const userCouponRow = row.user_coupon as Record<string, unknown> | undefined

  return {
    id: row.id as string,
    couponId: row.coupon_id as string,
    userCouponId: row.user_coupon_id as string,
    userId: row.user_id as string,
    orderId: row.order_id as string | null,
    originalAmount: toDecimalString(row.original_amount) ?? '0',
    discountAmount: toDecimalString(row.discount_amount) ?? '0',
    finalAmount: toDecimalString(row.final_amount) ?? '0',
    giftProductId: row.gift_product_id as string | null,
    giftEntitlementId: row.gift_entitlement_id as string | null,
    redeemedAt: (row.redeemed_at as Date).toISOString(),
    createdAt: (row.created_at as Date).toISOString(),
    coupon: couponRow ? mapCoupon(couponRow) : undefined,
    userCoupon: userCouponRow ? mapUserCoupon(userCouponRow) : undefined,
  }
}

// ==================== Coupon Repository ====================

export function createSupabaseCouponRepository(): CouponRepository {
  const supabase = createSupabaseServiceRoleClient()

  return {
    async getCouponById(ctx: RepoContext, params: { id: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_coupon_by_id', couponId: params.id })

      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('id', params.id)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return mapCoupon(data as unknown as Record<string, unknown>)
    },

    async listCoupons(ctx: RepoContext, params) {
      const { logger } = ctx
      const safeLimit = Math.max(1, Math.min(params.limit ?? 20, 50))

      logger.info({ action: 'list_coupons', limit: safeLimit, cursor: params.cursor })

      let query = supabase
        .from('coupons')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (params.status) query = query.eq('status', params.status)
      if (params.type) query = query.eq('type', params.type)
      if (params.name) query = query.ilike('name', `%${params.name}%`)

      if (params.cursor) {
        // 获取当前游标对应的记录以确定分页位置
        const { data: cursorData } = await supabase.from('coupons').select('created_at').eq('id', params.cursor).maybeSingle()
        if (cursorData) {
          query = query.lt('created_at', cursorData.created_at)
        }
      }

      const { data, error, count } = await query.limit(safeLimit + 1)

      if (error) throw error

      const coupons = data as unknown as Array<Record<string, unknown>>
      let nextCursor: string | null = null

      if (coupons.length > safeLimit) {
        const nextItem = coupons.pop()
        nextCursor = nextItem?.id as string | null
      }

      return {
        items: coupons.map(mapCoupon),
        nextCursor,
        totalCount: count ?? 0,
      }
    },

    async createCoupon(ctx: RepoContext, params) {
      const { logger } = ctx
      logger.info({ action: 'create_coupon', name: params.name, type: params.type })

      const { data, error } = await supabase
        .from('coupons')
        .insert({
          name: params.name,
          description: params.description ?? null,
          type: params.type,
          status: params.status,
          discount_percent: params.discountPercent ? String(params.discountPercent) : null,
          discount_amount: params.discountAmount ? String(params.discountAmount) : null,
          threshold_amount: params.thresholdAmount ? String(params.thresholdAmount) : null,
          threshold_discount: params.thresholdDiscount ? String(params.thresholdDiscount) : null,
          gift_product_id: params.giftProductId ?? null,
          min_order_amount: params.minOrderAmount ? String(params.minOrderAmount) : null,
          max_discount_amount: params.maxDiscountAmount ? String(params.maxDiscountAmount) : null,
          per_user_limit: params.perUserLimit,
          usage_limit: params.usageLimit,
          applicable_product_ids: params.applicableProductIds,
          applicable_category_ids: params.applicableCategoryIds,
          valid_from: params.validFrom,
          valid_to: params.validTo,
          created_by: params.createdBy ?? null,
        })
        .select('*')
        .single()

      if (error) throw error

      return mapCoupon(data as unknown as Record<string, unknown>)
    },

    async updateCoupon(ctx: RepoContext, params) {
      const { logger } = ctx
      logger.info({ action: 'update_coupon', couponId: params.id })

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (params.name !== undefined) updates.name = params.name
      if (params.description !== undefined) updates.description = params.description
      if (params.status !== undefined) updates.status = params.status
      if (params.discountPercent !== undefined) updates.discount_percent = params.discountPercent ? String(params.discountPercent) : null
      if (params.discountAmount !== undefined) updates.discount_amount = params.discountAmount ? String(params.discountAmount) : null
      if (params.thresholdAmount !== undefined) updates.threshold_amount = params.thresholdAmount ? String(params.thresholdAmount) : null
      if (params.thresholdDiscount !== undefined) updates.threshold_discount = params.thresholdDiscount ? String(params.thresholdDiscount) : null
      if (params.giftProductId !== undefined) updates.gift_product_id = params.giftProductId
      if (params.minOrderAmount !== undefined) updates.min_order_amount = params.minOrderAmount ? String(params.minOrderAmount) : null
      if (params.maxDiscountAmount !== undefined) updates.max_discount_amount = params.maxDiscountAmount ? String(params.maxDiscountAmount) : null
      if (params.perUserLimit !== undefined) updates.per_user_limit = params.perUserLimit
      if (params.usageLimit !== undefined) updates.usage_limit = params.usageLimit
      if (params.applicableProductIds !== undefined) updates.applicable_product_ids = params.applicableProductIds
      if (params.applicableCategoryIds !== undefined) updates.applicable_category_ids = params.applicableCategoryIds
      if (params.validFrom !== undefined) updates.valid_from = params.validFrom
      if (params.validTo !== undefined) updates.valid_to = params.validTo
      if (params.updatedBy !== undefined) updates.updated_by = params.updatedBy

      const { data, error } = await supabase
        .from('coupons')
        .update(updates)
        .eq('id', params.id)
        .select('*')
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return mapCoupon(data as unknown as Record<string, unknown>)
    },

    async deleteCoupon(ctx: RepoContext, params: { id: string }) {
      const { logger } = ctx
      logger.info({ action: 'delete_coupon', couponId: params.id })

      const { error } = await supabase.from('coupons').delete().eq('id', params.id)

      if (error) throw error
      return true
    },

    async incrementUsedCount(ctx: RepoContext, params: { id: string }) {
      const { logger } = ctx
      logger.info({ action: 'increment_used_count', couponId: params.id })

      // 先获取当前使用的次数
      const { data: current, error: fetchError } = await supabase
        .from('coupons')
        .select('used_count')
        .eq('id', params.id)
        .maybeSingle()

      if (fetchError) throw fetchError
      if (!current) return null

      const newUsedCount = (current.used_count as number) + 1

      const { data, error } = await supabase
        .from('coupons')
        .update({
          used_count: newUsedCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id)
        .select('*')
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return mapCoupon(data as unknown as Record<string, unknown>)
    },

    async getExpiredCoupons(ctx: RepoContext, params: { now: Date }) {
      const { logger } = ctx
      logger.info({ action: 'get_expired_coupons', now: params.now })

      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('status', 'active')
        .lt('valid_to', params.now.toISOString())

      if (error) throw error

      return (data as unknown as Array<Record<string, unknown>>).map(mapCoupon)
    },
  }
}

// ==================== User Coupon Repository ====================

export function createSupabaseUserCouponRepository(): UserCouponRepository {
  const supabase = createSupabaseServiceRoleClient()

  return {
    async getUserCouponById(ctx: RepoContext, params: { id: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_user_coupon_by_id', userCouponId: params.id })

      const { data, error } = await supabase
        .from('user_coupons')
        .select('*, coupon:coupons(*)')
        .eq('id', params.id)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return mapUserCoupon(data as unknown as Record<string, unknown>)
    },

    async listUserCoupons(ctx: RepoContext, params) {
      const { logger } = ctx
      const safeLimit = Math.max(1, Math.min(params.limit ?? 20, 50))

      logger.info({ action: 'list_user_coupons', userId: params.userId, limit: safeLimit })

      let query = supabase
        .from('user_coupons')
        .select('*, coupon:coupons(*)', { count: 'exact' })
        .eq('user_id', params.userId)
        .order('created_at', { ascending: false })

      if (params.status) query = query.eq('status', params.status)

      if (params.cursor) {
        const { data: cursorData } = await supabase.from('user_coupons').select('created_at').eq('id', params.cursor).maybeSingle()
        if (cursorData) {
          query = query.lt('created_at', cursorData.created_at)
        }
      }

      const { data, error } = await query.limit(safeLimit + 1)

      if (error) throw error

      const userCoupons = data as unknown as Array<Record<string, unknown>>
      let nextCursor: string | null = null

      if (userCoupons.length > safeLimit) {
        const nextItem = userCoupons.pop()
        nextCursor = nextItem?.id as string | null
      }

      return {
        items: userCoupons.map(mapUserCoupon),
        nextCursor,
      }
    },

    async listUserCouponsForAdmin(ctx: RepoContext, params) {
      const { logger } = ctx
      const safeLimit = Math.max(1, Math.min(params.limit ?? 20, 50))

      logger.info({ action: 'list_user_coupons_admin', limit: safeLimit })

      let query = supabase
        .from('user_coupons')
        .select('*, coupon:coupons(*)', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (params.couponId) query = query.eq('coupon_id', params.couponId)
      if (params.userId) query = query.eq('user_id', params.userId)
      if (params.status) query = query.eq('status', params.status)

      if (params.cursor) {
        const { data: cursorData } = await supabase.from('user_coupons').select('created_at').eq('id', params.cursor).maybeSingle()
        if (cursorData) {
          query = query.lt('created_at', cursorData.created_at)
        }
      }

      const { data, error } = await query.limit(safeLimit + 1)

      if (error) throw error

      const userCoupons = data as unknown as Array<Record<string, unknown>>
      let nextCursor: string | null = null

      if (userCoupons.length > safeLimit) {
        const nextItem = userCoupons.pop()
        nextCursor = nextItem?.id as string | null
      }

      return {
        items: userCoupons.map(mapUserCoupon),
        nextCursor,
      }
    },

    async createUserCoupon(ctx: RepoContext, params) {
      const { logger } = ctx
      logger.info({ action: 'create_user_coupon', couponId: params.couponId, userId: params.userId })

      const { data, error } = await supabase
        .from('user_coupons')
        .insert({
          coupon_id: params.couponId,
          user_id: params.userId,
          status: 'available',
          expires_at: params.expiresAt,
          issued_by: params.issuedBy ?? null,
        })
        .select('*, coupon:coupons(*)')
        .single()

      if (error) throw error

      return mapUserCoupon(data as unknown as Record<string, unknown>)
    },

    async getUserCouponByCouponAndUser(ctx: RepoContext, params: { couponId: string; userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_user_coupon_by_coupon_and_user', couponId: params.couponId, userId: params.userId })

      const { data, error } = await supabase
        .from('user_coupons')
        .select('*, coupon:coupons(*)')
        .eq('coupon_id', params.couponId)
        .eq('user_id', params.userId)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return mapUserCoupon(data as unknown as Record<string, unknown>)
    },

    async countUserCouponsByCouponAndUser(ctx: RepoContext, params: { couponId: string; userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'count_user_coupons_by_coupon_and_user', couponId: params.couponId, userId: params.userId })

      const { count, error } = await supabase
        .from('user_coupons')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', params.couponId)
        .eq('user_id', params.userId)

      if (error) throw error
      return count ?? 0
    },

    async createUserCouponIfNotExists(ctx: RepoContext, params) {
      const { logger } = ctx
      logger.info({ action: 'create_user_coupon_if_not_exists', couponId: params.couponId, userId: params.userId })

      const { data, error } = await supabase
        .from('user_coupons')
        .upsert(
          {
            coupon_id: params.couponId,
            user_id: params.userId,
            status: 'available',
            expires_at: params.expiresAt.toISOString(),
            issued_by: params.issuedBy ?? null,
          },
          {
            onConflict: 'coupon_id,user_id',
            ignoreDuplicates: true,
          }
        )
        .select('*, coupon:coupons(*)')
        .maybeSingle()

      if (error) throw error

      if (!data) {
        logger.info({ action: 'create_user_coupon_duplicate', couponId: params.couponId, userId: params.userId })
        return null
      }

      return mapUserCoupon(data as unknown as Record<string, unknown>)
    },

    async markAsUsed(ctx: RepoContext, params: { id: string; redemptionId: string; usedAt: Date }) {
      const { logger } = ctx
      logger.info({ action: 'mark_user_coupon_as_used', userCouponId: params.id })

      const { data, error } = await supabase
        .from('user_coupons')
        .update({
          status: 'used',
          used_at: params.usedAt,
          redemption_id: params.redemptionId,
        })
        .eq('id', params.id)
        .select('*, coupon:coupons(*)')
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return mapUserCoupon(data as unknown as Record<string, unknown>)
    },

    async getExpiredUserCoupons(ctx: RepoContext, params: { now: Date }) {
      const { logger } = ctx
      logger.info({ action: 'get_expired_user_coupons', now: params.now })

      const { data, error } = await supabase
        .from('user_coupons')
        .select('*, coupon:coupons(*)')
        .eq('status', 'available')
        .lt('expires_at', params.now.toISOString())

      if (error) throw error

      return (data as unknown as Array<Record<string, unknown>>).map(mapUserCoupon)
    },

    async getExistingUserIdsForCoupon(ctx: RepoContext, params: { couponId: string; userIds: string[] }) {
      const { logger } = ctx
      logger.info({ action: 'get_existing_user_ids_for_coupon', couponId: params.couponId, userCount: params.userIds.length })

      const { data, error } = await supabase
        .from('user_coupons')
        .select('user_id')
        .eq('coupon_id', params.couponId)
        .in('user_id', params.userIds)

      if (error) throw error

      return new Set((data as unknown as Array<{ user_id: string }>).map((row) => row.user_id))
    },
  }
}

// ==================== Coupon Redemption Repository ====================

export function createSupabaseCouponRedemptionRepository(): CouponRedemptionRepository {
  const supabase = createSupabaseServiceRoleClient()

  return {
    async getRedemptionById(ctx: RepoContext, params: { id: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_redemption_by_id', redemptionId: params.id })

      const { data, error } = await supabase
        .from('coupon_redemptions')
        .select('*, coupon:coupons(*), user_coupon:user_coupons(*)')
        .eq('id', params.id)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return mapRedemption(data as unknown as Record<string, unknown>)
    },

    async getRedemptionByUserCouponId(ctx: RepoContext, params: { userCouponId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_redemption_by_user_coupon_id', userCouponId: params.userCouponId })

      const { data, error } = await supabase
        .from('coupon_redemptions')
        .select('*, coupon:coupons(*), user_coupon:user_coupons(*)')
        .eq('user_coupon_id', params.userCouponId)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return mapRedemption(data as unknown as Record<string, unknown>)
    },

    async listRedemptions(ctx: RepoContext, params) {
      const { logger } = ctx
      const safeLimit = Math.max(1, Math.min(params.limit ?? 20, 50))

      logger.info({ action: 'list_redemptions', limit: safeLimit })

      // 仅在明确请求时才获取 count（避免无筛选条件时的全表扫描）
      const includeCount = params.includeCount ?? false

      let query = supabase
        .from('coupon_redemptions')
        .select('*, coupon:coupons(*), user_coupon:user_coupons(*)', includeCount ? { count: 'exact' } : undefined)
        .order('redeemed_at', { ascending: false })

      if (params.couponId) query = query.eq('coupon_id', params.couponId)
      if (params.userId) query = query.eq('user_id', params.userId)
      if (params.orderId) query = query.eq('order_id', params.orderId)
      if (params.startDate) query = query.gte('redeemed_at', params.startDate.toISOString())
      if (params.endDate) query = query.lte('redeemed_at', params.endDate.toISOString())

      if (params.cursor) {
        const { data: cursorData } = await supabase.from('coupon_redemptions').select('redeemed_at').eq('id', params.cursor).maybeSingle()
        if (cursorData) {
          query = query.lt('redeemed_at', cursorData.redeemed_at)
        }
      }

      const { data, error, count } = await query.limit(safeLimit + 1)

      if (error) throw error

      const redemptions = data as unknown as Array<Record<string, unknown>>
      let nextCursor: string | null = null

      if (redemptions.length > safeLimit) {
        const nextItem = redemptions.pop()
        nextCursor = nextItem?.id as string | null
      }

      return {
        items: redemptions.map(mapRedemption),
        nextCursor,
        totalCount: count ?? undefined,
      }
    },

    async createRedemption(ctx: RepoContext, params) {
      const { logger } = ctx
      logger.info({ action: 'create_redemption', couponId: params.couponId, userCouponId: params.userCouponId })

      const { data, error } = await supabase
        .from('coupon_redemptions')
        .insert({
          coupon_id: params.couponId,
          user_coupon_id: params.userCouponId,
          user_id: params.userId,
          order_id: params.orderId ?? null,
          original_amount: String(params.originalAmount),
          discount_amount: String(params.discountAmount),
          final_amount: String(params.finalAmount),
          gift_product_id: params.giftProductId ?? null,
          gift_entitlement_id: params.giftEntitlementId ?? null,
        })
        .select('*, coupon:coupons(*), user_coupon:user_coupons(*)')
        .single()

      if (error) throw error

      return mapRedemption(data as unknown as Record<string, unknown>)
    },

    async updateRedemption(ctx: RepoContext, params: { id: string; orderId?: string | null; giftEntitlementId?: string | null }) {
      const { logger } = ctx
      logger.info({ action: 'update_redemption', redemptionId: params.id })

      const updates: Record<string, unknown> = {}

      if (params.orderId !== undefined) updates.order_id = params.orderId
      if (params.giftEntitlementId !== undefined) updates.gift_entitlement_id = params.giftEntitlementId

      const { data, error } = await supabase
        .from('coupon_redemptions')
        .update(updates)
        .eq('id', params.id)
        .select('*, coupon:coupons(*), user_coupon:user_coupons(*)')
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return mapRedemption(data as unknown as Record<string, unknown>)
    },

    async countRedemptionsByCoupon(ctx: RepoContext, params: { couponId: string }) {
      const { logger } = ctx
      logger.info({ action: 'count_redemptions_by_coupon', couponId: params.couponId })

      const { count, error } = await supabase
        .from('coupon_redemptions')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', params.couponId)

      if (error) throw error
      return count ?? 0
    },

    async redeemAtomically(ctx: RepoContext, params) {
      const { logger } = ctx
      logger.info({ action: 'redeem_atomically', userCouponId: params.userCouponId, couponId: params.couponId })

      const { data: updateData, error: updateError } = await supabase
        .from('user_coupons')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
        })
        .eq('id', params.userCouponId)
        .eq('user_id', params.userId)
        .eq('status', 'available')
        .select()
        .maybeSingle()

      if (updateError) throw updateError
      if (!updateData) {
        throw new Error('Coupon already redeemed or not available')
      }

      const { data: redemptionData, error: redemptionError } = await supabase
        .from('coupon_redemptions')
        .insert({
          coupon_id: params.couponId,
          user_coupon_id: params.userCouponId,
          user_id: params.userId,
          order_id: params.orderId ?? null,
          original_amount: String(params.originalAmount),
          discount_amount: String(params.discountAmount),
          final_amount: String(params.finalAmount),
          gift_product_id: params.giftProductId ?? null,
        })
        .select('*, coupon:coupons(*), user_coupon:user_coupons(*)')
        .maybeSingle()

      if (redemptionError) throw redemptionError
      if (!redemptionData) throw new Error('Failed to create redemption record')

      await supabase
        .from('user_coupons')
        .update({ redemption_id: redemptionData.id })
        .eq('id', params.userCouponId)

      await supabase.rpc('increment_coupon_used_count', { coupon_id: params.couponId })

      return mapRedemption(redemptionData as unknown as Record<string, unknown>)
    },
  }
}
