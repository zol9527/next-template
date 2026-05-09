/**
 * Function: createPrismaCouponRepository
 *
 * Description: 创建 Prisma 实现的优惠券 Repository
 *
 * Parameters:
 *   无
 *
 * Returns:
 *   CouponRepository: 优惠券 Repository 实例
 */

import { prisma } from '@/lib/prisma'
import type {
  CouponRepository,
  UserCouponRepository,
  CouponRedemptionRepository,
} from '@/plugins/ecommerce/repositories/interfaces/coupon.interface'
import type { RepoContext } from '@/types/repo/repo-context'
import type { Coupon, UserCoupon, CouponRedemption } from '@/plugins/ecommerce/contracts/coupons.dto'

// ==================== 类型映射函数 ====================

function mapCoupon(prismaCoupon: {
  id: string
  name: string
  description: string | null
  type: string
  status: string
  discountPercent: unknown
  discountAmount: unknown
  thresholdAmount: unknown
  thresholdDiscount: unknown
  giftProductId: string | null
  minOrderAmount: unknown
  maxDiscountAmount: unknown
  perUserLimit: number | null
  usageLimit: number | null
  usedCount: number
  applicableProductIds: string | null
  applicableCategoryIds: string | null
  validFrom: Date
  validTo: Date
  createdBy: string | null
  updatedBy: string | null
  createdAt: Date
  updatedAt: Date
}): Coupon {
  const allowedTypes: readonly string[] = ['discount', 'fixed_amount', 'threshold', 'gift']
  const allowedStatuses: readonly string[] = ['draft', 'scheduled', 'active', 'paused', 'expired', 'disabled']

  const toDecimalString = (value: unknown): string | null => {
    if (value === null || value === undefined) return null
    return typeof value === 'string' ? value : String(value)
  }

  return {
    id: prismaCoupon.id,
    name: prismaCoupon.name,
    description: prismaCoupon.description ?? null,
    type: (allowedTypes.includes(prismaCoupon.type) ? prismaCoupon.type : 'discount') as Coupon['type'],
    status: (allowedStatuses.includes(prismaCoupon.status) ? prismaCoupon.status : 'draft') as Coupon['status'],
    discountPercent: toDecimalString(prismaCoupon.discountPercent),
    discountAmount: toDecimalString(prismaCoupon.discountAmount),
    thresholdAmount: toDecimalString(prismaCoupon.thresholdAmount),
    thresholdDiscount: toDecimalString(prismaCoupon.thresholdDiscount),
    giftProductId: prismaCoupon.giftProductId ?? null,
    minOrderAmount: toDecimalString(prismaCoupon.minOrderAmount),
    maxDiscountAmount: toDecimalString(prismaCoupon.maxDiscountAmount),
    perUserLimit: prismaCoupon.perUserLimit,
    usageLimit: prismaCoupon.usageLimit,
    usedCount: prismaCoupon.usedCount,
    applicableProductIds: prismaCoupon.applicableProductIds ?? '[]',
    applicableCategoryIds: prismaCoupon.applicableCategoryIds ?? '[]',
    validFrom: prismaCoupon.validFrom.toISOString(),
    validTo: prismaCoupon.validTo.toISOString(),
    createdBy: prismaCoupon.createdBy ?? null,
    updatedBy: prismaCoupon.updatedBy ?? null,
    createdAt: prismaCoupon.createdAt.toISOString(),
    updatedAt: prismaCoupon.updatedAt.toISOString(),
  }
}

