/**
 * Calculate Discount API
 *
 * @module api/v1/coupons/calculate
 * @description 小程序端 - 计算优惠券折扣 API
 *
 * 端点:
 * - POST /api/v1/coupons/calculate: 计算使用指定优惠券后的折扣
 */

import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { CalculateDiscountRequestSchema } from '@/plugins/ecommerce/contracts/coupons.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createCouponRepository, createUserCouponRepository, createCouponRedemptionRepository } from '@/repositories/factory'
import { createCouponService } from '@/plugins/ecommerce/services/coupon.service'

/**
 * POST /api/v1/coupons/calculate
 *
 * Description: 小程序端 - 计算使用指定优惠券后的折扣
 *
 * Body Parameters:
 *   userCouponId: 用户优惠券 ID
 *   productId: 商品 ID
 *   originalAmount: 订单原价（decimal 字符串）
 *
 * Returns:
 *   { success: true, data: { canUse, reason?, originalAmount, discountAmount, finalAmount, coupon } }
 */
export const POST = withV1Route({
  pluginGuard: 'ecommerce',
  requireAuth: true,
  action: 'coupons:calculate',
  schemas: { body: CalculateDiscountRequestSchema },
  handler: async ({ req, body, serviceContext, userId }) => {

    // 创建 Repository 和 Service
    const coupons = await createCouponRepository()
    const userCoupons = await createUserCouponRepository()
    const redemptions = await createCouponRedemptionRepository()
    const couponService = createCouponService({ coupons, userCoupons, redemptions }, serviceContext)

    const calculation = await couponService.calculateDiscount({
      userCouponId: body!.userCouponId,
      userId,
      productId: body!.productId,
      originalAmount: body!.originalAmount,
    })

    serviceContext.logger.info({
      action: 'calculate_discount',
      userId,
      userCouponId: body!.userCouponId,
      canUse: calculation.canUse,
      discountAmount: calculation.discountAmount,
    })

    return createJsonApiResponse(req, ok(calculation))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
