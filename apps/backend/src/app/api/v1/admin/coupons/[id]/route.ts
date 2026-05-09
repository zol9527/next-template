import type { Action, Scope } from '@/config/access'
/**
 * Admin Coupon Detail API
 *
 * @module api/v1/admin/coupons/[id]
 * @description 后台管理 - 单个优惠券操作 API
 *
 * 端点:
 * - GET /api/v1/admin/coupons/[id]: 获取优惠券详情
 * - PATCH /api/v1/admin/coupons/[id]: 更新优惠券
 * - DELETE /api/v1/admin/coupons/[id]: 删除优惠券
 */

import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { ok } from '@/contracts/api-response.schema'
import {
  UpdateCouponRequestSchema,
} from '@/plugins/ecommerce/contracts/admin-coupons.dto'
import { createJsonApiResponse, createOptionsResponse } from '@/lib/http/response'
import { withV1Route } from '@/app/api/v1/_shared/route-handler'
import { createCouponRepository, createUserCouponRepository, createCouponRedemptionRepository } from '@/repositories/factory'
import { createCouponService } from '@/plugins/ecommerce/services/coupon.service'
import { createAdminCouponService } from '@/plugins/ecommerce/services/admin-coupon.service'

// 定义路由参数 Schema
const CouponParamsSchema = z.object({
  id: z.string().uuid(),
})

export type CouponParams = z.infer<typeof CouponParamsSchema>

/**
 * GET /api/v1/admin/coupons/[id]
 *
 * Description: 后台管理 - 获取优惠券详情
 *
 * Path Parameters:
 *   id: 优惠券 ID
 *
 * Returns:
 *   { success: true, data: { coupon } }
 */
export const GET = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:coupons:read',
  requireAccess: { action: 'read' as Action, scope: 'coupons' as Scope },
  schemas: {
    params: CouponParamsSchema,
  },
  handler: async ({ serviceContext, params, req }) => {
    // 创建 Repository 和 Service
    const coupons = await createCouponRepository()
    const userCoupons = await createUserCouponRepository()
    const redemptions = await createCouponRedemptionRepository()
    const couponService = createCouponService({ coupons, userCoupons, redemptions }, serviceContext!)
    const adminService = createAdminCouponService({ couponService }, serviceContext!)

    const coupon = await adminService.getCouponById(params.id)

    serviceContext!.logger.info({ action: 'admin_coupon_get', couponId: params.id })

    return createJsonApiResponse(req, ok({ coupon }))
  },
})

/**
 * PATCH /api/v1/admin/coupons/[id]
 *
 * Description: 后台管理 - 更新优惠券
 *
 * Path Parameters:
 *   id: 优惠券 ID
 *
 * Body Parameters:
 *   [可选字段，与创建优惠券类似]
 *
 * Returns:
 *   { success: true, data: { coupon } }
 */
export const PATCH = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:coupons:write',
  requireAccess: { action: 'write' as Action, scope: 'coupons' as Scope },
  schemas: {
    params: CouponParamsSchema,
    body: UpdateCouponRequestSchema,
  },
  handler: async ({ serviceContext, userId, params, body, req }) => {

    // 创建 Repository 和 Service
    const coupons = await createCouponRepository()
    const userCoupons = await createUserCouponRepository()
    const redemptions = await createCouponRedemptionRepository()
    const couponService = createCouponService({ coupons, userCoupons, redemptions }, serviceContext!)
    const adminService = createAdminCouponService({ couponService }, serviceContext!)

    const coupon = await adminService.updateCoupon(params.id, body!, userId!)

    serviceContext!.logger.info({ action: 'admin_coupon_update', userId, couponId: params.id })

    return createJsonApiResponse(req, ok({ coupon }))
  },
})

/**
 * DELETE /api/v1/admin/coupons/[id]
 *
 * Description: 后台管理 - 删除优惠券（软删除）
 *
 * Path Parameters:
 *   id: 优惠券 ID
 *
 * Returns:
 *   { success: true, data: { deleted: true } }
 */
export const DELETE = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:coupons:write',
  requireAccess: { action: 'write' as Action, scope: 'coupons' as Scope },
  schemas: {
    params: CouponParamsSchema,
  },
  handler: async ({ serviceContext, userId, params, req }) => {
    // 创建 Repository 和 Service
    const coupons = await createCouponRepository()
    const userCoupons = await createUserCouponRepository()
    const redemptions = await createCouponRedemptionRepository()
    const couponService = createCouponService({ coupons, userCoupons, redemptions }, serviceContext!)
    const adminService = createAdminCouponService({ couponService }, serviceContext!)

    const result = await adminService.deleteCoupon(params.id)

    serviceContext!.logger.info({ action: 'admin_coupon_delete', userId, couponId: params.id })

    return createJsonApiResponse(req, ok(result))
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
