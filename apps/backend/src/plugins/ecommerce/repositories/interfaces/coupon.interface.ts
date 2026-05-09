/**
 * Function: CouponRepository
 *
 * Description: 优惠券 Repository 接口，定义优惠券数据访问契约
 */

import type { RepoContext } from '@/types/repo/repo-context'
import type { Coupon, CouponStatus, CouponType } from '@/plugins/ecommerce/contracts/coupons.dto'

export interface CouponRepository {
  /**
   * Description: 根据 ID 获取优惠券
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   id(uuid): 优惠券 ID
   *
   * Returns:
   *   Coupon | null: 优惠券对象，不存在时返回 null
   */
  getCouponById(ctx: RepoContext, params: { id: string }): Promise<Coupon | null>

  /**
   * Description: 列出优惠券（分页）
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 查询参数
   *
   * Returns:
   *   items: 优惠券列表
   *   nextCursor: 下一页游标
   */
  listCoupons(ctx: RepoContext, params: {
    limit?: number
    cursor?: string | null
    status?: CouponStatus
    type?: CouponType
    name?: string
  }): Promise<{ items: Coupon[]; nextCursor: string | null; totalCount: number }>

  /**
   * Description: 创建优惠券
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 优惠券数据
   *
   * Returns:
   *   Coupon: 创建后的优惠券
   */
  createCoupon(ctx: RepoContext, params: {
    name: string
    description?: string | null
    type: CouponType
    status: CouponStatus
    discountPercent?: string | null
    discountAmount?: string | null
    thresholdAmount?: string | null
    thresholdDiscount?: string | null
    giftProductId?: string | null
    minOrderAmount?: string | null
    maxDiscountAmount?: string | null
    perUserLimit?: number | null
    usageLimit?: number | null
    applicableProductIds: string
    applicableCategoryIds: string
    validFrom: Date
    validTo: Date
    createdBy?: string | null
  }): Promise<Coupon>

  /**
   * Description: 更新优惠券
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 更新参数
   *
   * Returns:
   *   Coupon | null: 更新后的优惠券，不存在时返回 null
   */
  updateCoupon(ctx: RepoContext, params: {
    id: string
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
    applicableProductIds?: string
    applicableCategoryIds?: string
    validFrom?: Date
    validTo?: Date
    updatedBy?: string | null
  }): Promise<Coupon | null>

  /**
   * Description: 删除优惠券
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 删除参数
   *
   * Returns:
   *   boolean: 是否删除成功
   */
  deleteCoupon(ctx: RepoContext, params: { id: string }): Promise<boolean>

  /**
   * Description: 增加优惠券已使用次数
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 更新参数
   *
   * Returns:
   *   Coupon | null: 更新后的优惠券，不存在时返回 null
   */
  incrementUsedCount(ctx: RepoContext, params: { id: string }): Promise<Coupon | null>

  /**
   * Description: 获取过期或即将过期的优惠券
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 查询参数
   *
   * Returns:
   *   Coupon[]: 优惠券列表
   */
  getExpiredCoupons(ctx: RepoContext, params: { now: Date }): Promise<Coupon[]>
}

/**
 * Function: UserCouponRepository
 *
 * Description: 用户优惠券 Repository 接口
 */
import type { UserCoupon, UserCouponStatus } from '@/plugins/ecommerce/contracts/coupons.dto'

export interface UserCouponRepository {
  /**
   * Description: 根据 ID 获取用户优惠券
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 查询参数
   *
   * Returns:
   *   UserCoupon | null: 用户优惠券，不存在时返回 null
   */
  getUserCouponById(ctx: RepoContext, params: { id: string }): Promise<UserCoupon | null>

  /**
   * Description: 列出用户的优惠券（分页）
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 查询参数
   *
   * Returns:
   *   items: 用户优惠券列表
   *   nextCursor: 下一页游标
   */
  listUserCoupons(ctx: RepoContext, params: {
    userId: string
    limit?: number
    cursor?: string | null
    status?: UserCouponStatus
  }): Promise<{ items: UserCoupon[]; nextCursor: string | null }>

  /**
   * Description: 列出用户优惠券（后台用，支持按优惠券筛选）
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 查询参数
   *
   * Returns:
   *   items: 用户优惠券列表
   *   nextCursor: 下一页游标
   */
  listUserCouponsForAdmin(ctx: RepoContext, params: {
    limit?: number
    cursor?: string | null
    couponId?: string
    userId?: string
    status?: UserCouponStatus
  }): Promise<{ items: UserCoupon[]; nextCursor: string | null }>

  /**
   * Description: 创建用户优惠券（发放）
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 用户优惠券数据
   *
   * Returns:
   *   UserCoupon: 创建后的用户优惠券
   */
  createUserCoupon(ctx: RepoContext, params: {
    couponId: string
    userId: string
    expiresAt: Date
    issuedBy?: string | null
  }): Promise<UserCoupon>

  /**
   * Description: 检查用户是否已领取某优惠券
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 查询参数
   *
   * Returns:
   *   UserCoupon | null: 用户优惠券，不存在时返回 null
   */
  getUserCouponByCouponAndUser(ctx: RepoContext, params: { couponId: string; userId: string }): Promise<UserCoupon | null>

