/**
 * Module: ip-extractor
 *
 * Description: 安全的客户端 IP 提取和验证工具
 */

import type { NextRequest } from 'next/server'
import { env } from '@/config'

/**
 * Type: IpExtractionOptions
 *
 * Description: IP 提取选项
 */
export interface IpExtractionOptions {
  trustProxy?: boolean // 是否信任反向代理头
  allowPrivateIp?: boolean // 是否允许内网 IP
  requireIp?: boolean // 是否必须要求 IP
}

/**
 * Type: IpExtractionResult
 *
 * Description: IP 提取结果
 */
export interface IpExtractionResult {
  ip: string | null
  reason?: string // IP 为 null 时的原因
}

/**
 * Function: extractClientIpSafe
 *
 * Description: 安全地从请求中提取客户端 IP
 *
 * Parameters:
 *   req(NextRequest): Next.js 请求对象
 *   options(IpExtractionOptions): 提取选项
 *
 * Returns:
 *   IpExtractionResult: 提取结果
 */
export function extractClientIpSafe(
  req: NextRequest,
  options: IpExtractionOptions = {}
): IpExtractionResult {
  const {
    trustProxy = env.RATE_LIMIT_TRUST_PROXY,
    allowPrivateIp = env.RATE_LIMIT_ALLOW_PRIVATE_IP,
    requireIp = env.RATE_LIMIT_REQUIRE_IP,
  } = options

  // 按优先级尝试获取 IP
  const sources = [
    trustProxy ? { name: 'cf-connecting-ip', value: req.headers.get('cf-connecting-ip') } : null,
    trustProxy ? { name: 'x-forwarded-for', value: req.headers.get('x-forwarded-for') } : null,
    trustProxy ? { name: 'x-real-ip', value: req.headers.get('x-real-ip') } : null,
  ].filter(Boolean)

  for (const source of sources) {
    if (!source) continue

    let ipStr = source.value

    // X-Forwarded-For 可能包含多个 IP，取第一个
    if (source.name === 'x-forwarded-for' && ipStr) {
      ipStr = ipStr.split(',')[0]?.trim()
    }

    if (!ipStr) continue

    const cleanIp = validateAndSanitizeIp(ipStr, { allowPrivateIp })
    if (cleanIp) {
      return { ip: cleanIp }
    }
  }

  // 无法获取有效 IP
  if (requireIp) {
    return {
      ip: null,
      reason: sources.length === 0 ? 'no_ip_source' : 'invalid_ip_format',
    }
  }

  return { ip: null, reason: 'ip_not_required' }
}

/**
 * Function: validateAndSanitizeIp
 *
 * Description: 验证并清理 IP 地址
 *
 * Parameters:
 *   ip(string): 原始 IP 字符串
 *   options(object): 验证选项
 *
 * Returns:
 *   string | null: 清理后的 IP 或 null（验证失败）
 */
export function validateAndSanitizeIp(
  ip: string,
  options: { allowPrivateIp?: boolean } = {}
): string | null {
  const { allowPrivateIp = env.RATE_LIMIT_ALLOW_PRIVATE_IP } = options

  // 清理空格
  const cleanIp = ip.trim()

  // 拒绝 0.0.0.0
  if (cleanIp === '0.0.0.0' || cleanIp === '::') {
    return null
  }

  // IPv4 格式验证
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/

  // IPv6 格式验证（简化版，支持完整地址和缩写形式）
  const ipv6Regex =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::1|::|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+|::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9]))$/

  if (!ipv4Regex.test(cleanIp) && !ipv6Regex.test(cleanIp)) {
    return null
  }

  // 内网 IP 检查
  const privateIpPatterns = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^::1$/,
    /^localhost$/i,
    /^0\./, // 拒绝 0.x.x.x
  ]

  const isPrivateIp = privateIpPatterns.some((pattern) => pattern.test(cleanIp))

  if (isPrivateIp && !allowPrivateIp) {
    return null
  }

  return cleanIp
}
