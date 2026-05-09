import type { Action, Scope } from '@/config/access'
/**
 * Admin Coupon Issue API
 *
 * @module api/v1/admin/coupons/issue
 * @description 后台管理 - 优惠券发放 API
 *
 * 端点:
 * - POST /api/v1/admin/coupons/issue: 发放优惠券给用户
 */

import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import {
  IssueCouponRequestSchema,
} from '@/plugins/ecommerce/contracts/admin-coupons.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createCouponRepository, createUserCouponRepository, createCouponRedemptionRepository } from '@/repositories/factory'
import { createCouponService } from '@/plugins/ecommerce/services/coupon.service'
import { createAdminCouponService } from '@/plugins/ecommerce/services/admin-coupon.service'

/**
 * POST /api/v1/admin/coupons/issue
 *
 * Description: 后台管理 - 发放优惠券给用户
 *
 * Body Parameters:
 *   couponId: 优惠券模板 ID
 *   userIds: 指定用户 ID 列表（与 userRole 二选一）
 *   userRole: 按用户角色发放（与 userIds 二选一）
 *   expiresAt: 用户优惠券过期时间（可选）
 *
 * Returns:
 *   { success: true, data: { issued, failed, failures } }
 */
export const POST = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:coupons:write',
  requireAccess: { action: 'write' as Action, scope: 'coupons' as Scope },
  schemas: { body: IssueCouponRequestSchema },
  handler: async ({ serviceContext, userId, body, req }) => {

    // 创建 Repository 和 Service
    const coupons = await createCouponRepository()
    const userCoupons = await createUserCouponRepository()
    const redemptions = await createCouponRedemptionRepository()
    const couponService = createCouponService({ coupons, userCoupons, redemptions }, serviceContext!)
    const adminService = createAdminCouponService({ couponService }, serviceContext!)

    const result = await adminService.issueCoupon(body!, userId!)

    serviceContext!.logger.info({
      action: 'admin_coupon_issue',
      userId,
      couponId: body!.couponId,
      issued: result.issued,
      failed: result.failed,
    })

    return createJsonApiResponse(req, ok(result))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
