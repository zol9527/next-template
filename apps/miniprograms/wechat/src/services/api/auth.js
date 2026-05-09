/**
 * Function: authService
 *
 * Description: 认证相关 API 服务，处理登录、登出、获取用户信息等操作
 *
 * Returns:
 *	loginWithPassword(function): 密码登录
 *	loginWithWechat(function): 微信登录
 *	getCurrentUser(function): 获取当前用户
 *	logout(function): 退出登录
 */

import { httpClient } from '../../core/http-client'
import { logger } from '../../utils/logger'
import { StorageKey } from '../../config/constants'
import { storage } from '../../utils/storage'

/**
 * 认证服务类
 */
class AuthService {
  constructor() {
    this.logger = logger.child({ service: 'auth' })
  }

  /**
   * 密码登录
   * @param {string} identifier - 用户名/邮箱/手机号
   * @param {string} password - 密码
   * @returns {Promise<{userId: string, accessToken: string, refreshToken: string}>} 登录结果
   */
  async loginWithPassword(identifier, password) {
    this.logger.info('开始密码登录', { identifier })

    try {
      const result = await httpClient.post('/auth/login', {
        identifier,
        password
      })

      // 保存 token 到本地存储
      if (result.accessToken) {
        storage.set(StorageKey.ACCESS_TOKEN, result.accessToken)
        this.logger.debug('已保存 accessToken')
      }
      if (result.refreshToken) {
        storage.set(StorageKey.REFRESH_TOKEN, result.refreshToken)
        this.logger.debug('已保存 refreshToken')
      }

      this.logger.info('密码登录成功', { userId: result.userId })
      return result
    } catch (error) {
      this.logger.error('密码登录失败', error, { identifier })
      throw error
    }
  }

  /**
   * 微信登录
   * @param {string} code - 微信登录 code
   * @returns {Promise<{userId: string}>} 登录结果
   */
  async loginWithWechat(code) {
    this.logger.info('开始微信登录')

    try {
      const result = await httpClient.post('/auth/wechat', { code })

      this.logger.info('微信登录成功', { userId: result.userId })
      return result
    } catch (error) {
      this.logger.error('微信登录失败', error)
      throw error
    }
  }

  /**
   * 获取当前用户信息
   * @returns {Promise<{user, roles, permissions}>} 用户信息
   */
  async getCurrentUser() {
    this.logger.info('获取当前用户信息')

    try {
      const result = await httpClient.get('/user/me')

      // 缓存用户信息
      storage.setJSON(StorageKey.USER_INFO, result)

      this.logger.info('获取用户信息成功', { userId: result.user?.id })
      return result
    } catch (error) {
      this.logger.error('获取用户信息失败', error)
      throw error
    }
  }

  /**
   * 刷新 Token
   * @returns {Promise} 刷新结果
   */
  async refreshToken() {
    this.logger.info('刷新 Token')

    try {
      const result = await httpClient.post('/auth/refresh')

      this.logger.info('Token 刷新成功')
      return result
    } catch (error) {
      this.logger.error('Token 刷新失败', error)
      throw error
    }
  }

  /**
   * 退出登录
   * @returns {Promise<void>}
   */
  async logout() {
    this.logger.info('开始退出登录')

    try {
      await httpClient.post('/auth/logout')
      this.logger.info('退出登录成功')
    } catch (error) {
      this.logger.error('退出登录请求失败', error)
      // 即使请求失败也继续清除本地数据
    } finally {
      // 清除本地存储
      storage.remove(StorageKey.ACCESS_TOKEN)
      storage.remove(StorageKey.REFRESH_TOKEN)
      storage.remove(StorageKey.USER_INFO)
      storage.remove(StorageKey.COOKIES)
    }
  }

  /**
   * 检查登录状态
   * @returns {boolean} 是否已登录
   */
  isLoggedIn() {
    const token = storage.get(StorageKey.ACCESS_TOKEN)
    return !!token
  }

  /**
   * 获取缓存的用户信息
   * @returns {object|null} 用户信息
   */
  getCachedUserInfo() {
    return storage.getJSON(StorageKey.USER_INFO, null)
  }

  /**
   * 获取 Token
   * @returns {string|null} Token
   */
  getToken() {
    return storage.get(StorageKey.ACCESS_TOKEN, null)
  }

  /**
   * 设置 Token
   * @param {string} token - Token
   */
  setToken(token) {
    storage.set(StorageKey.ACCESS_TOKEN, token)
  }
}

/**
 * 导出单例
 */
export const authService = new AuthService()

export default authService
