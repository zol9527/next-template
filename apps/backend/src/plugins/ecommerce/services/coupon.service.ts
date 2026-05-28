/**
 * Function: createCouponService
 *
 * Description: 创建优惠券服务，负责优惠券业务逻辑
 *
 * Parameters:
 *   deps(object): 依赖注入的 Repository
 *   ctx(ServiceContext): Service 上下文
 *
 * Returns:
 *   service(object): 优惠券服务对象
 */

import Decimal from 'decimal.js'
import type {
  CouponRepository,
  UserCouponRepository,
  CouponRedemptionRepository,
} from '@/plugins/ecommerce/repositories/interfaces/coupon.interface'
import type { ServiceContext } from '@/types/service/service-context'
import type { RepoContext } from '@/types/repo/repo-context'
import type {
  Coupon,
  UserCoupon,
  CouponRedemption,
  CouponStatus,
  UserCouponStatus,
  CouponType,
} from '@/plugins/ecommerce/contracts/coupons.dto'

// 配置 Decimal.js：设置精度和舍入模式
interface DecimalJsGlobal {
  set(config: { precision: number; rounding: number; toExpNeg: number; toExpPos: number }): void
}

;(Decimal as unknown as DecimalJsGlobal).set({
  precision: 28, // 足够用于金融计算
  rounding: 4, // ROUND_HALF_UP
  toExpNeg: -7, // 小于等于此值的指数将使用指数表示法
  toExpPos: 21,
})

