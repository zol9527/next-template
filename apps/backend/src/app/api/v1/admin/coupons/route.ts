import type { Action, Scope } from '@/config/access'
/**
 * Admin Coupon Management API
 *
 * @module api/v1/admin/coupons
 * @description 后台管理 - 优惠券管理 API
 *
 * 端点:
 * - GET /api/v1/admin/coupons: 列出优惠券（支持筛选和分页）
 * - POST /api/v1/admin/coupons: 创建优惠券
 */

import type { NextRequest } from 'next/server'

import { ok } from '@/contracts/api-response.schema'
import {
  CreateCouponRequestSchema,
  ListCouponsQuerySchema,
} from '@/plugins/ecommerce/contracts/admin-coupons.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createCouponRepository, createUserCouponRepository, createCouponRedemptionRepository } from '@/repositories/factory'
import { createCouponService } from '@/plugins/ecommerce/services/coupon.service'
import { createAdminCouponService } from '@/plugins/ecommerce/services/admin-coupon.service'

/**
 * GET /api/v1/admin/coupons
 *
 * Description: 后台管理 - 列出优惠券
 *
 * Query Parameters:
 *   limit: 分页大小（默认 20）
 *   cursor: 分页游标
 *   status: 状态筛选
 *   type: 类型筛选
 *   name: 名称搜索（模糊匹配）
 *
 * Returns:
 *   { success: true, data: { coupons, nextCursor } }
 */
export const GET = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:coupons:read',
  requireAccess: { action: 'read' as Action, scope: 'coupons' as Scope },
  schemas: { query: ListCouponsQuerySchema },
  handler: async ({ serviceContext, userId, query, req }) => {
    // 创建 Repository 和 Service
    const coupons = await createCouponRepository()
    const userCoupons = await createUserCouponRepository()
    const redemptions = await createCouponRedemptionRepository()
    const couponService = createCouponService({ coupons, userCoupons, redemptions }, serviceContext!)
    const adminService = createAdminCouponService({ couponService }, serviceContext!)

    const data = await adminService.listCoupons(query)

    serviceContext!.logger.info({ action: 'admin_coupons_list', userId, count: data.coupons.length })

    return createJsonApiResponse(req, ok(data))
  },
})

/**
 * POST /api/v1/admin/coupons
 *
 * Description: 后台管理 - 创建优惠券
 *
 * Body Parameters:
 *   name: 优惠券名称
 *   description: 优惠券描述
 *   type: 优惠券类型（discount, fixed_amount, threshold, gift）
 *   [根据 type 提供对应的折扣字段]
 *   minOrderAmount: 最低订单金额
 *   maxDiscountAmount: 最大折扣金额
 *   perUserLimit: 每用户限领数量
 *   usageLimit: 总使用次数限制
 *   applicableProductIds: 适用商品 ID 列表
 *   applicableCategoryIds: 适用分类 ID 列表
 *   validFrom: 有效期开始时间
 *   validTo: 有效期结束时间
 *
 * Returns:
 *   { success: true, data: { coupon } }
 */
export const POST = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:coupons:write',
  requireAccess: { action: 'write' as Action, scope: 'coupons' as Scope },
  schemas: { body: CreateCouponRequestSchema },
  handler: async ({ serviceContext, userId, body, req }) => {
    // 创建 Repository 和 Service
    const coupons = await createCouponRepository()
    const userCoupons = await createUserCouponRepository()
    const redemptions = await createCouponRedemptionRepository()
    const couponService = createCouponService({ coupons, userCoupons, redemptions }, serviceContext!)
    const adminService = createAdminCouponService({ couponService }, serviceContext!)

    const coupon = await adminService.createCoupon(body!, userId!)

    serviceContext!.logger.info({ action: 'admin_coupon_create', userId, couponId: coupon.id })

    return createJsonApiResponse(req, ok({ coupon }))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
