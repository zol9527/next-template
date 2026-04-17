/**
 * Function: createAdminCouponService
 *
 * Description: 创建管理员优惠券服务，负责后台优惠券管理业务逻辑；仅依赖仓储接口，不直接访问数据库
 *
 * Parameters:
 *   deps(object): 依赖注入的 Repository
 *   ctx(ServiceContext): Service 上下文
 *
 * Returns:
 *   service(object): 管理员优惠券服务对象
 */

import type { ServiceContext } from '@/types/service/service-context'
import type { CouponService } from './coupon.service'
import type {
  CreateCouponRequest,
  UpdateCouponRequest,
  IssueCouponRequest,
  ListCouponsQuery,
  ListUserCouponsQuery,
  ListRedemptionsQuery,
} from '@/plugins/ecommerce/contracts/admin-coupons.dto'
import type {
  Coupon,
  UserCoupon,
  CouponRedemption,
  CouponStatus,
} from '@/plugins/ecommerce/contracts/coupons.dto'

function makeNotFoundError(message: string): Error & { code: 'NOT_FOUND' } {
  const error = new Error(message) as Error & { code: 'NOT_FOUND' }
  error.code = 'NOT_FOUND'
  return error
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function makeConflictError(message: string): Error & { code: 'CONFLICT' } {
  const error = new Error(message) as Error & { code: 'CONFLICT' }
  error.code = 'CONFLICT'
  return error
}

function makeBadRequestError(message: string): Error & { code: 'INVALID_INPUT' } {
  const error = new Error(message) as Error & { code: 'INVALID_INPUT' }
  error.code = 'INVALID_INPUT'
  return error
}

export function createAdminCouponService(
  deps: { couponService: CouponService },
  ctx: ServiceContext,
) {
  const { logger } = ctx

  return {
    /**
     * Function: listCoupons
     *
     * Description: 后台管理 - 列出优惠券（支持筛选和分页）
     *
     * Parameters:
     *   query(ListCouponsQuery): 查询参数
     *
     * Returns:
     *   coupons: 优惠券列表
     *   nextCursor: 下一页游标
     */
    async listCoupons(query: ListCouponsQuery): Promise<{
      coupons: Coupon[]
      nextCursor: string | null
    }> {
      logger.info({ action: 'admin_coupon.list', query })

      const result = await deps.couponService.listCoupons({
        limit: query.limit,
        cursor: query.cursor,
        status: query.status,
        type: query.type,
        name: query.name,
      })

      return { coupons: result.items, nextCursor: result.nextCursor }
    },

    /**
     * Function: getCouponById
     *
     * Description: 后台管理 - 获取优惠券详情
     *
     * Parameters:
     *   couponId(string): 优惠券 ID
     *
     * Returns:
     *   Coupon: 优惠券详情
     */
    async getCouponById(couponId: string): Promise<Coupon> {
      logger.info({ action: 'admin_coupon.get_by_id', couponId })

      const coupon = await deps.couponService.getCouponById(couponId)
      if (!coupon) {
        throw makeNotFoundError('优惠券不存在')
      }

      return coupon
    },

    /**
     * Function: createCoupon
     *
     * Description: 后台管理 - 创建优惠券
     *
     * Parameters:
     *   params(CreateCouponRequest): 创建参数
     *   createdBy(string): 创建人 ID
     *
     * Returns:
     *   Coupon: 创建后的优惠券
     */
    async createCoupon(params: CreateCouponRequest, createdBy: string): Promise<Coupon> {
      logger.info({ action: 'admin_coupon.create', name: params.name, type: params.type })

      // 验证折扣字段与类型匹配
      this.validateDiscountFields(params.type, params)

      const coupon = await deps.couponService.createCoupon({
        name: params.name,
        description: params.description ?? null,
        type: params.type,
        status: 'draft',
        discountPercent: params.discountPercent ?? null,
        discountAmount: params.discountAmount ?? null,
        thresholdAmount: params.thresholdAmount ?? null,
        thresholdDiscount: params.thresholdDiscount ?? null,
        giftProductId: params.giftProductId ?? null,
        minOrderAmount: params.minOrderAmount ?? null,
        maxDiscountAmount: params.maxDiscountAmount ?? null,
        perUserLimit: params.perUserLimit ?? null,
        usageLimit: params.usageLimit ?? null,
        applicableProductIds: params.applicableProductIds ?? [],
        applicableCategoryIds: params.applicableCategoryIds ?? [],
        validFrom: new Date(params.validFrom),
        validTo: new Date(params.validTo),
        createdBy,
      })

      return coupon
    },

    /**
     * Function: updateCoupon
     *
     * Description: 后台管理 - 更新优惠券
     *
     * Parameters:
     *   couponId(string): 优惠券 ID
     *   params(UpdateCouponRequest): 更新参数
     *   updatedBy(string): 更新人 ID
     *
     * Returns:
     *   Coupon: 更新后的优惠券
     */
    async updateCoupon(couponId: string, params: UpdateCouponRequest, updatedBy: string): Promise<Coupon> {
      logger.info({ action: 'admin_coupon.update', couponId })

      // 检查优惠券是否存在
      const existing = await deps.couponService.getCouponById(couponId)
      if (!existing) {
        throw makeNotFoundError('优惠券不存在')
      }

      // 如果更新了折扣相关字段，需要验证与类型匹配
      // 注意：不允许更改优惠券类型，所以使用 existing.type
      if (
        params.discountPercent !== undefined ||
        params.discountAmount !== undefined ||
        params.thresholdAmount !== undefined ||
        params.thresholdDiscount !== undefined ||
        params.giftProductId !== undefined
      ) {
        // 构建一个临时对象进行验证
        const tempParams = {
          ...params,
          type: existing.type,
        }
        this.validateDiscountFields(existing.type, tempParams)
      }

      // 构建更新参数
      const updateParams: Parameters<CouponService['updateCoupon']>[0] = {
        couponId,
        updatedBy,
      }

      if (params.name !== undefined) updateParams.name = params.name
      if (params.description !== undefined) updateParams.description = params.description
      if (params.status !== undefined) updateParams.status = params.status
      if (params.discountPercent !== undefined) updateParams.discountPercent = params.discountPercent
      if (params.discountAmount !== undefined) updateParams.discountAmount = params.discountAmount
      if (params.thresholdAmount !== undefined) updateParams.thresholdAmount = params.thresholdAmount
      if (params.thresholdDiscount !== undefined) updateParams.thresholdDiscount = params.thresholdDiscount
      if (params.giftProductId !== undefined) updateParams.giftProductId = params.giftProductId
      if (params.minOrderAmount !== undefined) updateParams.minOrderAmount = params.minOrderAmount
      if (params.maxDiscountAmount !== undefined) updateParams.maxDiscountAmount = params.maxDiscountAmount
      if (params.perUserLimit !== undefined) updateParams.perUserLimit = params.perUserLimit
      if (params.usageLimit !== undefined) updateParams.usageLimit = params.usageLimit
      if (params.applicableProductIds !== undefined) updateParams.applicableProductIds = params.applicableProductIds
      if (params.applicableCategoryIds !== undefined) updateParams.applicableCategoryIds = params.applicableCategoryIds
      if (params.validFrom !== undefined) updateParams.validFrom = new Date(params.validFrom)
      if (params.validTo !== undefined) updateParams.validTo = new Date(params.validTo)

      const updated = await deps.couponService.updateCoupon(updateParams)
      if (!updated) {
        throw makeNotFoundError('优惠券不存在')
      }

      return updated
    },

    /**
     * Function: deleteCoupon
     *
     * Description: 后台管理 - 删除优惠券（软删除，将状态设为 disabled）
     *
     * Parameters:
     *   couponId(string): 优惠券 ID
     *
     * Returns:
     *   deleted: 是否删除成功
     */
    async deleteCoupon(couponId: string): Promise<{ deleted: boolean }> {
      logger.info({ action: 'admin_coupon.delete', couponId })

      const existing = await deps.couponService.getCouponById(couponId)
      if (!existing) {
        throw makeNotFoundError('优惠券不存在')
      }

      // 软删除：将状态设为 disabled
      await deps.couponService.updateCoupon({
        couponId,
        status: 'disabled',
      })

      return { deleted: true }
    },

    /**
     * Function: batchUpdateStatus
     *
     * Description: 后台管理 - 批量更新优惠券状态
     *
     * Parameters:
     *   couponIds(string[]): 优惠券 ID 列表
     *   status(CouponStatus): 目标状态
     *
     * Returns:
     *   updated: 成功更新的数量
     */
    async batchUpdateStatus(couponIds: string[], status: CouponStatus): Promise<{ updated: number }> {
      logger.info({ action: 'admin_coupon.batch_update_status', count: couponIds.length, status })

      let updated = 0
      for (const couponId of couponIds) {
        const result = await deps.couponService.updateCoupon({ couponId, status })
        if (result) updated++
      }

      return { updated }
    },

    /**
     * Function: issueCoupon
     *
     * Description: 后台管理 - 发放优惠券给用户
     *
     * Parameters:
     *   params(IssueCouponRequest): 发放参数
     *   issuedBy(string): 发放人 ID
     *
     * Returns:
     *   issued: 成功发放的数量
     *   failed: 失败的数量
     *   failures: 失败详情
     */
    async issueCoupon(params: IssueCouponRequest, issuedBy: string): Promise<{
      issued: number
      failed: number
      failures?: Array<{ userId: string; reason: string }>
    }> {
      logger.info({ action: 'admin_coupon.issue', couponId: params.couponId })

      // 检查优惠券是否存在
      const coupon = await deps.couponService.getCouponById(params.couponId)
      if (!coupon) {
        throw makeNotFoundError('优惠券不存在')
      }

      // 确定发放的用户列表
      let userIds: string[] = []

      if (params.userIds && params.userIds.length > 0) {
        userIds = params.userIds
      } else if (params.userRole) {
        // 按角色发放 - 这里需要通过 RBAC 服务获取用户列表
        // 暂时返回错误，提示需要实现
        throw makeBadRequestError('按角色发放功能待实现')
      } else {
        throw makeBadRequestError('必须指定 userIds 或 userRole')
      }

      // 确定过期时间
      const expiresAt = params.expiresAt ? new Date(params.expiresAt) : new Date(coupon.validTo)

      // 调用通用服务发放优惠券
      const result = await deps.couponService.issueCouponToUsers({
        couponId: params.couponId,
        userIds,
        issuedBy,
        expiresAt,
      })

      return {
        issued: result.issued,
        failed: result.failed,
        failures: result.failures,
      }
    },

    /**
     * Function: listUserCoupons
     *
     * Description: 后台管理 - 列出用户优惠券（支持筛选）
     *
     * Parameters:
     *   query(ListUserCouponsQuery): 查询参数
     *
     * Returns:
     *   userCoupons: 用户优惠券列表
     *   nextCursor: 下一页游标
     */
    async listUserCoupons(query: ListUserCouponsQuery): Promise<{
      userCoupons: UserCoupon[]
      nextCursor: string | null
    }> {
      logger.info({ action: 'admin_coupon.list_user_coupons', query })

      // 暂时使用通用服务的方法
      // 注意：通用服务的方法只支持按 userId 筛选，不支持按 couponId
      // 这里需要根据具体需求调整
      if (!query.userId) {
        throw makeBadRequestError('必须指定 userId 进行查询')
      }

      const result = await deps.couponService.listMyCoupons({
        userId: query.userId,
        limit: query.limit,
        cursor: query.cursor,
        status: query.status,
      })

      // 如果指定了 couponId，在结果中过滤
      let userCoupons = result.items
      if (query.couponId) {
        userCoupons = userCoupons.filter((uc) => uc.couponId === query.couponId)
      }

      return { userCoupons, nextCursor: result.nextCursor }
    },

    /**
     * Function: listRedemptions
     *
     * Description: 后台管理 - 列出核销记录（支持筛选）
     *
     * Parameters:
     *   query(ListRedemptionsQuery): 查询参数
     *
     * Returns:
     *   redemptions: 核销记录列表
     *   nextCursor: 下一页游标
     */
    async listRedemptions(query: ListRedemptionsQuery): Promise<{
      redemptions: CouponRedemption[]
      nextCursor: string | null
    }> {
      logger.info({ action: 'admin_coupon.list_redemptions', query })

      const result = await deps.couponService.listRedemptions({
        limit: query.limit,
        cursor: query.cursor,
        couponId: query.couponId,
        userId: query.userId,
        orderId: query.orderId,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      })

      return { redemptions: result.items, nextCursor: result.nextCursor }
    },

    // ==================== 私有辅助方法 ====================

    /**
     * Function: validateDiscountFields
     *
     * Description: 验证折扣字段与优惠券类型匹配
     *
     * Parameters:
     *   type(string): 优惠券类型
     *   params(object): 请求参数
     */
    validateDiscountFields(type: string, params: Partial<CreateCouponRequest | UpdateCouponRequest>): void {
      switch (type) {
        case 'discount':
          if (!params.discountPercent) {
            throw makeBadRequestError('折扣券必须提供 discountPercent 字段')
          }
          break

        case 'fixed_amount':
          if (!params.discountAmount) {
            throw makeBadRequestError('固定金额券必须提供 discountAmount 字段')
          }
          break

        case 'threshold':
          if (!params.thresholdAmount || !params.thresholdDiscount) {
            throw makeBadRequestError('满减券必须提供 thresholdAmount 和 thresholdDiscount 字段')
          }
          break

        case 'gift':
          if (!params.giftProductId) {
            throw makeBadRequestError('赠品券必须提供 giftProductId 字段')
          }
          break

        default:
          throw makeBadRequestError(`无效的优惠券类型: ${type}`)
      }
    },
  }
}

export type AdminCouponService = ReturnType<typeof createAdminCouponService>
