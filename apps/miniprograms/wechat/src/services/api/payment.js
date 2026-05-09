/**
 * Function: paymentService
 *
 * Description: 支付相关 API 服务，处理微信支付等操作
 *
 * Returns:
 *	createWechatPay(function): 创建微信支付
 */

import { httpClient } from '../../core/http-client'
import { logger } from '../../utils/logger'

/**
 * 支付服务类
 */
class PaymentService {
  constructor() {
    this.logger = logger.child({ service: 'payment' })
  }

  /**
   * 创建微信支付
   * @param {string} orderId - 订单 ID
   * @param {string} payerOpenId - 支付者 openid
   * @returns {Promise<{prepayId: string, params: object}>} 支付参数
   */
  async createWechatPay(orderId, payerOpenId) {
    this.logger.info('创建微信支付', { orderId })

    try {
      const result = await httpClient.post(`/user/orders/${orderId}/wechat-pay`, { payerOpenId })
      this.logger.info('创建微信支付成功', { orderId, prepayId: result.prepayId })
      return result
    } catch (error) {
      this.logger.error('创建微信支付失败', error, { orderId })
      throw error
    }
  }
}

/**
 * 导出单例
 */
export const paymentService = new PaymentService()

export default paymentService
