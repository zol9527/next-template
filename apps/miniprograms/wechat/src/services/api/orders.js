/**
 * Function: orderService
 *
 * Description: 订单相关 API 服务，处理订单创建、查询、列表等操作
 *
 * Returns:
 *	createOrder(function): 创建订单
 *	getOrderDetail(function): 获取订单详情
 *	getOrderList(function): 获取订单列表
 */

import { httpClient } from '../../core/http-client'
import { logger } from '../../utils/logger'
import { generateTraceId } from '../../utils/trace-id'

/**
 * 订单服务类
 */
class OrderService {
  constructor() {
    this.logger = logger.child({ service: 'order' })
  }

  /**
   * 创建订单
   * @param {string} productId - 商品 ID
   * @returns {Promise<{order: object}>} 订单信息
   */
  async createOrder(productId) {
    this.logger.info('创建订单', { productId })
    const idempotencyKey = generateTraceId()

    try {
      const result = await httpClient.post(
        '/user/orders',
        { productId },
        {
          headers: { 'Idempotency-Key': idempotencyKey }
        }
      )
      this.logger.info('创建订单成功', { orderId: result.order?.id })
      return result
    } catch (error) {
      this.logger.error('创建订单失败', error, { productId })
      throw error
    }
  }

  /**
   * 获取订单详情
   * @param {string} orderId - 订单 ID
   * @returns {Promise<{order: object}>} 订单详情
   */
  async getOrderDetail(orderId) {
    this.logger.info('获取订单详情', { orderId })

    try {
      const result = await httpClient.get(`/user/orders/${orderId}`)
      this.logger.info('获取订单详情成功', { orderId })
      return result
    } catch (error) {
      this.logger.error('获取订单详情失败', error, { orderId })
      throw error
    }
  }

  /**
   * 获取订单列表
   * @param {object} params - 查询参数
   * @param {string} params.status - 订单状态筛选
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   * @returns {Promise<{orders: array, total: number}>} 订单列表
   */
  async getOrderList(params = {}) {
    this.logger.info('获取订单列表', params)

    try {
      const result = await httpClient.get('/user/orders', params)
      this.logger.info('获取订单列表成功', { count: result.orders?.length })
      return result
    } catch (error) {
      this.logger.error('获取订单列表失败', error, params)
      throw error
    }
  }

  /**
   * Function: getOrderStats
   *
   * Description: 获取订单统计（待支付/已支付/已完成）
   *
   * Parameters:
   *
   * Returns:
   *	stats(object): 订单统计数据
   */
  async getOrderStats() {
    this.logger.info('获取订单统计')

    try {
      const result = await httpClient.get('/user/orders/stats')
      this.logger.info('获取订单统计成功', result)
      return result
    } catch (error) {
      this.logger.error('获取订单统计失败', error)
      throw error
    }
  }

  /**
   * 获取我的订单列表
   * @param {object} params - 查询参数
   * @returns {Promise<{orders: array}>} 订单列表
   */
  async getMyOrders(params = {}) {
    this.logger.info('获取我的订单列表', params)

    try {
      // 尝试获取订单列表
      const result = await httpClient.get('/user/orders', params)
      this.logger.info('获取我的订单列表成功', { count: result.orders?.length })
      return result
    } catch (error) {
      this.logger.error('获取我的订单列表失败', error, params)
      // 如果 API 未实现，返回空数组
      if (error.message?.includes('Unsupported')) {
        return { orders: [] }
      }
      throw error
    }
  }

  /**
   * 取消订单
   * @param {string} orderId - 订单 ID
   * @returns {Promise<{order: object}>} 取消后的订单信息
   */
  async cancelOrder(orderId) {
    this.logger.info('取消订单', { orderId })

    try {
      const result = await httpClient.post(`/user/orders/${orderId}/cancel`)
      this.logger.info('取消订单成功', { orderId })
      return result
    } catch (error) {
      this.logger.error('取消订单失败', error, { orderId })
      throw error
    }
  }
}

/**
 * 导出单例
 */
export const orderService = new OrderService()

export default orderService
