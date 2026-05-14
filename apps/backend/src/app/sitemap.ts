import type { MetadataRoute } from 'next'
import { fetchArticles } from '@/lib/blog/api'

/**
 * Function: sitemap
 *
 * Description: 动态生成 XML sitemap，包含首页、博客列表页和所有已发布博客文章。
 * 使用 NEXT_PUBLIC_SITE_URL 作为基础 URL。
 *
 * 注意：PublicBlogArticle 没有 updatedAt 字段，使用 publishedAt 作为 lastModified。
 *
 * Returns:
 *   Promise<MetadataRoute.Sitemap>: sitemap 条目数组
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  // 获取所有已发布文章用于生成 sitemap 条目
  const articlesData = await fetchArticles({ limit: 50 })

  const blogEntries: MetadataRoute.Sitemap = articlesData.items.map((article) => ({
    url: `${siteUrl}/blog/${article.slug}`,
    lastModified: article.publishedAt ? new Date(article.publishedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    ...blogEntries,
  ]
}
