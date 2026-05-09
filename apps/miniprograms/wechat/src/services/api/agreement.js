/**
 * Module: agreements
 *
 * Description: 协议相关 API 服务
 * 包括用户协议、隐私政策等
 */

import { httpClient } from '../../core/http-client'
import { logger } from '../../utils/logger'

/**
 * 协议服务类
 */
class AgreementService {
  constructor() {
    this.logger = logger.child({ service: 'agreement' })
  }

  /**
   * Function: getAgreementByType
   *
   * Description: 根据协议类型获取协议内容
   *
   * Parameters:
   *   type {string}: 协议类型（USER_AGREEMENT/PRIVACY_POLICY）
   *
   * Returns:
   *   Promise<object>: 协议内容对象
   *     - id {number}: 协议 ID
   *     - title {string}: 协议标题
   *     - content {string}: 协议内容（富文本 HTML）
   *     - type {string}: 协议类型
   *     - version {string}: 协议版本
   *     - effectiveDate {string}: 生效日期
   *     - createdAt {string}: 创建时间
   *     - updatedAt {string}: 更新时间
   */
  async getAgreementByType(type) {
    this.logger.info('获取协议内容', { type })

    try {
      const result = await httpClient.get(`/public/agreements/by-type/${type}`)
      this.logger.info('获取协议内容成功', { type })
      return result
    } catch (error) {
      this.logger.error('获取协议内容失败', error, { type })
      throw error
    }
  }
}

/**
 * 导出单例
 */
export const agreementService = new AgreementService()

export default agreementService
