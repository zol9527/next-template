/**
 * Function: distributionService
 *
 * Description: 分销相关 API 服务，处理分销关系绑定、提现申请、推广员管理、推广码、佣金等操作
 *
 * Returns:
 *	bindDistribution(function): 绑定分销关系
 *	applySettlement(function): 申请提现
 *	getPromoterProfile(function): 获取推广员资料
 *	getPromoterStats(function): 获取推广员统计
 *	getCommissions(function): 获取佣金记录
 *	getPromoterCodes(function): 获取推广码列表
 *	generatePromoterCode(function): 生成推广码
 *	enablePromoterCode(function): 启用推广码
 *	disablePromoterCode(function): 禁用推广码
 *	deletePromoterCode(function): 删除推广码
 */

import { httpClient } from '../../core/http-client'
import { logger } from '../../utils/logger'

/**
 * 分销服务类
 */
class DistributionService {
  constructor() {
    this.logger = logger.child({ service: 'distribution' })
  }

  /**
   * 绑定分销关系
   * @param {string} promoterUserId - 推广人用户 ID
   * @returns {Promise<{relation: object}>} 分销关系
   */
  async bindDistribution(promoterUserId) {
    this.logger.info('绑定分销关系', { promoterUserId })

    try {
      const result = await httpClient.post('/user/distribution/bind', { promoterUserId })
      this.logger.info('绑定分销关系成功', { relationId: result.relation?.id })
      return result
    } catch (error) {
      this.logger.error('绑定分销关系失败', error, { promoterUserId })
      throw error
    }
  }

  /**
   * 申请提现
   * @param {object} params - 提现参数
   * @param {string} params.amount - 提现金额
   * @param {string} params.paymentMethod - 支付方式
   * @param {string} params.paymentAccount - 支付账号
   * @returns {Promise} 提现申请结果
   */
  async applySettlement(params) {
    this.logger.info('申请提现', params)

    try {
      const result = await httpClient.post('/user/distribution/settlement-applications', params)
      this.logger.info('申请提现成功')
      return result
    } catch (error) {
      this.logger.error('申请提现失败', error, params)
      throw error
    }
  }

  /**
   * Function: getPromoterProfile
   *
   * Description: 获取推广员个人资料
   *
   * Parameters:
   *
   * Returns:
   *   Promise<object>: 推广员资料信息
   */
  async getPromoterProfile() {
    this.logger.info('获取推广员资料')
    try {
      const result = await httpClient.get('/user/promoter/profile')
      return result
    } catch (error) {
      this.logger.error('获取推广员资料失败', error)
      throw error
    }
  }

  /**
   * Function: getPromoterStats
   *
   * Description: 获取推广员统计数据
   *
   * Parameters:
   *
   * Returns:
   *   Promise<object>: 统计数据（累计收益、可提现金额等）
   */
  async getPromoterStats() {
    this.logger.info('获取推广员统计')
    try {
      const result = await httpClient.get('/user/promoter/stats')
      return result
    } catch (error) {
      this.logger.error('获取推广员统计失败', error)
      throw error
    }
  }

  /**
   * Function: getCommissions
   *
   * Description: 获取佣金记录列表
   *
   * Parameters:
   *   params(object): 查询参数
   *   params.status(string): 佣金状态筛选（可选）
   *   params.limit(number): 每页数量（可选）
   *   params.cursor(string): 分页游标（可选）
   *
   * Returns:
   *   Promise<object>: 佣金列表和分页信息
   */
  async getCommissions(params = {}) {
    this.logger.info('获取佣金记录', params)
    try {
      const result = await httpClient.get('/user/promoter/commissions', { params })
      return result
    } catch (error) {
      this.logger.error('获取佣金记录失败', error)
      throw error
    }
  }

  /**
   * Function: getPromoterCodes
   *
   * Description: 获取推广员的推广码列表
   *
   * Parameters:
   *
   * Returns:
   *   Promise<object>: 推广码列表
   */
  async getPromoterCodes() {
    this.logger.info('获取推广码列表')
    try {
      const result = await httpClient.get('/user/promoter-codes')
      return result
    } catch (error) {
      this.logger.error('获取推广码列表失败', error)
      throw error
    }
  }

  /**
   * Function: generatePromoterCode
   *
   * Description: 生成新推广码
   *
   * Parameters:
   *   params(object): 推广码参数
   *   params.customCode(string): 自定义推广码（可选，type=custom 时需要）
   *   params.type(string): 推广码类型 'auto' | 'custom'（可选，默认 auto）
   *   params.activeTo(string): 失效时间 ISO（可选）
   *
   * Returns:
   *   Promise<object>: 生成的推广码信息
   */
  async generatePromoterCode(params = {}) {
    this.logger.info('生成推广码', params)
    try {
      const result = await httpClient.post('/user/promoter-codes/generate', params)
      this.logger.info('生成推广码成功')
      return result
    } catch (error) {
      this.logger.error('生成推广码失败', error)
      throw error
    }
  }

  /**
   * Function: enablePromoterCode
   *
   * Description: 启用推广码
   *
   * Parameters:
   *   codeId(string): 推广码 ID
   *
   * Returns:
   *   Promise<object>: 更新后的推广码
   */
  async enablePromoterCode(codeId) {
    this.logger.info('启用推广码', { codeId })
    try {
      const result = await httpClient.patch(`/user/promoter-codes/${codeId}/status`, { status: 'active' })
      return result
    } catch (error) {
      this.logger.error('启用推广码失败', error)
      throw error
    }
  }

  /**
   * Function: disablePromoterCode
   *
   * Description: 禁用推广码
   *
   * Parameters:
   *   codeId(string): 推广码 ID
   *
   * Returns:
   *   Promise<object>: 更新后的推广码
   */
  async disablePromoterCode(codeId) {
    this.logger.info('禁用推广码', { codeId })
    try {
      const result = await httpClient.patch(`/user/promoter-codes/${codeId}/status`, { status: 'inactive' })
      return result
    } catch (error) {
      this.logger.error('禁用推广码失败', error)
      throw error
    }
  }

  /**
   * Function: deletePromoterCode
   *
   * Description: 删除推广码
   *
   * Parameters:
   *   codeId(string): 推广码 ID
   *
   * Returns:
   *   Promise<object>: 删除结果
   */
  async deletePromoterCode(codeId) {
    this.logger.info('删除推广码', { codeId })
    try {
      const result = await httpClient.delete(`/user/promoter-codes/${codeId}`)
      return result
    } catch (error) {
      this.logger.error('删除推广码失败', error)
      throw error
    }
  }
}

/**
 * 导出单例
 */
export const distributionService = new DistributionService()

export default distributionService
