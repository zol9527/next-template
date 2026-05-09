/**
 * Function: faqService
 *
 * Description: 常见问题 API 服务，处理 FAQ 列表的获取与缓存
 *
 * Returns:
 *   getFaqList(function): 获取 FAQ 列表（从公开 API 获取启用的条目）
 *   clearCache(function): 清除缓存
 */

import { httpClient } from '../../core/http-client'
import { logger } from '../../utils/logger'

/**
 * FAQ 条目类型
 */
export interface FaqItem {
  id: string
  question: string
  answer: string
}

/**
 * 常见问题服务类
 */
class FaqService {
  private logger = logger.child({ service: 'faq' })
  private _cachedFaqs: FaqItem[] | null = null
  private _cacheTimestamp = 0
  private _cacheTTL = 30 * 60 * 1000 // 30 分钟缓存有效期

  /**
   * 获取 FAQ 列表（从公开 API 获取启用的条目）
   * @param {object} options - 选项
   * @param {boolean} options.forceRefresh - 是否强制刷新（默认 false）
   * @returns {Promise<FaqItem[]>} FAQ 列表
   */
  async getFaqList(options: { forceRefresh?: boolean } = {}): Promise<FaqItem[]> {
    const { forceRefresh = false } = options
    this.logger.info('获取 FAQ 列表', { forceRefresh })

    try {
      // 如果不强制刷新且缓存有效，返回缓存数据
      if (!forceRefresh && this._cachedFaqs && Date.now() - this._cacheTimestamp < this._cacheTTL) {
        this.logger.info('使用缓存的 FAQ 列表')
        return this._cachedFaqs
      }

      const result = await httpClient.get<FaqItem[]>('/public/miniprogram/faq')

      // 更新缓存
      this._cachedFaqs = result
      this._cacheTimestamp = Date.now()

      this.logger.info('获取 FAQ 列表成功', { count: result?.length || 0 })

      return result || []
    } catch (error) {
      this.logger.error('获取 FAQ 列表失败', error)

      // 如果请求失败但有缓存，返回缓存数据（降级）
      if (this._cachedFaqs) {
        this.logger.warn('使用缓存的 FAQ 列表（降级）')
        return this._cachedFaqs
      }

      throw error
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.logger.info('清除 FAQ 缓存')
    this._cachedFaqs = null
    this._cacheTimestamp = 0
  }
}

/**
 * 导出单例
 */
export const faqService = new FaqService()

export default faqService