  /**
   * Description: 统计用户已领取某优惠券的数量
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 查询参数
   *
   * Returns:
   *   number: 已领取数量
   */
  countUserCouponsByCouponAndUser(ctx: RepoContext, params: { couponId: string; userId: string }): Promise<number>

  /**
   * Description: 更新用户优惠券状态为已使用
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 更新参数
   *
   * Returns:
   *   UserCoupon | null: 更新后的用户优惠券，不存在时返回 null
   */
  markAsUsed(ctx: RepoContext, params: { id: string; redemptionId: string; usedAt: Date }): Promise<UserCoupon | null>

  /**
   * Description: 获取过期的用户优惠券
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 查询参数
   *
   * Returns:
   *   UserCoupon[]: 过期的用户优惠券列表
   */
  getExpiredUserCoupons(ctx: RepoContext, params: { now: Date }): Promise<UserCoupon[]>

  /**
   * Description: 原子性地创建用户优惠券（利用唯一约束防止重复发放）
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 用户优惠券数据
   *
   * Returns:
   *   UserCoupon: 创建成功返回用户优惠券
   *   null: 已存在（唯一约束冲突）时返回 null
   */
  createUserCouponIfNotExists(ctx: RepoContext, params: {
    couponId: string
    userId: string
    expiresAt: Date
    issuedBy?: string | null
  }): Promise<UserCoupon | null>

  /**
   * Description: 批量获取已存在用户优惠券的用户 ID（用于批量发放前的预检查）
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 查询参数
   *
   * Returns:
   *   Set<string>: 已存在该优惠券的用户 ID 集合
   */
  getExistingUserIdsForCoupon(ctx: RepoContext, params: {
    couponId: string
    userIds: string[]
  }): Promise<Set<string>>
}

/**
 * Function: CouponRedemptionRepository
 *
 * Description: 优惠券核销记录 Repository 接口
 */
import type { CouponRedemption } from '@/plugins/ecommerce/contracts/coupons.dto'

export interface CouponRedemptionRepository {
  /**
   * Description: 根据 ID 获取核销记录
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 查询参数
   *
   * Returns:
   *   CouponRedemption | null: 核销记录，不存在时返回 null
   */
  getRedemptionById(ctx: RepoContext, params: { id: string }): Promise<CouponRedemption | null>

  /**
   * Description: 根据用户优惠券 ID 获取核销记录
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 查询参数
   *
   * Returns:
   *   CouponRedemption | null: 核销记录，不存在时返回 null
   */
  getRedemptionByUserCouponId(ctx: RepoContext, params: { userCouponId: string }): Promise<CouponRedemption | null>

  /**
   * Description: 列出核销记录（分页）
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 查询参数
   *
   * Returns:
   *   items: 核销记录列表
   *   nextCursor: 下一页游标
   */
  listRedemptions(ctx: RepoContext, params: {
    limit?: number
    cursor?: string | null
    couponId?: string
    userId?: string
    orderId?: string
    startDate?: Date
    endDate?: Date
  }): Promise<{ items: CouponRedemption[]; nextCursor: string | null; totalCount: number }>

  /**
   * Description: 创建核销记录
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 核销记录数据
   *
   * Returns:
   *   CouponRedemption: 创建后的核销记录
   */
  createRedemption(ctx: RepoContext, params: {
    couponId: string
    userCouponId: string
    userId: string
    orderId?: string | null
    originalAmount: string
    discountAmount: string
    finalAmount: string
    giftProductId?: string | null
    giftEntitlementId?: string | null
  }): Promise<CouponRedemption>

  /**
   * Description: 更新核销记录（关联订单或赠品权益）
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 更新参数
   *
   * Returns:
   *   CouponRedemption | null: 更新后的核销记录，不存在时返回 null
   */
  updateRedemption(ctx: RepoContext, params: {
    id: string
    orderId?: string | null
    giftEntitlementId?: string | null
  }): Promise<CouponRedemption | null>

  /**
   * Description: 统计优惠券核销次数
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 查询参数
   *
   * Returns:
   *   number: 核销次数
   */
  countRedemptionsByCoupon(ctx: RepoContext, params: { couponId: string }): Promise<number>

  /**
   * Description: 原子性核销优惠券（事务内完成状态更新、记录创建、计数递增）
   *            使用乐观锁：仅当 UserCoupon.status='available' 时才执行更新
   *
   * Parameters:
   *   ctx(context): Repository 上下文
   *   params(object): 核销参数
   *
   * Returns:
   *   CouponRedemption: 核销成功返回核销记录
   *
   * Throws:
   *   Error: 优惠券已被核销或不存时抛出错误
   */
  redeemAtomically(ctx: RepoContext, params: {
    userCouponId: string
    userId: string
    couponId: string
    orderId?: string | null
    originalAmount: string
    discountAmount: string
    finalAmount: string
    giftProductId?: string | null
  }): Promise<CouponRedemption>
}
