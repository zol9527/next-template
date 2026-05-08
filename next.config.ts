import type { NextConfig } from "next";

type ImagesConfig = NonNullable<NextConfig['images']>
type ImageRemotePattern = NonNullable<ImagesConfig['remotePatterns']>[number]

function parseUrlList(value: string | undefined): string[] {
  if (!value) return []

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

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
 * 从 URL 中提取顶级域名（用于通配符匹配）
 *
 * @param url - 完整 URL 或 undefined
 * @returns 顶级域名（如 aliyuncs.com）或 null
 *
 * @example
 * extractTopDomain('https://server-test-bucket.oss-cn-chengdu.aliyuncs.com/path')
 * // returns 'aliyuncs.com'
 */
function extractTopDomain(url: string | undefined): string | null {
  if (!url) return null

  try {
    const hostname = new URL(url).hostname
    const parts = hostname.split('.')
    // 提取最后两部分作为顶级域名
    if (parts.length >= 2) {
      return parts.slice(-2).join('.')
    }
    return hostname
  } catch {
    return null
  }
}

/**
 * 构建 next/image 允许的远程图片域名模式
 *
 * 从环境变量中动态提取云存储域名：
 * - Supabase (SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL)
 * - 阿里云 OSS (ALIYUN_OSS_UPLOAD_HOST)
 * - 腾讯云 COS (TENCENT_COS_CDN_HOST)
 */
function buildImageRemotePatterns() {
  const patterns: ImageRemotePattern[] = []
  const seenDomains = new Set<string>()

  // 辅助函数：添加域名模式（避免重复）
  const addDomainPattern = (topDomain: string | null) => {
    if (!topDomain || seenDomains.has(topDomain)) return
    seenDomains.add(topDomain)
    patterns.push({
      protocol: 'https',
      hostname: `*.${topDomain}`,
    })
  }

  for (const configuredUrl of collectConfiguredUrls()) {
    addDomainPattern(extractTopDomain(configuredUrl))
  }

  // 如果环境变量未设置，添加默认的通配符模式作为兜底
  if (patterns.length === 0) {
    patterns.push(
      { protocol: 'https', hostname: '*.aliyuncs.com' },
      { protocol: 'https', hostname: '*.myqcloud.com' },
      { protocol: 'https', hostname: '*.supabase.co' }
    )
  }

  return patterns
}

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,

  // 配置允许的远程图片域名（用于 next/image 组件）
  // 从环境变量动态提取云存储域名
  images: {
    remotePatterns: buildImageRemotePatterns(),
  },
  // 注意：安全响应头（CSP、HSTS 等）现在通过 src/proxy.ts middleware 在运行时动态设置
  // 这样可以利用运行时环境变量，无需在 CI/CD 构建时注入
};

export default nextConfig;
