import type { Action, Scope } from '@/config/access'
/**
 * Admin Coupon Redemptions API
 *
 * @module api/v1/admin/coupons/redemptions
 * @description 后台管理 - 优惠券核销记录查询 API
 *
 * 端点:
 * - GET /api/v1/admin/coupons/redemptions: 列出核销记录（支持筛选和分页）
 */

import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import {
  ListRedemptionsQuerySchema,
} from '@/plugins/ecommerce/contracts/admin-coupons.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createCouponRepository, createUserCouponRepository, createCouponRedemptionRepository } from '@/repositories/factory'
import { createCouponService } from '@/plugins/ecommerce/services/coupon.service'
import { createAdminCouponService } from '@/plugins/ecommerce/services/admin-coupon.service'

/**
 * GET /api/v1/admin/coupons/redemptions
 *
 * Description: 后台管理 - 列出核销记录
 *
 * Query Parameters:
 *   limit: 分页大小（默认 20）
 *   cursor: 分页游标
 *   couponId: 按优惠券筛选
 *   userId: 按用户筛选
 *   orderId: 按订单筛选
 *   startDate: 开始日期
 *   endDate: 结束日期
 *
 * Returns:
 *   { success: true, data: { redemptions, nextCursor } }
 */
export const GET = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:coupon-redemptions:read',
  requireAccess: { action: 'read' as Action, scope: 'coupons.redemptions' as Scope },
  schemas: { query: ListRedemptionsQuerySchema },
  handler: async ({ serviceContext, userId, query, req }) => {
    // 记录请求开始时间，用于性能监控
    const startTime = Date.now()

    // 创建 Repository 和 Service
    const coupons = await createCouponRepository()
    const userCoupons = await createUserCouponRepository()
    const redemptions = await createCouponRedemptionRepository()
    const couponService = createCouponService({ coupons, userCoupons, redemptions }, serviceContext!)
    const adminService = createAdminCouponService({ couponService }, serviceContext!)

    const data = await adminService.listRedemptions(query)

    // 计算请求耗时
    const duration = Date.now() - startTime

    serviceContext!.logger.info({
      action: 'admin_redemptions_list',
      userId,
      count: data.redemptions.length,
      duration,
      hasFilters: !!(query.couponId || query.userId || query.orderId || query.startDate || query.endDate),
    })

    // 添加缓存头，允许客户端缓存 30 秒
    const response = createJsonApiResponse(req, ok(data))
    response.headers.set('Cache-Control', 'private, max-age=30')

    return response
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
