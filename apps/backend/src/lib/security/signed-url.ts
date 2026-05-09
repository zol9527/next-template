/**
 * Signed URL 工具
 *
 * @module lib/security/signed-url
 * @description 导出文件下载签名 URL 生成与验证
 *
 * =============================================================================
 *
 * 功能特性:
 * - HMAC-SHA256 签名机制，防止 URL 伪造
 * - 可配置过期时间（默认 30 分钟）
 * - 时序安全比较，防止时序攻击
 *
 * =============================================================================
 *
 * Token 格式: {exportJobId}:{expiresTimestamp}:{signature}
 * 签名输入: {exportJobId}:{expiresTimestamp}
 * 签名密钥: AUTH_REFRESH_TOKEN_PEPPER（复用已有密钥）
 *
 * =============================================================================
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '@/config/env.mjs'

/** 导出文件下载链接默认有效期（30 分钟） */
const DEFAULT_EXPORT_URL_TTL_SECONDS = 30 * 60

/**
 * Function: getSigningSecret
 *
 * Description: 获取签名密钥
 *
 * Returns:
 *   secret(string): 签名密钥
 *
 * Throws:
 *   Error: 当 AUTH_REFRESH_TOKEN_PEPPER 未配置时抛出错误
 */
function getSigningSecret(): string {
  const secret = env.AUTH_REFRESH_TOKEN_PEPPER
  if (!secret) {
    throw new Error('AUTH_REFRESH_TOKEN_PEPPER is not configured')
  }
  return secret
}

/**
 * Function: computeSignature
 *
 * Description: 计算签名 HMAC-SHA256
 *
 * Parameters:
 *   payload(string): 签名输入（exportJobId:expiresTimestamp）
 *   secret(string): 签名密钥
 *
 * Returns:
 *   signature(string): hex 格式的签名字符串
 */
function computeSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

/**
 * Function: generateSignedToken
 *
 * Description: 为导出任务生成签名 token
 *
 * Parameters:
 *   exportJobId(string): 导出任务 ID
 *   ttlSeconds(number): 有效期（秒），默认 30 分钟
 *
 * Returns:
 *   token(string): 签名 token，格式 {exportJobId}:{expiresTimestamp}:{signature}
 *
 * @example
 * ```ts
 * const token = generateSignedToken('job-123')
 * // => "job-123:1710000000000:a1b2c3d4..."
 * ```
 */
export function generateSignedToken(exportJobId: string, ttlSeconds: number = DEFAULT_EXPORT_URL_TTL_SECONDS): string {
  const secret = getSigningSecret()
  const expiresTimestamp = Date.now() + ttlSeconds * 1000
  const payload = `${exportJobId}:${expiresTimestamp}`
  const signature = computeSignature(payload, secret)
  return `${payload}:${signature}`
}

/**
 * Function: verifySignedToken
 *
 * Description: 验证签名 token 的有效性
 *
 * Parameters:
 *   token(string): 签名 token
 *   exportJobId(string): 期望的导出任务 ID
 *
 * Returns:
 *   result(object): 验证结果
 *     valid(boolean): 是否有效
 *     reason(string | undefined): 无效原因
 */
export function verifySignedToken(
  token: string,
  exportJobId: string
): { valid: true } | { valid: false; reason: string } {
  const parts = token.split(':')
  // token 格式: {exportJobId}:{expiresTimestamp}:{signature}
  // exportJobId 可能包含冒号（如 UUID），所以从右侧解析
  if (parts.length < 3) {
    return { valid: false, reason: 'INVALID_FORMAT' }
  }

  const signature = parts[parts.length - 1]
  const expiresTimestampStr = parts[parts.length - 2]
  const tokenJobId = parts.slice(0, parts.length - 2).join(':')

  // 验证任务 ID 匹配
  if (tokenJobId !== exportJobId) {
    return { valid: false, reason: 'JOB_ID_MISMATCH' }
  }

  // 验证过期时间
  const expiresTimestamp = Number(expiresTimestampStr)
  if (Number.isNaN(expiresTimestamp) || Date.now() > expiresTimestamp) {
    return { valid: false, reason: 'TOKEN_EXPIRED' }
  }

  // 验证签名
  const secret = getSigningSecret()
  const payload = `${tokenJobId}:${expiresTimestampStr}`
  const expectedSignature = computeSignature(payload, secret)

  if (signature.length !== expectedSignature.length) {
    return { valid: false, reason: 'INVALID_SIGNATURE' }
  }

  const isValid = timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  )

  if (!isValid) {
    return { valid: false, reason: 'INVALID_SIGNATURE' }
  }

  return { valid: true }
}

/**
 * Function: buildSignedDownloadUrl
 *
 * Description: 构建带签名的下载 URL
 *
 * Parameters:
 *   exportJobId(string): 导出任务 ID
 *   ttlSeconds(number): 有效期（秒），默认 30 分钟
 *
 * Returns:
 *   url(string): 带签名的下载 URL
 *
 * @example
 * ```ts
 * const url = buildSignedDownloadUrl('job-123')
 * // => "/api/v1/admin/exports/job-123/download?token=job-123:1710000000000:a1b2c3d4..."
 * ```
 */
export function buildSignedDownloadUrl(exportJobId: string, ttlSeconds: number = DEFAULT_EXPORT_URL_TTL_SECONDS): string {
  const token = generateSignedToken(exportJobId, ttlSeconds)
  return `/api/v1/admin/exports/${exportJobId}/download?token=${encodeURIComponent(token)}`
}
