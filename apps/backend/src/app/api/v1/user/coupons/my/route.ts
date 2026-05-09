/**
 * My Coupons API
 *
 * @module api/v1/coupons/my
 * @description 小程序端 - 我的优惠券 API
 *
 * 端点:
 * - GET /api/v1/coupons/my: 获取我的优惠券列表
 */

import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import { MyCouponsQuerySchema } from '@/plugins/ecommerce/contracts/my-coupons.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createCouponRepository, createUserCouponRepository, createCouponRedemptionRepository } from '@/repositories/factory'
import { createCouponService } from '@/plugins/ecommerce/services/coupon.service'

/**
 * GET /api/v1/coupons/my
 *
 * Description: 小程序端 - 获取我的优惠券列表
 *
 * Query Parameters:
 *   limit: 分页大小（默认 20）
 *   cursor: 分页游标
 *   status: 状态筛选（available/used/expired）
 *
 * Returns:
 *   { success: true, data: { items, nextCursor } }
 */
export const GET = withV1Route({
  pluginGuard: 'ecommerce',
  requireAuth: true,
  action: 'my_coupons:list',
  schemas: { query: MyCouponsQuerySchema },
  handler: async ({ req, serviceContext, userId, query }) => {

    // 创建 Repository 和 Service
    const coupons = await createCouponRepository()
    const userCoupons = await createUserCouponRepository()
    const redemptions = await createCouponRedemptionRepository()
    const couponService = createCouponService({ coupons, userCoupons, redemptions }, serviceContext)

    const data = await couponService.listMyCoupons({
      userId,
      limit: query.limit,
      cursor: query.cursor,
      status: query.status,
    })

    serviceContext.logger.info({ action: 'my_coupons_list', userId, count: data.items.length })

    return createJsonApiResponse(req, ok(data))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