function mapUserCoupon(prismaUserCoupon: {
  id: string
  couponId: string
  userId: string
  status: string
  usedAt: Date | null
  redemptionId: string | null
  expiresAt: Date
  issuedBy: string | null
  issuedAt: Date
  createdAt: Date
  updatedAt: Date
  coupon?: {
    id: string
    name: string
    description: string | null
    type: string
    status: string
    discountPercent: unknown
    discountAmount: unknown
    thresholdAmount: unknown
    thresholdDiscount: unknown
    giftProductId: string | null
    minOrderAmount: unknown
    maxDiscountAmount: unknown
    perUserLimit: number | null
    usageLimit: number | null
    usedCount: number
    applicableProductIds: string | null
    applicableCategoryIds: string | null
    validFrom: Date
    validTo: Date
    createdBy: string | null
    updatedBy: string | null
    createdAt: Date
    updatedAt: Date
  } | null
}): UserCoupon {
  const allowedStatuses: readonly string[] = ['available', 'used', 'expired']

  return {
    id: prismaUserCoupon.id,
    couponId: prismaUserCoupon.couponId,
    userId: prismaUserCoupon.userId,
    status: (allowedStatuses.includes(prismaUserCoupon.status) ? prismaUserCoupon.status : 'available') as UserCoupon['status'],
    usedAt: prismaUserCoupon.usedAt?.toISOString() ?? null,
    redemptionId: prismaUserCoupon.redemptionId ?? null,
    expiresAt: prismaUserCoupon.expiresAt.toISOString(),
    issuedBy: prismaUserCoupon.issuedBy ?? null,
    issuedAt: prismaUserCoupon.issuedAt.toISOString(),
    createdAt: prismaUserCoupon.createdAt.toISOString(),
    updatedAt: prismaUserCoupon.updatedAt.toISOString(),
    coupon: prismaUserCoupon.coupon ? mapCoupon(prismaUserCoupon.coupon) : undefined,
  }
}

function mapRedemption(prismaRedemption: {
  id: string
  couponId: string
  userCouponId: string
  userId: string
  orderId: string | null
  originalAmount: unknown
  discountAmount: unknown
  finalAmount: unknown
  giftProductId: string | null
  giftEntitlementId: string | null
  redeemedAt: Date
  createdAt: Date
  coupon?: {
    id: string
    name: string
    description: string | null
    type: string
    status: string
    discountPercent: unknown
    discountAmount: unknown
    thresholdAmount: unknown
    thresholdDiscount: unknown
    giftProductId: string | null
    minOrderAmount: unknown
    maxDiscountAmount: unknown
    perUserLimit: number | null
    usageLimit: number | null
    usedCount: number
    applicableProductIds: string | null
    applicableCategoryIds: string | null
    validFrom: Date
    validTo: Date
    createdBy: string | null
    updatedBy: string | null
    createdAt: Date
    updatedAt: Date
  } | null
  userCoupon?: {
    id: string
    couponId: string
    userId: string
    status: string
    usedAt: Date | null
    redemptionId: string | null
    expiresAt: Date
    issuedBy: string | null
    issuedAt: Date
    createdAt: Date
    updatedAt: Date
  } | null
}): CouponRedemption {
  const toDecimalString = (value: unknown): string => {
    return typeof value === 'string' ? value : String(value)
  }

  return {
    id: prismaRedemption.id,
    couponId: prismaRedemption.couponId,
    userCouponId: prismaRedemption.userCouponId,
    userId: prismaRedemption.userId,
    orderId: prismaRedemption.orderId ?? null,
    originalAmount: toDecimalString(prismaRedemption.originalAmount),
    discountAmount: toDecimalString(prismaRedemption.discountAmount),
    finalAmount: toDecimalString(prismaRedemption.finalAmount),
    giftProductId: prismaRedemption.giftProductId ?? null,
    giftEntitlementId: prismaRedemption.giftEntitlementId ?? null,
    redeemedAt: prismaRedemption.redeemedAt.toISOString(),
    createdAt: prismaRedemption.createdAt.toISOString(),
    coupon: prismaRedemption.coupon ? mapCoupon(prismaRedemption.coupon) : undefined,
    userCoupon: prismaRedemption.userCoupon ? mapUserCoupon(prismaRedemption.userCoupon) : undefined,
  }
}

// ==================== Coupon Repository ====================

