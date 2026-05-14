import type { MetadataRoute } from 'next'

/**
 * Function: robots
 *
 * Description: 搜索引擎爬取规则配置。允许索引公开页面（首页、博客），
 * 禁止索引管理后台、认证、API 等内部路由。
 *
 * Returns:
 *   MetadataRoute.Robots: robots.txt 配置
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/auth/', '/user/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
