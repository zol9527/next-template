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
import { createCouponRedemptionRepository } from '@/repositories/factory'

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
 *   includeCount: 是否返回总记录数（默认 false，跳过全表 count 提升性能）
 *
 * Returns:
 *   { success: true, data: { redemptions, nextCursor, totalCount? } }
 */
export const GET = withV1Route({
  pluginGuard: 'ecommerce',
  action: 'admin:coupon-redemptions:read',
  requireAccess: { action: 'read' as Action, scope: 'coupons.redemptions' as Scope },
  schemas: { query: ListRedemptionsQuerySchema },
  handler: async ({ serviceContext, userId, query, req }) => {
    // 记录请求开始时间，用于性能监控
    const startTime = Date.now()

    // 性能优化：只创建实际需要的 redemption repository，避免不必要的 factory 调用
    // （原实现创建了 coupons + userCoupons + redemptions 三个 repo，但只用到 redemptions）
    const redemptions = await createCouponRedemptionRepository()

    // 构造 RepoContext，直接调用 repository 层，跳过两层无业务逻辑的 service 代理
    // （AdminCouponService.listRedemptions → CouponService.listRedemptions → Repo.listRedemptions）
    const repoCtx = {
      traceId: serviceContext!.traceId,
      logger: serviceContext!.logger.child({ layer: 'repository' }),
    }

    const data = await redemptions.listRedemptions(repoCtx, {
      limit: query.limit,
      cursor: query.cursor ?? null,
      couponId: query.couponId,
      userId: query.userId,
      orderId: query.orderId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      includeCount: query.includeCount,
    })

    // 计算请求耗时
    const duration = Date.now() - startTime

    serviceContext!.logger.info({
      action: 'admin_redemptions_list',
      userId,
      count: data.items.length,
      duration,
      includeCount: query.includeCount,
      hasFilters: !!(query.couponId || query.userId || query.orderId || query.startDate || query.endDate),
    })

    // 添加缓存头，允许客户端缓存 30 秒
    const response = createJsonApiResponse(req, ok({
      redemptions: data.items,
      nextCursor: data.nextCursor,
      totalCount: data.totalCount,
    }))
    response.headers.set('Cache-Control', 'private, max-age=30')

    return response
  },
})

export function OPTIONS(req: NextRequest) {
  return createOptionsResponse(req)
}