export function createCouponService(
  deps: {
    coupons: CouponRepository
    userCoupons: UserCouponRepository
    redemptions: CouponRedemptionRepository
    // 可选：商品仓库，用于分类验证
    products?: {
      getProductById(ctx: RepoContext, params: { productId: string }): Promise<{ id: string; categoryId: string | null } | null>
    }
  },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  const repoCtx: RepoContext = {
    traceId: ctx.traceId,
    logger: ctx.logger.child({ layer: 'repository' }),
  }

  // ==================== 辅助函数 ====================

  /**
   * Function: compareDecimal
   *
   * Description: 比较两个 decimal 字符串
   *
   * Parameters:
   *   a(string): 第一个数
   *   b(string): 第二个数
   *
   * Returns:
   *   number: 1 表示 a > b, 0 表示 a === b, -1 表示 a < b
   */
  function compareDecimal(a: string, b: string): number {
    const decimalA = new Decimal(a)
    const decimalB = new Decimal(b)
    return decimalA.comparedTo(decimalB)
  }

  /**
   * Function: multiplyDecimal
   *
   * Description: 乘法运算（保留 2 位小数）
   *
   * Parameters:
   *   a(string): 被乘数
   *   b(number): 乘数
   *
   * Returns:
   *   string: 结果（decimal 字符串）
   */
  function multiplyDecimal(a: string, b: number): string {
    const decimalA = new Decimal(a)
    const decimalB = new Decimal(b)
    return decimalA.times(decimalB).toFixed(2)
  }

  /**
   * Function: subtractDecimal
   *
   * Description: 减法运算
   *
   * Parameters:
   *   a(string): 被减数
   *   b(string): 减数
   *
   * Returns:
   *   string: 结果（decimal 字符串）
   */
  function subtractDecimal(a: string, b: string): string {
    const decimalA = new Decimal(a)
    const decimalB = new Decimal(b)
    return decimalA.minus(decimalB).toFixed(2)
  }

  /**
   * Function: validateCategoryApplicability
   *
   * Description: 验证商品分类是否适用于优惠券
   *
   * Parameters:
   *   applicableCategoryIds(string[]): 适用的分类 ID 列表
   *   productId(string): 商品 ID
   *
   * Returns:
   *   Promise<boolean>: true 表示适用，false 表示不适用
   */
  async function validateCategoryApplicability(
    applicableCategoryIds: string[],
    productId: string,
  ): Promise<boolean> {
    // 如果没有指定分类限制，则全部适用
    if (applicableCategoryIds.length === 0) {
      return true
    }

    // 如果没有提供 products 仓库，跳过分类验证（向后兼容）
    if (!deps.products) {
      logger.warn({
        action: 'coupon_category_validation_skipped',
        reason: 'products repository not provided',
        productId,
      })
      return true
    }

    try {
      const product = await deps.products.getProductById(repoCtx, { productId })
      if (!product || !product.categoryId) {
        return false
      }
      return applicableCategoryIds.includes(product.categoryId)
    } catch (error) {
      logger.error({
        action: 'coupon_category_validation_failed',
        productId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      // 分类验证失败时不阻止使用优惠券（保守策略）
      return true
    }
  }

  return {
    // ==================== 优惠券模板管理 ====================

    /**
     * Function: listCoupons
     *
     * Description: 列出优惠券
     *
     * Parameters:
     *   params(object): 查询参数
     *
     * Returns:
     *   items: 优惠券列表
     *   nextCursor: 下一页游标
     */
    async listCoupons(params?: {
      limit?: number
      cursor?: string | null
      status?: CouponStatus
      type?: CouponType
      name?: string
    }): Promise<{ items: Coupon[]; nextCursor: string | null }> {
      logger.info({ action: 'list_coupons', params })

      return await deps.coupons.listCoupons(repoCtx, {
        limit: params?.limit,
        cursor: params?.cursor ?? null,
        status: params?.status,
        type: params?.type,
        name: params?.name,
      })
    },

    /**
     * Function: getCouponById
     *
     * Description: 根据 ID 获取优惠券
     *
     * Parameters:
     *   couponId(string): 优惠券 ID
     *
     * Returns:
     *   Coupon | null: 优惠券，不存在时返回 null
     */
    async getCouponById(couponId: string): Promise<Coupon | null> {
      logger.info({ action: 'get_coupon_by_id', couponId })

      return await deps.coupons.getCouponById(repoCtx, { id: couponId })
    },

    /**
     * Function: createCoupon
     *
     * Description: 创建优惠券
     *
     * Parameters:
     *   params(object): 优惠券数据
     *
     * Returns:
     *   Coupon: 创建后的优惠券
     */
    async createCoupon(params: {
      name: string
      description?: string | null
      type: CouponType
      status?: CouponStatus
      discountPercent?: string | null
      discountAmount?: string | null
      thresholdAmount?: string | null
      thresholdDiscount?: string | null
      giftProductId?: string | null
      minOrderAmount?: string | null
      maxDiscountAmount?: string | null
      perUserLimit?: number | null
      usageLimit?: number | null
      applicableProductIds?: string[]
      applicableCategoryIds?: string[]
      validFrom: Date
      validTo: Date
      createdBy: string
    }): Promise<Coupon> {
      logger.info({ action: 'create_coupon', name: params.name, type: params.type })

      return await deps.coupons.createCoupon(repoCtx, {
        name: params.name,
        description: params.description ?? null,
        type: params.type,
        status: params.status ?? 'draft',
        discountPercent: params.discountPercent ?? null,
        discountAmount: params.discountAmount ?? null,
        thresholdAmount: params.thresholdAmount ?? null,
        thresholdDiscount: params.thresholdDiscount ?? null,
        giftProductId: params.giftProductId ?? null,
        minOrderAmount: params.minOrderAmount ?? null,
        maxDiscountAmount: params.maxDiscountAmount ?? null,
        perUserLimit: params.perUserLimit ?? null,
        usageLimit: params.usageLimit ?? null,
        applicableProductIds: JSON.stringify(params.applicableProductIds ?? []),
        applicableCategoryIds: JSON.stringify(params.applicableCategoryIds ?? []),
        validFrom: params.validFrom,
        validTo: params.validTo,
        createdBy: params.createdBy,
      })
    },

    /**
     * Function: updateCoupon
     *
     * Description: 更新优惠券
     *
     * Parameters:
     *   params(object): 更新参数
     *
     * Returns:
     *   Coupon | null: 更新后的优惠券，不存在时返回 null
     */
    async updateCoupon(params: {
      couponId: string
      name?: string
      description?: string | null
      status?: CouponStatus
      discountPercent?: string | null
      discountAmount?: string | null
      thresholdAmount?: string | null
      thresholdDiscount?: string | null
      giftProductId?: string | null
      minOrderAmount?: string | null
      maxDiscountAmount?: string | null
      perUserLimit?: number | null
      usageLimit?: number | null
      applicableProductIds?: string[]
      applicableCategoryIds?: string[]
      validFrom?: Date
      validTo?: Date
      updatedBy?: string
    }): Promise<Coupon | null> {
      logger.info({ action: 'update_coupon', couponId: params.couponId })

      const data: Parameters<CouponRepository['updateCoupon']>[1] = { id: params.couponId }

      if (params.name !== undefined) data.name = params.name
      if (params.description !== undefined) data.description = params.description
      if (params.status !== undefined) data.status = params.status
      if (params.discountPercent !== undefined) data.discountPercent = params.discountPercent
      if (params.discountAmount !== undefined) data.discountAmount = params.discountAmount
      if (params.thresholdAmount !== undefined) data.thresholdAmount = params.thresholdAmount
      if (params.thresholdDiscount !== undefined) data.thresholdDiscount = params.thresholdDiscount
      if (params.giftProductId !== undefined) data.giftProductId = params.giftProductId
      if (params.minOrderAmount !== undefined) data.minOrderAmount = params.minOrderAmount
      if (params.maxDiscountAmount !== undefined) data.maxDiscountAmount = params.maxDiscountAmount
      if (params.perUserLimit !== undefined) data.perUserLimit = params.perUserLimit
      if (params.usageLimit !== undefined) data.usageLimit = params.usageLimit
      if (params.applicableProductIds !== undefined) data.applicableProductIds = JSON.stringify(params.applicableProductIds)
      if (params.applicableCategoryIds !== undefined) data.applicableCategoryIds = JSON.stringify(params.applicableCategoryIds)
      if (params.validFrom !== undefined) data.validFrom = params.validFrom
      if (params.validTo !== undefined) data.validTo = params.validTo
      if (params.updatedBy !== undefined) data.updatedBy = params.updatedBy

      return await deps.coupons.updateCoupon(repoCtx, data)
    },

    /**
     * Function: deleteCoupon
     *
     * Description: 删除优惠券
     *
     * Parameters:
     *   couponId(string): 优惠券 ID
     *
     * Returns:
     *   boolean: 是否删除成功
     */
    async deleteCoupon(couponId: string): Promise<boolean> {
      logger.info({ action: 'delete_coupon', couponId })

      return await deps.coupons.deleteCoupon(repoCtx, { id: couponId })
    },

    // ==================== 用户优惠券管理 ====================

    /**
     * Function: listMyCoupons
     *
     * Description: 获取我的优惠券列表
     *
     * Parameters:
     *   params(object): 查询参数
     *
     * Returns:
     *   items: 用户优惠券列表
     *   nextCursor: 下一页游标
     */
    async listMyCoupons(params: {
      userId: string
      limit?: number
      cursor?: string | null
      status?: UserCouponStatus
    }): Promise<{ items: UserCoupon[]; nextCursor: string | null }> {
      logger.info({ action: 'list_my_coupons', userId: params.userId })

      return await deps.userCoupons.listUserCoupons(repoCtx, {
        userId: params.userId,
        limit: params.limit,
        cursor: params.cursor ?? null,
        status: params.status,
      })
    },

    /**
     * Function: issueCouponToUsers
     *
     * Description: 向用户发放优惠券（批量操作）
     *
     * Parameters:
     *   params(object): 发放参数
     *
     * Returns:
     *   issued: 成功发放的数量
     *   failed: 失败的数量
     *   failures: 失败详情
     *
     * Note: 此方法不保证原子性。如果需要原子性，请使用支持事务的数据库实现，
     *       或在调用方实现补偿机制。部分失败是可接受的行为。
     */
    async issueCouponToUsers(params: {
      couponId: string
      userIds: string[]
      issuedBy: string
      expiresAt?: Date
    }): Promise<{ issued: number; failed: number; failures: Array<{ userId: string; reason: string }> }> {
      logger.info({ action: 'issue_coupon_to_users', couponId: params.couponId, userCount: params.userIds.length })

      const coupon = await deps.coupons.getCouponById(repoCtx, { id: params.couponId })
      if (!coupon) {
        throw new Error('Coupon not found')
      }

      const existingUserIds = await deps.userCoupons.getExistingUserIdsForCoupon(repoCtx, {
        couponId: params.couponId,
        userIds: params.userIds,
      })

      const usersToIssue = params.userIds.filter((userId) => !existingUserIds.has(userId))
      const failures: Array<{ userId: string; reason: string }> = []
      let issued = 0

      for (const userId of usersToIssue) {
        try {
          const result = await deps.userCoupons.createUserCouponIfNotExists(repoCtx, {
            couponId: params.couponId,
            userId,
            expiresAt: params.expiresAt ?? new Date(coupon.validTo),
            issuedBy: params.issuedBy,
          })

          if (result) {
            issued++
          } else {
            failures.push({ userId, reason: 'Already received' })
          }
        } catch (error) {
          logger.error({ action: 'issue_coupon_failed', userId, error: String(error) })
          failures.push({ userId, reason: 'Internal error' })
        }
      }

      for (const userId of existingUserIds) {
        failures.push({ userId, reason: 'Already received' })
      }

      logger.info({
        action: 'issue_coupon_to_users_complete',
        couponId: params.couponId,
        issued,
        failed: failures.length,
      })

      return { issued, failed: failures.length, failures }
    },

    // ==================== 优惠券计算与核销 ====================

    /**
     * Function: calculateDiscount
     *
     * Description: 计算优惠券折扣
     *
     * Parameters:
     *   params(object): 计算参数
     *
     * Returns:
     *   canUse: 是否可以使用
     *   reason: 不可使用的原因
     *   originalAmount: 原始金额
     *   discountAmount: 折扣金额
     *   finalAmount: 最终金额
     *   coupon: 优惠券信息
     */
    async calculateDiscount(params: {
      userCouponId: string
      userId: string
      productId: string
      originalAmount: string
    }): Promise<{
      canUse: boolean
      reason?: string
      originalAmount: string
      discountAmount: string
      finalAmount: string
      coupon: Coupon | null
    }> {
      logger.info({ action: 'calculate_discount', userCouponId: params.userCouponId })

      // 获取用户优惠券
      const userCoupon = await deps.userCoupons.getUserCouponById(repoCtx, { id: params.userCouponId })
      if (!userCoupon) {
        throw new Error('User coupon not found')
      }

      // 验证所有权
      if (userCoupon.userId !== params.userId) {
        return {
          canUse: false,
          reason: 'Coupons are not available',
          originalAmount: params.originalAmount,
          discountAmount: '0.00',
          finalAmount: params.originalAmount,
          coupon: null,
        }
      }

      // 验证状态
      if (userCoupon.status !== 'available') {
        return {
          canUse: false,
          reason: `Coupon status is ${userCoupon.status}`,
          originalAmount: params.originalAmount,
          discountAmount: '0.00',
          finalAmount: params.originalAmount,
          coupon: userCoupon.coupon!,
        }
      }

      // 验证有效期
      const now = new Date()
      const expiresAt = new Date(userCoupon.expiresAt)
      if (expiresAt < now) {
        return {
          canUse: false,
          reason: 'Coupon has expired',
          originalAmount: params.originalAmount,
          discountAmount: '0.00',
          finalAmount: params.originalAmount,
          coupon: userCoupon.coupon!,
        }
      }

      const coupon = userCoupon.coupon!

      // 验证优惠券状态
      if (coupon.status !== 'active') {
        return {
          canUse: false,
          reason: `Coupon status is ${coupon.status}`,
          originalAmount: params.originalAmount,
          discountAmount: '0.00',
          finalAmount: params.originalAmount,
          coupon,
        }
      }

      // 验证有效期
      const validFrom = new Date(coupon.validFrom)
      const validTo = new Date(coupon.validTo)
      if (now < validFrom || now > validTo) {
        return {
          canUse: false,
          reason: 'Coupon is not valid at this time',
          originalAmount: params.originalAmount,
          discountAmount: '0.00',
          finalAmount: params.originalAmount,
          coupon,
        }
      }

      // 验证使用限制
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return {
          canUse: false,
          reason: 'Coupon usage limit exceeded',
          originalAmount: params.originalAmount,
          discountAmount: '0.00',
          finalAmount: params.originalAmount,
          coupon,
        }
      }

      // 验证最低订单金额
      if (coupon.minOrderAmount && compareDecimal(params.originalAmount, coupon.minOrderAmount) < 0) {
        return {
          canUse: false,
          reason: `Minimum order amount is ${coupon.minOrderAmount}`,
          originalAmount: params.originalAmount,
          discountAmount: '0.00',
          finalAmount: params.originalAmount,
          coupon,
        }
      }

      // 验证适用范围
      const applicableProductIds: string[] = JSON.parse(coupon.applicableProductIds)
      const applicableCategoryIds: string[] = JSON.parse(coupon.applicableCategoryIds)

      if (applicableProductIds.length > 0 && !applicableProductIds.includes(params.productId)) {
        return {
          canUse: false,
          reason: 'Product is not applicable for this coupon',
          originalAmount: params.originalAmount,
          discountAmount: '0.00',
          finalAmount: params.originalAmount,
          coupon,
        }
      }

      // 验证分类适用性
      const categoryMatches = await validateCategoryApplicability(applicableCategoryIds, params.productId)
      if (!categoryMatches) {
        return {
          canUse: false,
          reason: 'Product category is not applicable for this coupon',
          originalAmount: params.originalAmount,
          discountAmount: '0.00',
          finalAmount: params.originalAmount,
          coupon,
        }
      }

      // 计算折扣
      let discountAmount = '0.00'

      switch (coupon.type) {
        case 'discount':
          // 折扣券（如 85 折）
          if (coupon.discountPercent) {
            const percent = new Decimal(coupon.discountPercent).div(100)
            const discountedAmount = multiplyDecimal(params.originalAmount, percent.toNumber())
            discountAmount = subtractDecimal(params.originalAmount, discountedAmount)
          }
          break

        case 'fixed_amount':
          // 固定金额券
          if (coupon.discountAmount) {
            discountAmount = coupon.discountAmount
          }
          break

        case 'threshold':
          // 满减券
          if (coupon.thresholdAmount && compareDecimal(params.originalAmount, coupon.thresholdAmount) >= 0) {
            discountAmount = coupon.thresholdDiscount ?? '0.00'
          } else {
            return {
              canUse: false,
              reason: `Order amount must be at least ${coupon.thresholdAmount}`,
              originalAmount: params.originalAmount,
              discountAmount: '0.00',
              finalAmount: params.originalAmount,
              coupon,
            }
          }
          break

        case 'gift':
          // 赠品券（不计算折扣，但允许使用）
          discountAmount = '0.00'
          break
      }

      // 应用最大折扣限制
      if (coupon.maxDiscountAmount && compareDecimal(discountAmount, coupon.maxDiscountAmount) > 0) {
        discountAmount = coupon.maxDiscountAmount
      }

      // 确保折扣不超过原始金额
      if (compareDecimal(discountAmount, params.originalAmount) > 0) {
        discountAmount = params.originalAmount
      }

      const finalAmount = subtractDecimal(params.originalAmount, discountAmount)

      return {
        canUse: true,
        originalAmount: params.originalAmount,
        discountAmount,
        finalAmount,
        coupon,
      }
    },

    /**
     * Function: redeemCoupon
     *
     * Description: 核销优惠券
     *
     * Parameters:
     *   params(object): 核销参数
     *
     * Returns:
     *   CouponRedemption: 核销记录
     */
    async redeemCoupon(params: {
      userCouponId: string
      userId: string
      productId: string
      originalAmount: string
      orderId?: string
    }): Promise<CouponRedemption> {
      logger.info({ action: 'redeem_coupon', userCouponId: params.userCouponId })

      const calculation = await this.calculateDiscount({
        userCouponId: params.userCouponId,
        userId: params.userId,
        productId: params.productId,
        originalAmount: params.originalAmount,
      })

      if (!calculation.canUse) {
        throw new Error(calculation.reason ?? 'Coupon cannot be used')
      }

      const redemption = await deps.redemptions.redeemAtomically(repoCtx, {
        userCouponId: params.userCouponId,
        userId: params.userId,
        couponId: calculation.coupon.id,
        orderId: params.orderId ?? null,
        originalAmount: calculation.originalAmount,
        discountAmount: calculation.discountAmount,
        finalAmount: calculation.finalAmount,
        giftProductId: calculation.coupon.giftProductId ?? null,
      })

      logger.info({ action: 'coupon_redeemed', redemptionId: redemption.id })

      return redemption
    },

    // ==================== 核销记录查询 ====================

    /**
     * Function: listRedemptions
     *
     * Description: 列出核销记录
     *
     * Parameters:
     *   params(object): 查询参数
     *
     * Returns:
     *   items: 核销记录列表
     *   nextCursor: 下一页游标
     */
    async listRedemptions(params?: {
      limit?: number
      cursor?: string | null
      couponId?: string
      userId?: string
      orderId?: string
      startDate?: Date
      endDate?: Date
      includeCount?: boolean
    }): Promise<{ items: CouponRedemption[]; nextCursor: string | null; totalCount?: number }> {
      logger.info({ action: 'list_redemptions', params })

      return await deps.redemptions.listRedemptions(repoCtx, {
        limit: params?.limit,
        cursor: params?.cursor ?? null,
        couponId: params?.couponId,
        userId: params?.userId,
        orderId: params?.orderId,
        startDate: params?.startDate,
        endDate: params?.endDate,
        includeCount: params?.includeCount,
      })
    },
  }
}

export type CouponService = ReturnType<typeof createCouponService>
