/**
 * User Documents Service - 用户证件管理 API 服务
 */

import { httpClient } from '../core/http-client'
import { logger } from '../utils/logger'
import { StorageKey } from '../config/constants'
import { config } from '../config/index'

function getApiBaseUrl() {
  // 使用 getBaseURL 方法获取，如果没有则使用 config
  return httpClient.getBaseURL() || config?.api?.baseURL || ''
}

export const DocumentType = {
  ID_CARD: 'id_card',
  UNEMPLOYMENT_PROOF: 'unemployment_proof',
  MEDICAL_INSURANCE: 'medical_insurance'
}

export const DocumentTypeLabels = {
  [DocumentType.ID_CARD]: '身份证',
  [DocumentType.UNEMPLOYMENT_PROOF]: '失业证明',
  [DocumentType.MEDICAL_INSURANCE]: '医疗保险'
}

export class UserDocumentsService {
  /**
   * 获取用户证件列表
   */
  static async getDocuments() {
    logger.debug('获取用户证件列表')
    return await httpClient.get('/user/documents')
  }

  /**
   * Function: uploadDocument
   *
   * Description: 上传证件文件
   *
   * Parameters:
   *   params(object): 上传参数
   *   params.file(string): 本地文件路径（临时路径）
   *   params.documentType(string): 证件类型
   *   params.documentName(string): 证件名称（可选）
   *
   * Returns:
   *   object: API 响应结果
   */
  static async uploadDocument(params) {
    logger.debug('上传用户证件', params)

    const { file, documentType, documentName } = params
    const baseUrl = getApiBaseUrl()
    const url = `${baseUrl}/user/documents`

    logger.debug('准备上传', { file, documentType, url })

    // 获取认证 token
    const token = uni.getStorageSync(StorageKey.ACCESS_TOKEN)

    logger.debug('Token 获取结果', { hasToken: !!token })

    return new Promise((resolve, reject) => {
      logger.debug('开始调用 uni.uploadFile')

      uni.uploadFile({
        url,
        filePath: file,
        name: 'file',
        formData: {
          documentType,
          documentName: documentName || ''
        },
        header: {
          // 添加认证头
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          // 不设置 Content-Type，让 uni.uploadFile 自动处理 multipart/form-data
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data)

            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data)
              return
            }

            const errorMessage = data?.error?.message || `上传失败（${res.statusCode}）`
            const err = new Error(errorMessage)
            err.statusCode = res.statusCode
            err.response = data
            reject(err)
          } catch (e) {
            logger.error('解析响应失败', e, res.data)
            reject(new Error('解析响应失败'))
          }
        },
        fail: (err) => {
          logger.error('上传失败', err)
          // 打印完整的错误信息，包括 errMsg
          if (err && err.errMsg) {
            logger.error('上传失败详细信息', {
              errMsg: err.errMsg,
              code: err.code,
              data: err.data
            })
          }
          reject(err)
        }
      })
    })
  }

  /**
   * 删除证件
   */
  static async deleteDocument(id) {
    logger.debug('删除用户证件', { id })
    return await httpClient.delete(`/user/documents/${id}`)
  }

  /**
   * 获取证件文件 URL
   * 使用内部 API 路径，需要认证才能访问
   */
  static getDocumentFileUrl(id) {
    const baseUrl = getApiBaseUrl()
    return `${baseUrl}/user/documents/${id}/file`
  }

  /**
   * Function: downloadDocumentFile
   *
   * Description: 下载证件文件到本地临时目录（带认证）
   *
   * Parameters:
   *   id(string): 证件 ID
   *
   * Returns:
   *   Promise<string>: 本地临时文件路径
   */
  static async downloadDocumentFile(id) {
    const url = UserDocumentsService.getDocumentFileUrl(id)
    const token = uni.getStorageSync(StorageKey.ACCESS_TOKEN)

    logger.info('下载证件文件开始', { id, url, hasToken: !!token, tokenLength: token?.length || 0 })

    if (!url) {
      logger.error('下载证件文件失败：URL 为空')
      throw new Error('API 地址未配置')
    }

    return new Promise((resolve, reject) => {
      const downloadTask = uni.downloadFile({
        url,
        header: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        success: (res) => {
          logger.info('下载响应', { statusCode: res.statusCode, tempFilePath: res.tempFilePath })
          if (res.statusCode === 200) {
            logger.info('证件文件下载成功', { tempFilePath: res.tempFilePath })
            resolve(res.tempFilePath)
          } else {
            logger.error('证件文件下载失败', { statusCode: res.statusCode, data: res.data })
            reject(new Error(`下载失败（${res.statusCode}）`))
          }
        },
        fail: (err) => {
          logger.error('证件文件下载网络错误', { errMsg: err.errMsg, err })
          reject(new Error(err.errMsg || '网络错误'))
        }
      })

      // 监听下载进度（可选，用于调试）
      downloadTask.onProgressUpdate?.((res) => {
        logger.debug('下载进度', { progress: res.progress, totalBytesWritten: res.totalBytesWritten })
      })
    })
  }
}
