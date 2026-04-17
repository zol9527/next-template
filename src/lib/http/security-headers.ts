/**
 * Module: security-headers
 *
 * Description: 安全响应头生成工具
 *
 * 提供 CSP (Content Security Policy) 和其他安全头的运行时生成
 */

/**
 * Function: parseUrlList
 *
 * Description: 解析逗号分隔的 URL 列表
 *
 * Parameters:
 *   value(string | undefined): 逗号分隔的 URL 字符串
 *
 * Returns:
 *   urls(string[]): URL 数组
 */
function parseUrlList(value: string | undefined): string[] {
  if (!value) return []

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

/**
 * Function: collectConfiguredUrls
 *
 * Description: 从环境变量收集所有配置的 URL
 *
 * Returns:
 *   urls(string[]): 配置的 URL 数组
 */
function collectConfiguredUrls(): string[] {
  return [
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.ALIYUN_OSS_UPLOAD_HOST,
    process.env.NEXT_PUBLIC_ALIYUN_OSS_UPLOAD_HOST,
    process.env.TENCENT_COS_CDN_HOST,
    process.env.NEXT_PUBLIC_TENCENT_COS_UPLOAD_HOST,
    ...parseUrlList(process.env.AUTH_ALLOWED_ORIGINS),
  ].filter((value): value is string => Boolean(value))
}

/**
 * Function: extractOriginForCsp
 *
 * Description: 从 URL 中提取精确的 origin（用于 CSP）
 *
 * Parameters:
 *   url(string | undefined): 完整 URL
 *
 * Returns:
 *   origin(string): origin 或空字符串
 *
 * @example
 * extractOriginForCsp('https://oss.shuoboda.cn/path')
 * // returns 'https://oss.shuoboda.cn'
 */
function extractOriginForCsp(url: string | undefined): string {
  if (!url) return ''

  try {
    const parsed = new URL(url)
    return parsed.origin
  } catch {
    return ''
  }
}

/**
 * Function: extractWildcardOriginForCsp
 *
 * Description: 从 URL 中提取通配符 origin（用于 CSP）
 *
 * Parameters:
 *   url(string | undefined): 完整 URL
 *
 * Returns:
 *   wildcardOrigin(string): 通配符 origin 或空字符串
 *
 * @example
 * extractWildcardOriginForCsp('https://oss.shuoboda.cn/path')
 * // returns 'https://*.shuoboda.cn'
 */
function extractWildcardOriginForCsp(url: string | undefined): string {
  if (!url) return ''

  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname

    // localhost 和 IP 地址不支持通配符
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return ''
    }

    const parts = hostname.split('.')
    if (parts.length < 2) {
      return ''
    }

    // 提取顶级域名（最后两部分）
    const domain = parts.slice(-2).join('.')
    return `${parsed.protocol}//*.${domain}`
  } catch {
    return ''
  }
}

/**
 * Function: buildCspConnectSrc
 *
 * Description: 构建 CSP connect-src 指令
 *
 * 包含：
 * - 'self' (同源)
 * - 从环境变量动态提取的云存储/API 域名
 * - 微信 API (硬编码)
 *
 * Returns:
 *   connectSrc(string): connect-src 指令值
 */
function buildCspConnectSrc(): string {
  const sources = new Set<string>(["'self'"])

  const addSource = (value: string) => {
    if (value) {
      sources.add(value)
    }
  }

  // 从所有配置的 URL 中提取 origin（精确 + 通配符）
  for (const configuredUrl of collectConfiguredUrls()) {
    addSource(extractOriginForCsp(configuredUrl))
    addSource(extractWildcardOriginForCsp(configuredUrl))
  }

  // 微信 API (硬编码，因为这些是微信官方固定域名)
  addSource('https://api.weixin.qq.com')
  addSource('https://api.mch.weixin.qq.com')

  return Array.from(sources).join(' ')
}

/**
 * Function: buildContentSecurityPolicy
 *
 * Description: 构建完整的 Content-Security-Policy 头值
 *
 * Returns:
 *   csp(string): CSP 策略字符串
 */
export function buildContentSecurityPolicy(): string {
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https: blob:`,
    `font-src 'self' data:`,
    `connect-src ${buildCspConnectSrc()}`,
    `frame-src 'none'`,
  ]

  return directives.join('; ')
}

/**
 * Function: getSecurityHeaders
 *
 * Description: 获取所有安全响应头（Map 格式）
 *
 * Returns:
 *   headers(Map<string, string>): 安全头键值对
 */
export function getSecurityHeaders(): Map<string, string> {
  return new Map([
    ['X-DNS-Prefetch-Control', 'on'],
    ['Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload'],
    ['X-Frame-Options', 'SAMEORIGIN'],
    ['X-Content-Type-Options', 'nosniff'],
    ['X-XSS-Protection', '1; mode=block'],
    ['Referrer-Policy', 'origin'],
    ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
    ['Content-Security-Policy', buildContentSecurityPolicy()],
  ])
}
