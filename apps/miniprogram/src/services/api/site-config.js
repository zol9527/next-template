/**
 * Function: siteConfigService
 *
 * Description: 站点配置相关 API 服务，处理站点配置、公告和协议的获取
 *
 * Returns:
 * 	getConfig(function): 获取统一配置（站点配置 + 公告 + 协议）
 * 	getSiteConfig(function): 仅获取站点配置
 * 	getAnnouncements(function): 获取公告列表
 * 	getAgreement(function): 根据类型获取协议
 */

import { httpClient } from '../../core/http-client'
import { logger } from '../../utils/logger'

/**
 * 站点配置服务类
 */
class SiteConfigService {
  constructor() {
    this.logger = logger.child({ service: 'site-config' })
    // 缓存配置数据，key 为配置类型，value 为 { data, updatedAt, version }
    this._cache = {
      siteConfig: null,
      announcements: null,
      agreements: null,
    }
    // 缓存时间戳
    this._cacheTimestamps = {
      siteConfig: 0,
      announcements: 0,
      agreements: 0,
    }
    // 缓存有效期（30分钟）
    this._cacheTTL = 30 * 60 * 1000
  }

  /**
   * 检查缓存是否有效
   * @param {string} type - 缓存类型
   * @param {string} remoteVersion - 远程版本号（用于判断是否需要更新）
   * @returns {boolean} 缓存是否有效
   */
  _isCacheValid(type, remoteVersion = null) {
    const now = Date.now()
    const timestamp = this._cacheTimestamps[type] || 0

    // 如果缓存不存在或已过期
    if (now - timestamp > this._cacheTTL) {
      return false
    }

    // 如果提供了远程版本号，检查版本是否一致
    if (remoteVersion && this._cache[type]?.version !== remoteVersion) {
      return false
    }

    return true
  }

  /**
   * 设置缓存
   * @param {string} type - 缓存类型
   * @param {any} data - 数据
   * @param {string} version - 版本号
   */
  _setCache(type, data, version = null) {
    this._cache[type] = { data, version }
    this._cacheTimestamps[type] = Date.now()
    this.logger.info(`缓存已更新: ${type}`, { version })
  }

  /**
   * 获取统一配置（站点配置 + 公告 + 协议）
   * 推荐使用此方法一次性获取所有配置
   * @param {object} options - 选项
   * @param {boolean} options.forceRefresh - 是否强制刷新（默认 false）
   * @returns {Promise<object>} 统一配置响应
   */
  async getConfig(options = {}) {
    const { forceRefresh = false } = options
    this.logger.info('获取统一配置', { forceRefresh })

    try {
      // 如果不强制刷新且缓存有效，返回缓存数据
      if (!forceRefresh && this._isCacheValid('unified')) {
        this.logger.info('使用缓存的统一配置')
        return this._cache['unified']?.data || {}
      }

      const result = await httpClient.get('/public/config')

      // 更新缓存（使用 updatedAt 作为版本号）
      this._setCache('unified', result, result.siteConfig?.updatedAt)
      this._setCache('siteConfig', result.siteConfig, result.siteConfig?.updatedAt)
      this._setCache('announcements', result.announcements, result.siteConfig?.updatedAt)
      this._setCache('agreements', result.agreements, result.siteConfig?.updatedAt)

      this.logger.info('获取统一配置成功', {
        hasSiteConfig: !!result.siteConfig,
        announcementCount: result.announcements?.length || 0,
        agreementCount: Object.values(result.agreements || {}).filter((a) => a !== null).length,
      })

      return result
    } catch (error) {
      this.logger.error('获取统一配置失败', error)

      // 如果请求失败但有缓存，返回缓存数据
      if (this._cache['unified']) {
        this.logger.warn('使用缓存的统一配置（降级）')
        return this._cache['unified'].data
      }

      throw error
    }
  }

