/**
 * Function: userService
 *
 * Description: 用户相关 API 服务，处理用户信息查询、上传权限等操作
 *
 * Returns:
 *	getUploadPermission(function): 获取用户上传权限
 */

import { httpClient } from '../../core/http-client'
import { logger } from '../../utils/logger'

/**
 * 用户服务类
 */
class UserService {
  constructor() {
    this.logger = logger.child({ service: 'user' })
  }

  /**
   * 获取用户上传权限
   * @returns {Promise<{canUpload: boolean}>} 上传权限信息
   */
  async getUploadPermission() {
    this.logger.info('获取用户上传权限')

    try {
      const result = await httpClient.get('/user/upload-permission')
      this.logger.info('获取用户上传权限成功', { canUpload: result.canUpload })
      return result
    } catch (error) {
      this.logger.error('获取用户上传权限失败', error)
      throw error
    }
  }

  /**
   * 微信资料补全（昵称 + 可选头像）
   * @param {object} params
   * @param {string} params.nickname - 昵称（必填）
   * @param {string} [params.avatarUrl] - 头像 URL（可选，不传则不更新头像）
   * @returns {Promise<{message: string}>}
   */
  async updateWechatProfile({ nickname, avatarUrl }) {
    this.logger.info('提交微信资料补全', { nickname })

    try {
      const payload = { nickname }
      // 仅在有值时传 avatarUrl，后端已支持可选
      if (avatarUrl) {
        payload.avatarUrl = avatarUrl
      }
      const result = await httpClient.post('/user/profile/wechat', payload)
      this.logger.info('资料补全成功')
      return result
    } catch (error) {
      this.logger.error('资料补全失败', error)
      throw error
    }
  }

  /**
   * 微信手机号绑定
   * @param {string} code - 手机号授权事件返回的 code
   * @returns {Promise<{message: string, phone: string}>}
   */
  async bindWechatPhone(code) {
    this.logger.info('提交微信手机号绑定')

    try {
      const result = await httpClient.post('/user/phone/wechat', { code })
      this.logger.info('手机号绑定成功')
      return result
    } catch (error) {
      this.logger.error('手机号绑定失败', error)
      throw error
    }
  }
}

/**
 * 导出单例
 */
export const userService = new UserService()

export default userService
