/**
 * Available Coupons API
 *
 * @module api/v1/coupons/available
 * @description 小程序端 - 查询可用优惠券 API（下单时使用）
 *
 * 端点:
 * - GET /api/v1/coupons/available: 查询当前订单可用的优惠券
 */

import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { AvailableCouponsQuerySchema } from '@/plugins/ecommerce/contracts/my-coupons.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createCouponRepository, createUserCouponRepository, createCouponRedemptionRepository } from '@/repositories/factory'
import { createCouponService } from '@/plugins/ecommerce/services/coupon.service'

/**
 * GET /api/v1/coupons/available
 *
 * Description: 小程序端 - 查询当前订单可用的优惠券
 *
 * Query Parameters:
 *   productId: 商品 ID
 *   orderAmount: 订单金额（decimal 字符串）
 *
 * Returns:
 *   { success: true, data: { items } }
 */
export const GET = withV1Route({
  pluginGuard: 'ecommerce',
  requireAuth: true,
  action: 'coupons:available',
  schemas: { query: AvailableCouponsQuerySchema },
  handler: async ({ req, serviceContext, userId, query }) => {

    // 创建 Repository 和 Service
    const coupons = await createCouponRepository()
    const userCoupons = await createUserCouponRepository()
    const redemptions = await createCouponRedemptionRepository()
    const couponService = createCouponService({ coupons, userCoupons, redemptions }, serviceContext)

    // 获取用户所有可用的优惠券
    const myCoupons = await couponService.listMyCoupons({
      userId,
      status: 'available',
      limit: 100, // 获取所有可用优惠券进行筛选
    })

    // 过滤出可用于当前订单的优惠券，并保留折扣计算结果
    const availableItems = []

    for (const userCoupon of myCoupons.items) {
      try {
        // 使用 calculateDiscount 验证是否可用，并获取折扣计算结果
        const calculation = await couponService.calculateDiscount({
          userCouponId: userCoupon.id,
          userId,
          productId: query.productId,
          originalAmount: query.orderAmount,
        })

        if (calculation.canUse) {
          // 返回完整的计算结果（包含折扣金额、最终金额）
          availableItems.push({
            userCoupon,
            discountAmount: calculation.discountAmount,
            finalAmount: calculation.finalAmount,
          })
        }
      } catch {
        // 忽略计算错误的优惠券
        continue
      }
    }

    serviceContext.logger.info({
      action: 'available_coupons',
      userId,
      productId: query.productId,
      orderAmount: query.orderAmount,
      count: availableItems.length,
    })

    return createJsonApiResponse(req, ok({ items: availableItems, originalAmount: query.orderAmount }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
