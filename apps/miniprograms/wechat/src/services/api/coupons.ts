/**
 * Function: services/api/coupons
 *
 * Description: 优惠券相关 API 服务
 *
 * Returns:
 *   getMyCoupons(function): 获取我的优惠券列表
 */

import { httpClient } from '../../core/http-client'
import { logger } from '../../utils/logger'

/**
 * 优惠券接口定义
 */
export interface Coupon {
  id: string
  title: string
  description: string
  amount: string
  minAmount?: string
  discount?: string
  expiryDate: string
  status: 'available' | 'used' | 'expired'
  usageRule?: string
}

/**
 * 优惠券服务类
 */
class CouponService {
  private logger = logger.child({ service: 'coupon' })

  /**
   * 获取我的优惠券列表
   * @param params - 查询参数
   * @param params.status - 优惠券状态 (available | used | expired)
   * @returns Promise<{coupons: Coupon[]}> - 优惠券列表
   */
  async getMyCoupons(params: { status: string }) {
    this.logger.info('获取我的优惠券列表', params)

    try {
      // 连接后端 API: GET /api/v1/user/coupons/my
      const result = await httpClient.get<{ coupons: Coupon[] }>('/user/coupons/my', params)
      this.logger.info('获取我的优惠券列表成功', { count: result.coupons?.length })
      return result
    } catch (error) {
      this.logger.error('获取我的优惠券列表失败', error, params)
      // API 未找到时返回空列表，而非抛出错误中断 UI
      if (error instanceof Error && (error.message.includes('404') || error.message.includes('Not Found'))) {
        this.logger.warn('API 未找到（404），返回空优惠券列表', { params })
        return { coupons: [] }
      }
      throw error
    }
  }
}

/**
 * 导出单例
 */
export const couponService = new CouponService()

export default couponService