export function createPrismaCouponRepository(): CouponRepository {
  return {
    async getCouponById(ctx: RepoContext, params: { id: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_coupon_by_id', couponId: params.id })

      const coupon = await prisma.coupon.findUnique({
        where: { id: params.id },
      })

      return coupon ? mapCoupon(coupon) : null
    },

    async listCoupons(ctx: RepoContext, params) {
      const { logger } = ctx
      const safeLimit = Math.max(1, Math.min(params.limit ?? 20, 50))

      logger.info({ action: 'list_coupons', limit: safeLimit, cursor: params.cursor })

      const where: Record<string, unknown> = {}

      if (params.status) where.status = params.status
      if (params.type) where.type = params.type
      if (params.name) where.name = { contains: params.name }

      const [coupons, totalCount] = await Promise.all([
        prisma.coupon.findMany({
          where,
          take: safeLimit + 1,
          cursor: params.cursor ? { id: params.cursor } : undefined,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.coupon.count({ where }),
      ])

      let nextCursor: string | null = null
      if (coupons.length > safeLimit) {
        const nextItem = coupons.pop()
        nextCursor = nextItem!.id
      }

      return {
        items: coupons.map(mapCoupon),
        nextCursor,
        totalCount,
      }
    },

    async createCoupon(ctx: RepoContext, params) {
      const { logger } = ctx
      logger.info({ action: 'create_coupon', name: params.name, type: params.type })

      const coupon = await prisma.coupon.create({
        data: {
          name: params.name,
          description: params.description ?? null,
          type: params.type,
          status: params.status,
          discountPercent: params.discountPercent ? String(params.discountPercent) : null,
          discountAmount: params.discountAmount ? String(params.discountAmount) : null,
          thresholdAmount: params.thresholdAmount ? String(params.thresholdAmount) : null,
          thresholdDiscount: params.thresholdDiscount ? String(params.thresholdDiscount) : null,
          giftProductId: params.giftProductId ?? null,
          minOrderAmount: params.minOrderAmount ? String(params.minOrderAmount) : null,
          maxDiscountAmount: params.maxDiscountAmount ? String(params.maxDiscountAmount) : null,
          perUserLimit: params.perUserLimit,
          usageLimit: params.usageLimit,
          applicableProductIds: params.applicableProductIds,
          applicableCategoryIds: params.applicableCategoryIds,
          validFrom: params.validFrom,
          validTo: params.validTo,
          createdBy: params.createdBy ?? null,
        },
      })

      return mapCoupon(coupon)
    },

    async updateCoupon(ctx: RepoContext, params) {
      const { logger } = ctx
      logger.info({ action: 'update_coupon', couponId: params.id })

      const data: Record<string, unknown> = {}

      if (params.name !== undefined) data.name = params.name
      if (params.description !== undefined) data.description = params.description
      if (params.status !== undefined) data.status = params.status
      if (params.discountPercent !== undefined) data.discountPercent = params.discountPercent ? String(params.discountPercent) : null
      if (params.discountAmount !== undefined) data.discountAmount = params.discountAmount ? String(params.discountAmount) : null
      if (params.thresholdAmount !== undefined) data.thresholdAmount = params.thresholdAmount ? String(params.thresholdAmount) : null
      if (params.thresholdDiscount !== undefined) data.thresholdDiscount = params.thresholdDiscount ? String(params.thresholdDiscount) : null
      if (params.giftProductId !== undefined) data.giftProductId = params.giftProductId
      if (params.minOrderAmount !== undefined) data.minOrderAmount = params.minOrderAmount ? String(params.minOrderAmount) : null
      if (params.maxDiscountAmount !== undefined) data.maxDiscountAmount = params.maxDiscountAmount ? String(params.maxDiscountAmount) : null
      if (params.perUserLimit !== undefined) data.perUserLimit = params.perUserLimit
      if (params.usageLimit !== undefined) data.usageLimit = params.usageLimit
      if (params.applicableProductIds !== undefined) data.applicableProductIds = params.applicableProductIds
      if (params.applicableCategoryIds !== undefined) data.applicableCategoryIds = params.applicableCategoryIds
      if (params.validFrom !== undefined) data.validFrom = params.validFrom
      if (params.validTo !== undefined) data.validTo = params.validTo
      if (params.updatedBy !== undefined) data.updatedBy = params.updatedBy

      const coupon = await prisma.coupon.update({
        where: { id: params.id },
        data,
      })

      return mapCoupon(coupon)
    },

    async deleteCoupon(ctx: RepoContext, params: { id: string }) {
      const { logger } = ctx
      logger.info({ action: 'delete_coupon', couponId: params.id })

      try {
        await prisma.coupon.delete({
          where: { id: params.id },
        })
        return true
      } catch {
        return false
      }
    },

    async incrementUsedCount(ctx: RepoContext, params: { id: string }) {
      const { logger } = ctx
      logger.info({ action: 'increment_used_count', couponId: params.id })

      const coupon = await prisma.coupon.update({
        where: { id: params.id },
        data: {
          usedCount: { increment: 1 },
        },
      })

      return mapCoupon(coupon)
    },

    async getExpiredCoupons(ctx: RepoContext, params: { now: Date }) {
      const { logger } = ctx
      logger.info({ action: 'get_expired_coupons', now: params.now })

      const coupons = await prisma.coupon.findMany({
        where: {
          status: 'active',
          validTo: { lt: params.now },
        },
      })

      return coupons.map(mapCoupon)
    },
  }
}

// ==================== User Coupon Repository ====================

export function createPrismaUserCouponRepository(): UserCouponRepository {
  return {
    async getUserCouponById(ctx: RepoContext, params: { id: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_user_coupon_by_id', userCouponId: params.id })

      const userCoupon = await prisma.userCoupon.findUnique({
        where: { id: params.id },
        include: { coupon: true },
      })

      return userCoupon ? mapUserCoupon(userCoupon) : null
    },

    async listUserCoupons(ctx: RepoContext, params) {
      const { logger } = ctx
      const safeLimit = Math.max(1, Math.min(params.limit ?? 20, 50))

      logger.info({ action: 'list_user_coupons', userId: params.userId, limit: safeLimit })

      const where: Record<string, unknown> = { userId: params.userId }

      if (params.status) where.status = params.status

      const userCoupons = await prisma.userCoupon.findMany({
        where,
        take: safeLimit + 1,
        cursor: params.cursor ? { id: params.cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: { coupon: true },
      })

      let nextCursor: string | null = null
      if (userCoupons.length > safeLimit) {
        const nextItem = userCoupons.pop()
        nextCursor = nextItem!.id
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

      const where: Record<string, unknown> = {}

      if (params.couponId) where.couponId = params.couponId
      if (params.userId) where.userId = params.userId
      if (params.status) where.status = params.status

      const userCoupons = await prisma.userCoupon.findMany({
        where,
        take: safeLimit + 1,
        cursor: params.cursor ? { id: params.cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: { coupon: true },
      })

      let nextCursor: string | null = null
      if (userCoupons.length > safeLimit) {
        const nextItem = userCoupons.pop()
        nextCursor = nextItem!.id
      }

      return {
        items: userCoupons.map(mapUserCoupon),
        nextCursor,
      }
    },

    async createUserCoupon(ctx: RepoContext, params) {
      const { logger } = ctx
      logger.info({ action: 'create_user_coupon', couponId: params.couponId, userId: params.userId })

      const userCoupon = await prisma.userCoupon.create({
        data: {
          couponId: params.couponId,
          userId: params.userId,
          status: 'available',
          expiresAt: params.expiresAt,
          issuedBy: params.issuedBy ?? null,
        },
      })

      return mapUserCoupon(userCoupon)
    },

    async getUserCouponByCouponAndUser(ctx: RepoContext, params: { couponId: string; userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_user_coupon_by_coupon_and_user', couponId: params.couponId, userId: params.userId })

      const userCoupon = await prisma.userCoupon.findUnique({
        where: {
          couponId_userId: {
            couponId: params.couponId,
            userId: params.userId,
          },
        },
        include: { coupon: true },
      })

      return userCoupon ? mapUserCoupon(userCoupon) : null
    },

    async countUserCouponsByCouponAndUser(ctx: RepoContext, params: { couponId: string; userId: string }) {
      const { logger } = ctx
      logger.info({ action: 'count_user_coupons_by_coupon_and_user', couponId: params.couponId, userId: params.userId })

      return await prisma.userCoupon.count({
        where: {
          couponId: params.couponId,
          userId: params.userId,
        },
      })
    },

    async markAsUsed(ctx: RepoContext, params: { id: string; redemptionId: string; usedAt: Date }) {
      const { logger } = ctx
      logger.info({ action: 'mark_user_coupon_as_used', userCouponId: params.id })

      const userCoupon = await prisma.userCoupon.update({
        where: { id: params.id },
        data: {
          status: 'used',
          usedAt: params.usedAt,
          redemptionId: params.redemptionId,
        },
      })

      return mapUserCoupon(userCoupon)
    },

    async getExpiredUserCoupons(ctx: RepoContext, params: { now: Date }) {
      const { logger } = ctx
      logger.info({ action: 'get_expired_user_coupons', now: params.now })

      const userCoupons = await prisma.userCoupon.findMany({
        where: {
          status: 'available',
          expiresAt: { lt: params.now },
        },
      })

      return userCoupons.map(mapUserCoupon)
    },

    async createUserCouponIfNotExists(ctx: RepoContext, params) {
      const { logger } = ctx
      logger.info({ action: 'create_user_coupon_if_not_exists', couponId: params.couponId, userId: params.userId })

      try {
        const userCoupon = await prisma.userCoupon.create({
          data: {
            couponId: params.couponId,
            userId: params.userId,
            status: 'available',
            expiresAt: params.expiresAt,
            issuedBy: params.issuedBy ?? null,
          },
        })

        return mapUserCoupon(userCoupon)
      } catch (error) {
        const prismaError = error as { code?: string; meta?: { target?: string[] } }
        if (prismaError.code === 'P2002') {
          logger.info({ action: 'create_user_coupon_duplicate', couponId: params.couponId, userId: params.userId })
          return null
        }
        throw error
      }
    },

    async getExistingUserIdsForCoupon(ctx: RepoContext, params: { couponId: string; userIds: string[] }) {
      const { logger } = ctx
      logger.info({ action: 'get_existing_user_ids_for_coupon', couponId: params.couponId, userCount: params.userIds.length })

      const existingUserCoupons = await prisma.userCoupon.findMany({
        where: {
          couponId: params.couponId,
          userId: { in: params.userIds },
        },
        select: { userId: true },
      })

      return new Set(existingUserCoupons.map((uc) => uc.userId))
    },
  }
}

// ==================== Coupon Redemption Repository ====================

/**
 * Function: mapRedemptionLite
 *
 * Description: 轻量级核销记录映射函数（用于列表查询）
 *              只映射必要字段以提高性能
 *
 * Parameters:
 *   prismaRedemption: 从数据库查询出的精简核销记录数据
 *
 * Returns:
 *   CouponRedemption: 映射后的核销记录 DTO
 */
function mapRedemptionLite(prismaRedemption: {
  id: string
  couponId: string
  userCouponId: string
  userId: string
  orderId: string | null
  originalAmount: unknown
  discountAmount: unknown
  finalAmount: unknown
  giftProductId: string | null
  giftEntitlementId: string | null
  redeemedAt: Date
  createdAt: Date
  coupon?: {
    id: string
    name: string
    type: string
    status: string
  } | null
  userCoupon?: {
    id: string
    status: string
    expiresAt: Date
  } | null
}): CouponRedemption {
  const toDecimalString = (value: unknown): string => {
    return typeof value === 'string' ? value : String(value)
  }

  return {
    id: prismaRedemption.id,
    couponId: prismaRedemption.couponId,
    userCouponId: prismaRedemption.userCouponId,
    userId: prismaRedemption.userId,
    orderId: prismaRedemption.orderId ?? null,
    originalAmount: toDecimalString(prismaRedemption.originalAmount),
    discountAmount: toDecimalString(prismaRedemption.discountAmount),
    finalAmount: toDecimalString(prismaRedemption.finalAmount),
    giftProductId: prismaRedemption.giftProductId ?? null,
    giftEntitlementId: prismaRedemption.giftEntitlementId ?? null,
    redeemedAt: prismaRedemption.redeemedAt.toISOString(),
    createdAt: prismaRedemption.createdAt.toISOString(),
    // 为精简的 coupon 数据构建完整的 Coupon 对象
    coupon: prismaRedemption.coupon ? {
      id: prismaRedemption.coupon.id,
      name: prismaRedemption.coupon.name,
      description: null,
      type: prismaRedemption.coupon.type as Coupon['type'],
      status: prismaRedemption.coupon.status as Coupon['status'],
      discountPercent: null,
      discountAmount: null,
      thresholdAmount: null,
      thresholdDiscount: null,
      giftProductId: null,
      minOrderAmount: null,
      maxDiscountAmount: null,
      perUserLimit: null,
      usageLimit: null,
      usedCount: 0,
      applicableProductIds: '[]',
      applicableCategoryIds: '[]',
      validFrom: new Date().toISOString(),
      validTo: new Date().toISOString(),
      createdBy: null,
      updatedBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } : undefined,
    // 为精简的 userCoupon 数据构建完整的 UserCoupon 对象
    userCoupon: prismaRedemption.userCoupon ? {
      id: prismaRedemption.userCoupon.id,
      couponId: '',
      userId: '',
      status: prismaRedemption.userCoupon.status as UserCoupon['status'],
      usedAt: null,
      redemptionId: null,
      expiresAt: prismaRedemption.userCoupon.expiresAt.toISOString(),
      issuedBy: null,
      issuedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } : undefined,
  }
}

export function createPrismaCouponRedemptionRepository(): CouponRedemptionRepository {
  return {
    async getRedemptionById(ctx: RepoContext, params: { id: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_redemption_by_id', redemptionId: params.id })

      const redemption = await prisma.couponRedemption.findUnique({
        where: { id: params.id },
        include: { coupon: true, userCoupon: true },
      })

      return redemption ? mapRedemption(redemption) : null
    },

    async getRedemptionByUserCouponId(ctx: RepoContext, params: { userCouponId: string }) {
      const { logger } = ctx
      logger.info({ action: 'get_redemption_by_user_coupon_id', userCouponId: params.userCouponId })

      const redemption = await prisma.couponRedemption.findUnique({
        where: { userCouponId: params.userCouponId },
        include: { coupon: true, userCoupon: true },
      })

      return redemption ? mapRedemption(redemption) : null
    },

    async listRedemptions(ctx: RepoContext, params) {
      const { logger } = ctx
      const safeLimit = Math.max(1, Math.min(params.limit ?? 20, 50))

      logger.info({ action: 'list_redemptions', limit: safeLimit })

      const where: Record<string, unknown> = {}

      if (params.couponId) where.couponId = params.couponId
      if (params.userId) where.userId = params.userId
      if (params.orderId) where.orderId = params.orderId
      if (params.startDate || params.endDate) {
        where.redeemedAt = {}
        if (params.startDate) (where.redeemedAt as Record<string, unknown>).gte = params.startDate
        if (params.endDate) (where.redeemedAt as Record<string, unknown>).lte = params.endDate
      }

      // 性能优化：使用 select 只选择必要字段，避免加载大字段
      const [redemptions, totalCount] = await Promise.all([
        prisma.couponRedemption.findMany({
          where,
          take: safeLimit + 1,
          cursor: params.cursor ? { id: params.cursor } : undefined,
          orderBy: { redeemedAt: 'desc' },
          select: {
            id: true,
            couponId: true,
            userCouponId: true,
            userId: true,
            orderId: true,
            originalAmount: true,
            discountAmount: true,
            finalAmount: true,
            giftProductId: true,
            giftEntitlementId: true,
            redeemedAt: true,
            createdAt: true,
            // 只选择优惠券的必要字段，避免加载大字段
            coupon: {
              select: {
                id: true,
                name: true,
                type: true,
                status: true,
              },
            },
            // 只选择用户优惠券的必要字段
            userCoupon: {
              select: {
                id: true,
                status: true,
                expiresAt: true,
              },
            },
          },
        }),
        prisma.couponRedemption.count({ where }),
      ])

      let nextCursor: string | null = null
      if (redemptions.length > safeLimit) {
        const nextItem = redemptions.pop()
        nextCursor = nextItem!.id
      }

      return {
        items: redemptions.map(mapRedemptionLite),
        nextCursor,
        totalCount,
      }
    },

    async createRedemption(ctx: RepoContext, params) {
      const { logger } = ctx
      logger.info({ action: 'create_redemption', couponId: params.couponId, userCouponId: params.userCouponId })

      const redemption = await prisma.couponRedemption.create({
        data: {
          couponId: params.couponId,
          userCouponId: params.userCouponId,
          userId: params.userId,
          orderId: params.orderId ?? null,
          originalAmount: String(params.originalAmount),
          discountAmount: String(params.discountAmount),
          finalAmount: String(params.finalAmount),
          giftProductId: params.giftProductId ?? null,
          giftEntitlementId: params.giftEntitlementId ?? null,
        },
        include: { coupon: true, userCoupon: true },
      })

      return mapRedemption(redemption)
    },

    async updateRedemption(ctx: RepoContext, params: { id: string; orderId?: string | null; giftEntitlementId?: string | null }) {
      const { logger } = ctx
      logger.info({ action: 'update_redemption', redemptionId: params.id })

      const data: Record<string, unknown> = {}

      if (params.orderId !== undefined) data.orderId = params.orderId
      if (params.giftEntitlementId !== undefined) data.giftEntitlementId = params.giftEntitlementId

      const redemption = await prisma.couponRedemption.update({
        where: { id: params.id },
        data,
        include: { coupon: true, userCoupon: true },
      })

      return mapRedemption(redemption)
    },

    async countRedemptionsByCoupon(ctx: RepoContext, params: { couponId: string }) {
      const { logger } = ctx
      logger.info({ action: 'count_redemptions_by_coupon', couponId: params.couponId })

      return await prisma.couponRedemption.count({
        where: { couponId: params.couponId },
      })
    },

    async redeemAtomically(ctx: RepoContext, params) {
      const { logger } = ctx
      logger.info({ action: 'redeem_atomically', userCouponId: params.userCouponId, couponId: params.couponId })

      return prisma.$transaction(async (tx) => {
        const now = new Date()

        const updateResult = await tx.userCoupon.updateMany({
          where: {
            id: params.userCouponId,
            userId: params.userId,
            status: 'available',
          },
          data: {
            status: 'used',
            usedAt: now,
          },
        })

        if (updateResult.count === 0) {
          throw new Error('Coupon already redeemed or not available')
        }

        const redemption = await tx.couponRedemption.create({
          data: {
            couponId: params.couponId,
            userCouponId: params.userCouponId,
            userId: params.userId,
            orderId: params.orderId ?? null,
            originalAmount: String(params.originalAmount),
            discountAmount: String(params.discountAmount),
            finalAmount: String(params.finalAmount),
            giftProductId: params.giftProductId ?? null,
          },
          include: { coupon: true, userCoupon: true },
        })

        await tx.userCoupon.update({
          where: { id: params.userCouponId },
          data: { redemptionId: redemption.id },
        })

        await tx.coupon.update({
          where: { id: params.couponId },
          data: { usedCount: { increment: 1 } },
        })

        return mapRedemption(redemption)
      })
    },
  }
}