  /**
   * 获取站点配置
   * @param {object} options - 选项
   * @param {boolean} options.forceRefresh - 是否强制刷新（默认 false）
   * @returns {Promise<object>} 站点配置
   */
  async getSiteConfig(options = {}) {
    const { forceRefresh = false } = options
    this.logger.info('获取站点配置', { forceRefresh })

    try {
      // 如果不强制刷新且缓存有效，返回缓存数据
      if (!forceRefresh && this._cache.siteConfig) {
        this.logger.info('使用缓存的站点配置')
        return this._cache.siteConfig.data
      }

      // 通过统一接口获取
      const result = await this.getConfig({ forceRefresh })
      return result.siteConfig || {}
    } catch (error) {
      this.logger.error('获取站点配置失败', error)
      throw error
    }
  }

  /**
   * 获取公告列表
   * @param {object} options - 选项
   * @param {number} options.limit - 返回数量（默认 20）
   * @param {boolean} options.forceRefresh - 是否强制刷新（默认 false）
   * @returns {Promise<object>} 公告列表响应
   */
  async getAnnouncements(options = {}) {
    const { limit = 20, forceRefresh = false } = options
    this.logger.info('获取公告列表', { limit, forceRefresh })

    try {
      // 如果不强制刷新且缓存有效，返回缓存数据
      if (!forceRefresh && this._cache.announcements) {
        this.logger.info('使用缓存的公告列表')
        return { items: this._cache.announcements.data }
      }

      // 通过统一接口获取
      const result = await this.getConfig({ forceRefresh })
      return { items: result.announcements || [] }
    } catch (error) {
      this.logger.error('获取公告列表失败', error)

      // 如果请求失败但有缓存，返回缓存数据
      if (this._cache.announcements) {
        this.logger.warn('使用缓存的公告列表（降级）')
        return { items: this._cache.announcements.data }
      }

      throw error
    }
  }

  /**
   * 根据类型获取协议
   * @param {string} type - 协议类型（USER_AGREEMENT, PRIVACY_POLICY, ABOUT_US）
   * @param {object} options - 选项
   * @param {boolean} options.forceRefresh - 是否强制刷新（默认 false）
   * @returns {Promise<object>} 协议内容
   */
  async getAgreement(type, options = {}) {
    const { forceRefresh = false } = options
    this.logger.info('获取协议', { type, forceRefresh })

    if (!['USER_AGREEMENT', 'PRIVACY_POLICY', 'ABOUT_US'].includes(type)) {
      const error = new Error(`Invalid agreement type: ${type}`)
      this.logger.error('无效的协议类型', error)
      throw error
    }

    try {
      // 如果不强制刷新且缓存有效，返回缓存数据
      if (!forceRefresh && this._cache.agreements) {
        const cached = this._cache.agreements.data?.[type]
        if (cached) {
          this.logger.info('使用缓存的协议', { type })
          return cached
        }
      }

      // 通过统一接口获取
      const result = await this.getConfig({ forceRefresh })
      const agreement = result.agreements?.[type]

      if (!agreement) {
        throw new Error(`Agreement not found: ${type}`)
      }

      return agreement
    } catch (error) {
      this.logger.error('获取协议失败', error, { type })

      // 如果请求失败但有缓存，返回缓存数据
      if (this._cache.agreements) {
        const cached = this._cache.agreements.data?.[type]
        if (cached) {
          this.logger.warn('使用缓存的协议（降级）', { type })
          return cached
        }
      }

      throw error
    }
  }

  /**
   * 清除所有缓存
   * 当用户主动刷新或重新进入小程序时调用
   */
  clearCache() {
    this.logger.info('清除所有缓存')
    this._cache = {
      siteConfig: null,
      announcements: null,
      agreements: null,
      unified: null,
    }
    this._cacheTimestamps = {
      siteConfig: 0,
      announcements: 0,
      agreements: 0,
      unified: 0,
    }
  }

  /**
   * 预加载配置
   * 在小程序启动时调用，预热缓存
   */
  async preloadConfig() {
    this.logger.info('预加载配置')
    try {
      await this.getConfig({ forceRefresh: true })
    } catch (error) {
      this.logger.warn('预加载配置失败', error)
      // 预加载失败不影响小程序启动
    }
  }
}

/**
 * 导出单例
 */
export const siteConfigService = new SiteConfigService()

export default siteConfigService
