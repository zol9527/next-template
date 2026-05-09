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
      // 如果后端 API 尚未实现，返回 Mock 数据供 UI 开发使用
      if (error instanceof Error && (error.message.includes('404') || error.message.includes('Not Found'))) {
        this.logger.warn('API 未找到，返回 Mock 数据')
        return this.getMockCoupons(params.status)
      }
      throw error
    }
  }

  /**
   * Mock 数据生成
   */
  private getMockCoupons(status: string) {
    const availableCoupons: Coupon[] = [
      {
        id: '1',
        title: '课程通用优惠券',
        description: '适用于全部课程商品',
        amount: '50',
        minAmount: '200',
        expiryDate: '2025-06-30',
        status: 'available'
      },
      {
        id: '2',
        title: '精讲课程专属折扣',
        description: '仅限精讲系列课程',
        amount: '8折',
        expiryDate: '2025-07-15',
        status: 'available'
      },
      {
        id: '3',
        title: '新用户专享礼券',
        description: '新注册用户首次购买可用',
        amount: '100',
        minAmount: '500',
        expiryDate: '2025-05-31',
        status: 'available'
      }
    ]

    const coupons = status === 'available' ? availableCoupons : []
    return { coupons }
  }
}

/**
 * 导出单例
 */
export const couponService = new CouponService()

export default couponService
