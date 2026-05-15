# SEO 基础设施设计文档

> 方案 A：最小化 SEO — 仅覆盖公开页面
> 日期：2026-05-14

## 背景与目标

当前 backend 应用的 SEO 覆盖率约 20%（12/60 页面有 metadata），关键基础设施（sitemap、robots、favicon、JSON-LD）完全缺失。本次仅优化**公开页面**（落地页、博客），管理后台通过 robots.txt 禁止索引。

**部署环境**：自托管（非 Vercel），需要 `NEXT_PUBLIC_SITE_URL` 环境变量。

## 设计决策

| 决策             | 选择              | 理由                           |
| ---------------- | ----------------- | ------------------------------ |
| SEO 覆盖范围     | 仅公开页面        | 管理后台不需要被搜索引擎索引   |
| Favicon 方案     | 静态 SVG 文件     | 简单、支持暗色模式、无需设计资源循环 |
| OG 图片          | 本次不实现        | 方案 A 范围，后续按需添加      |
| Canonical URL    | metadataBase 统一 | 自托管需环境变量配置域名       |
| 结构化数据       | 仅博客文章页      | BlogPosting schema，ROI 最高   |

## 变更清单

### 1. 新建 `app/robots.ts`

控制搜索引擎爬取范围：
- 允许：`/`（首页）、`/blog`（博客列表）、`/blog/*`（博客文章）
- 禁止：`/admin/`、`/api/`、`/auth/`、`/user/`
- 指向 sitemap URL

```typescript
import { MetadataRoute } from 'next'

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
```

### 2. 新建 `app/sitemap.ts`

动态生成公开页面的 XML sitemap：
- 首页：priority 1.0，daily
- 博客列表：priority 0.8，daily
- 所有已发布博客文章：priority 0.7，weekly，使用文章的 updatedAt/publishedAt

```typescript
import { MetadataRoute } from 'next'
import { fetchArticles } from '@/lib/blog/api'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const articles = await fetchArticles()

  const blogEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${siteUrl}/blog/${article.slug}`,
    lastModified: article.updatedAt ?? article.publishedAt ?? new Date(),
    changeFrequency: 'weekly',
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
```

### 3. 新建网站图标文件

使用 Next.js 文件约定，在 `app/` 目录下放置：

- `app/icon.svg` — 现代浏览器 favicon，支持暗色模式
- `app/apple-icon.png`（或 `apple-icon.tsx`）— Apple 设备，180×180

图标设计：由 designer agent 生成，品牌风格需与 EduAdmin 设计系统一致。

### 4. 修改 `app/layout.tsx` — 增强 metadata

当前只有 `title` 和 `description`，需增强为：

```typescript
export const metadata: Metadata = {
  title: {
    default: 'EduAdmin — 教育行业 SaaS 管理后台',
    template: '%s | EduAdmin',
  },
  description: '基于插件化架构的现代教育管理后台',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: 'EduAdmin',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
}
```

关键变化：
- `title.template`：子页面自动拼接品牌名（如 "博客 — Generic Admin | EduAdmin"）
- `metadataBase`：让所有相对 URL（OG 图片、canonical）有正确的基础路径
- 添加基础 OG 和 Twitter Card 配置

### 5. 修改 `app/(landing)/layout.tsx` — 添加 metadata

当前无 metadata export，需补充：

```typescript
export const metadata: Metadata = {
  title: '首页',
  description: '基于插件化架构的现代后台管理系统',
  alternates: { canonical: '/' },
}
```

### 6. 修改 `app/(landing)/blog/page.tsx` — 补充 canonical + OG

已有 title/description，补充：
- `alternates.canonical: '/blog'`
- `openGraph` 基础配置

### 7. 修改 `app/(landing)/blog/[slug]/page.tsx` — 添加 JSON-LD + canonical

在 `generateMetadata` 中补充 `alternates.canonical`。
在页面组件中注入 BlogPosting JSON-LD schema：

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "文章标题",
  "description": "文章摘要",
  "datePublished": "2026-05-14",
  "author": { "@type": "Organization", "name": "EduAdmin" },
  "publisher": { "@type": "Organization", "name": "EduAdmin" }
}
```

通过 `<script type="application/ld+json">` 注入页面。

### 8. 修改 `.env.example` — 添加环境变量

```env
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

所有 canonical URL、sitemap URL、OG URL 都依赖此值。

## 不做的事

- ❌ 动态 OG 图片生成（方案 B 范围）
- ❌ admin 页面 metadata（通过 robots.txt 禁止索引即可）
- ❌ 多语言 hreflang（当前仅中文）
- ❌ RSS feed
- ❌ Google Search Console 验证
- ❌ Web App Manifest

## 文件变更总览

| 文件                               | 操作 | 说明                      |
| ---------------------------------- | ---- | ------------------------- |
| `app/robots.ts`                      | 新建 | 搜索引擎爬取规则          |
| `app/sitemap.ts`                     | 新建 | 动态 sitemap 生成         |
| `app/icon.svg`                       | 新建 | 网站图标                  |
| `app/apple-icon.tsx`                 | 新建 | Apple Touch Icon          |
| `app/layout.tsx`                     | 修改 | 增强 metadata 配置        |
| `app/(landing)/layout.tsx`           | 修改 | 添加 metadata export      |
| `app/(landing)/blog/page.tsx`        | 修改 | 补充 canonical + OG       |
| `app/(landing)/blog/[slug]/page.tsx` | 修改 | 添加 JSON-LD + canonical  |
| `.env.example`                       | 修改 | 添加 NEXT_PUBLIC_SITE_URL |

**总计**：4 个新文件 + 5 个修改文件，不引入任何新依赖。
