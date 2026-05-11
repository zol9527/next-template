/**
 * Function: uploadService
 *
 * Description: 文件上传服务模块，提供图片上传到服务器的功能
 *
 * 注意：使用 uni.uploadFile 发送 multipart/form-data 请求，
 * 因为 httpClient.post 不支持文件上传。
 */

import { logger } from '../../utils/logger'
import { config } from '../../config'
import { StorageKey } from '../../config/constants'

/** 上传图片响应接口 */
export interface UploadImageResponse {
  /** 图片公开访问 URL（相对路径，需要拼接 baseURL） */
  url: string
  /** 存储键 */
  key: string
}

/**
 * 上传图片到服务器
 *
 * @param filePath - 本地临时文件路径（由 uni.chooseImage 返回）
 * @returns Promise<UploadImageResponse> - 上传结果
 *
 * @example
 * ```ts
 * const result = await uploadService.uploadImage('wxfile://tmp_xxx.jpg')
 * // result.url = '/api/v1/public/files/uploads/feedback/2026-05-11/xxx.jpg'
 * ```
 */
export const uploadService = {
  async uploadImage(filePath: string): Promise<UploadImageResponse> {
    logger.info('上传图片', { filePath })

    const baseURL = config.api.baseURL
    const fullURL = `${baseURL}/user/upload/image`

    // 从 Storage 获取 accessToken
    const accessToken = uni.getStorageSync(StorageKey.ACCESS_TOKEN) as string

    return new Promise<UploadImageResponse>((resolve, reject) => {
      const uploadTask = uni.uploadFile({
        url: fullURL,
        filePath,
        name: 'file',
        header: {
          // 注入认证 token
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        success: (res) => {
          // uni.uploadFile 的 statusCode 是数字类型
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const data = JSON.parse(res.data)

              // 后端统一响应格式：{ success: true, data: { url, key } }
              if (data.success && data.data) {
                // 将相对 URL 转为完整 URL
                const imageUrl = data.data.url.startsWith('http')
                  ? data.data.url
                  : `${baseURL.replace('/api/v1', '')}${data.data.url}`

                logger.info('上传图片成功', { url: imageUrl })
                resolve({
                  url: imageUrl,
                  key: data.data.key,
                })
              } else {
                // 后端返回了业务错误
                const errorMessage = data.error?.message || '上传失败'
                logger.warn('上传图片失败（业务错误）', { error: data.error })
                reject(new Error(errorMessage))
              }
            } catch (parseError) {
              logger.error('上传图片响应解析失败', parseError)
              reject(new Error('上传响应解析失败'))
            }
          } else {
            // HTTP 非 2xx
            let errorMessage = `上传失败 (HTTP ${res.statusCode})`
            try {
              const data = JSON.parse(res.data)
              if (data.error?.message) {
                errorMessage = data.error.message
              }
            } catch {
              // 解析失败就用默认错误消息
            }
            logger.warn('上传图片失败（HTTP 错误）', { statusCode: res.statusCode })
            reject(new Error(errorMessage))
          }
        },
        fail: (err) => {
          logger.error('上传图片网络错误', err)
          reject(new Error(err.errMsg || '网络错误'))
        },
      })

      // 监听上传进度（可选，用于未来展示进度条）
      uploadTask.onProgressUpdate((res) => {
        logger.debug('上传进度', {
          progress: res.progress,
          totalBytesSent: res.totalBytesSent,
          totalBytesExpectedToSend: res.totalBytesExpectedToSend,
        })
      })
    })
  },
}
