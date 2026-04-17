/**
 * 文件上传验证工具
 *
 * 使用 Magic Bytes 验证文件真实类型，防止 MIME 类型欺骗攻击
 */

import { fileTypeFromBuffer } from 'file-type'
import { isAllowedMediaType } from '@/lib/constants/file-types'
import type { ApiErrorCode } from '@/contracts/api-response.schema'

/**
 * 文件验证结果
 */
export interface FileValidationResult {
  /** 验证是否通过 */
  isValid: boolean
  /** 检测到的真实 MIME 类型 */
  detectedMime?: string
  /** 检测到的文件扩展名 */
  detectedExtension?: string
  /** 错误信息（验证失败时） */
  error?: {
    code: ApiErrorCode
    message: string
  }
}

/**
 * 验证文件的 Magic Bytes（文件签名）
 *
 * @param buffer - 文件内容的 Buffer
 * @param maxSizeBytes - 最大文件大小（字节）
 * @returns 验证结果
 *
 * @example
 * ```ts
 * import { logger } from '@/lib/logger'
 *
 * const result = await validateFileByMagicBytes(buffer, 200 * 1024 * 1024)
 * if (!result.isValid) {
 *   logger.error({ code: result.error?.code }, '文件验证失败')
 *   return
 * }
 * logger.debug({ detectedMime: result.detectedMime }, '检测到文件类型')
 * ```
 */
export async function validateFileByMagicBytes(
  buffer: Buffer,
  maxSizeBytes: number
): Promise<FileValidationResult> {
  // 检查空文件
  if (buffer.length === 0) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_INPUT',
        message: '上传的文件为空',
      },
    }
  }

  // 检查文件大小
  if (buffer.length > maxSizeBytes) {
    const maxSizeMB = Math.round(maxSizeBytes / 1024 / 1024)
    return {
      isValid: false,
      error: {
        code: 'INVALID_INPUT',
        message: `文件大小超过限制 (${maxSizeMB}MB)`,
      },
    }
  }

  // 检测文件类型（通过 Magic Bytes）
  const detection = await fileTypeFromBuffer(buffer)

  if (!detection) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_INPUT',
        message: '无法识别文件类型',
      },
    }
  }

  // 检查文件类型是否在允许列表中
  const isAllowed = isAllowedMediaType(detection.mime)

  if (!isAllowed) {
    return {
      isValid: false,
      detectedMime: detection.mime,
      detectedExtension: detection.ext,
      error: {
        code: 'INVALID_INPUT',
        message: `不支持的文件类型: ${detection.mime}`,
      },
    }
  }

  return {
    isValid: true,
    detectedMime: detection.mime,
    detectedExtension: detection.ext,
  }
}

/**
 * 获取安全的 Content-Type
 *
 * 优先使用检测出的类型，如果检测失败则使用声明的类型
 *
 * @param detectedMime - 检测到的 MIME 类型
 * @param declaredMime - 声明的 MIME 类型
 * @returns 安全的 Content-Type
 */
export function getSafeContentType(
  detectedMime: string | undefined,
  declaredMime: string
): string {
  if (detectedMime) {
    return detectedMime
  }
  // 检测失败时，使用声明的类型（但应该记录警告）
  return declaredMime || 'application/octet-stream'
}
