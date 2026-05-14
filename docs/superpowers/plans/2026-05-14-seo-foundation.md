# SEO 基础设施实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 backend 应用的公开页面（落地页 + 博客）添加完整的 SEO 基础设施，包括 robots、sitemap、favicon、metadata 增强、JSON-LD 结构化数据。

**Architecture:** 使用 Next.js App Router 文件约定（robots.ts、sitemap.ts、icon.svg）+ metadata API 增强现有 layout/page 文件。自托管环境通过 `NEXT_PUBLIC_SITE_URL` 环境变量配置域名。

**Tech Stack:** Next.js App Router (Metadata API)、TypeScript、无需新依赖

**Design Spec:** `docs/superpowers/specs/2026-05-14-seo-foundation-design.md`

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `apps/backend/src/app/robots.ts` | 新建 | 搜索引擎爬取规则 |
| `apps/backend/src/app/sitemap.ts` | 新建 | 动态 XML sitemap 生成 |
| `apps/backend/src/app/layout.tsx` | 修改 | 增强根 metadata（title template、metadataBase、OG、Twitter） |
| `apps/backend/src/app/(landing)/layout.tsx` | 修改 | 添加 metadata export（title、description、canonical） |
| `apps/backend/src/app/(landing)/blog/page.tsx` | 修改 | 补充 canonical + openGraph |
| `apps/backend/src/app/(landing)/blog/[slug]/page.tsx` | 修改 | 添加 JSON-LD + canonical |
| `apps/backend/.env.example.local` | 修改 | 添加 NEXT_PUBLIC_SITE_URL |

**已完成（favicon）：**
| `apps/backend/src/app/icon.svg` | ✅ 已提交 | SVG favicon（支持暗色模式） |
| `apps/backend/src/app/apple-icon.tsx` | ✅ 已提交 | Apple Touch Icon（180×180 PNG） |

---

### Task 1: 添加 NEXT_PUBLIC_SITE_URL 环境变量

**Files:**
- Modify: `apps/backend/.env.example.local:147-148`（文件末尾追加）
- Modify: `apps/backend/.env.development`（添加开发默认值）
- Modify: `apps/backend/.env.production`（添加生产占位）

- [ ] **Step 1: 在 .env.example.local 末尾追加 SEO 相关配置段**

在文件末尾（第 148 行之后）追加：

```env

# ============================================================================
#  §12  SEO & 站点配置
# ============================================================================
#
#  NEXT_PUBLIC_SITE_URL — 生产环境的完整站点 URL（不含尾部斜杠）
#  用于生成 canonical URL、sitemap、OpenGraph 链接等
#  本地开发可留空，默认回退 http://localhost:3000
# ----------------------------------------------------------------------------
NEXT_PUBLIC_SITE_URL=
```

- [ ] **Step 2: 在 .env.development 中添加默认值**

在文件末尾追加一行：

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 3: 在 .env.production 中添加占位**

在文件末尾追加一行：

```env
# 部署时替换为实际域名，例如 https://eduadmin.example.com
NEXT_PUBLIC_SITE_URL=
```

- [ ] **Step 4: 提交**

```bash
git add apps/backend/.env.example.local apps/backend/.env.development apps/backend/.env.production
git commit -m "chore: add NEXT_PUBLIC_SITE_URL env var for SEO canonical URLs"
```

---

### Task 2: 创建 robots.ts

**Files:**
- Create: `apps/backend/src/app/robots.ts`

- [ ] **Step 1: 创建 robots.ts 文件**

```typescript
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
```

- [ ] **Step 2: 验证开发服务器启动正常**

```bash
cd apps/backend && npx next dev --port 3000 &
# 等待启动后访问 http://localhost:3000/robots.txt
# 预期：看到 allow: / 和 disallow 规则
# 也可以直接 curl 验证
curl -s http://localhost:3000/robots.txt | head -20
# 预期输出：
# User-Agent: *
# Allow: /
# Disallow: /admin/
# Disallow: /api/
# Disallow: /auth/
# Disallow: /user/
# Sitemap: http://localhost:3000/sitemap.xml
```

- [ ] **Step 3: 提交**

```bash
git add apps/backend/src/app/robots.ts
git commit -m "feat(seo): add robots.txt with admin/api/auth disallow rules"
```

---

### Task 3: 创建 sitemap.ts

**Files:**
- Create: `apps/backend/src/app/sitemap.ts`

**依赖:** Task 1（NEXT_PUBLIC_SITE_URL）、现有的 `fetchArticles` API

**注意:** `PublicBlogArticle` 类型没有 `updatedAt` 字段，sitemap 中使用 `publishedAt` 作为 `lastModified`。

- [ ] **Step 1: 创建 sitemap.ts 文件**

```typescript
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
```

- [ ] **Step 2: 验证 sitemap 生成**

```bash
# 访问 http://localhost:3000/sitemap.xml
curl -s http://localhost:3000/sitemap.xml | head -30
# 预期：XML 格式的 sitemap，包含首页、/blog、以及博客文章 URL
```

- [ ] **Step 3: 提交**

```bash
git add apps/backend/src/app/sitemap.ts
git commit -m "feat(seo): add dynamic sitemap generation for public pages"
```

---

### Task 4: 增强根 layout metadata

**Files:**
- Modify: `apps/backend/src/app/layout.tsx:83-86`

当前内容（第 83-86 行）：
```typescript
export const metadata: Metadata = {
  title: "EduAdmin",
  description: "教育行业 SaaS 管理后台",
};
```

- [ ] **Step 1: 替换 metadata 导出**

将第 83-86 行替换为：

```typescript
// 站点基础 URL，用于生成 canonical URL、OG 链接等
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  // title.template 让子页面自动拼接品牌后缀
  // 例如子页面设置 title: "博客" → 渲染为 "博客 | EduAdmin"
  title: {
    default: 'EduAdmin — 教育行业 SaaS 管理后台',
    template: '%s | EduAdmin',
  },
  description: '基于插件化架构的现代教育管理后台，支持 RBAC 权限控制、API 优先设计，按需启用业务模块。',
  // metadataBase 让所有相对 URL（OG 图片、canonical）有正确的基础路径
  metadataBase: new URL(siteUrl),
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

- [ ] **Step 2: 验证页面标题拼接正确**

```bash
# 访问首页 http://localhost:3000
# 查看页面 <title> 标签，预期为 "EduAdmin — 教育行业 SaaS 管理后台"
# 访问博客页 http://localhost:3000/blog
# 查看页面 <title> 标签，预期为 "博客 — Generic Admin | EduAdmin"
curl -s http://localhost:3000 | grep '<title>'
# 预期: <title>EduAdmin — 教育行业 SaaS 管理后台</title>
curl -s http://localhost:3000/blog | grep '<title>'
# 预期: <title>博客 — Generic Admin | EduAdmin</title>
```

- [ ] **Step 3: 提交**

```bash
git add apps/backend/src/app/layout.tsx
git commit -m "feat(seo): enhance root metadata with title template, metadataBase, OG/Twitter config"
```

---

### Task 5: 补充 Landing Layout metadata

**Files:**
- Modify: `apps/backend/src/app/(landing)/layout.tsx`

当前内容（无 metadata export）：
```typescript
import { PixelNavbar } from '@/components/business/blog/pixel-navbar';
import { PublicIcpFiling } from '@/components/business/shared/public-icp-filing';

export default function LandingLayout({
```

- [ ] **Step 1: 添加 Metadata import 和 export**

在文件顶部添加 `import type { Metadata } from 'next'`，并在 `LandingLayout` 函数之前添加 metadata 导出：

```typescript
import type { Metadata } from 'next'
import { PixelNavbar } from '@/components/business/blog/pixel-navbar'
import { PublicIcpFiling } from '@/components/business/shared/public-icp-filing'

export const metadata: Metadata = {
  title: '首页',
  description: '基于插件化架构的现代后台管理系统。支持 RBAC 权限控制、API 优先设计，按需启用业务模块。',
  alternates: {
    canonical: '/',
  },
}

export default function LandingLayout({
```

- [ ] **Step 2: 验证 landing 页面标题**

```bash
curl -s http://localhost:3000 | grep '<title>'
# 预期: <title>首页 | EduAdmin</title>（通过 title template 拼接）
```

- [ ] **Step 3: 提交**

```bash
git add apps/backend/src/app/(landing)/layout.tsx
git commit -m "feat(seo): add metadata with canonical to landing layout"
```

---

### Task 6: 补充博客列表页 metadata

**Files:**
- Modify: `apps/backend/src/app/(landing)/blog/page.tsx:5-8`

当前内容（第 5-8 行）：
```typescript
export const metadata: Metadata = {
	title: "博客 — Generic Admin",
	description: "技术文章与系统更新",
};
```

- [ ] **Step 1: 增强 metadata 对象**

将第 5-8 行替换为：

```typescript
export const metadata: Metadata = {
	title: '博客 — Generic Admin',
	description: '技术文章、系统更新与最佳实践分享。探索 EduAdmin 的功能特性和开发动态。',
	keywords: ['博客', '技术文章', '系统更新', 'EduAdmin', '教程'],
	alternates: {
		canonical: '/blog',
	},
	openGraph: {
		title: '博客 — Generic Admin',
		description: '技术文章、系统更新与最佳实践分享。',
		type: 'website',
	},
}
```

- [ ] **Step 2: 验证博客页标题和 meta**

```bash
curl -s http://localhost:3000/blog | grep '<title>'
# 预期: <title>博客 — Generic Admin | EduAdmin</title>
```

- [ ] **Step 3: 提交**

```bash
git add apps/backend/src/app/(landing)/blog/page.tsx
git commit -m "feat(seo): enhance blog listing metadata with canonical, OG, keywords"
```

---

### Task 7: 增强博客文章页（JSON-LD + canonical）

**Files:**
- Modify: `apps/backend/src/app/(landing)/blog/[slug]/page.tsx`

这是最复杂的 Task，涉及两处修改：
1. `generateMetadata` 函数添加 `alternates.canonical`
2. `BlogArticlePage` 组件添加 JSON-LD `<script>` 标签

- [ ] **Step 1: 在 generateMetadata 返回值中添加 canonical**

找到第 53-64 行的 `generateMetadata` 返回对象，在已有 `openGraph` 后面添加 `alternates`：

将第 53-64 行：
```typescript
	return {
		title: article.metaTitle ?? article.title,
		description: article.metaDescription ?? article.excerpt ?? '',
		openGraph: {
			title: article.metaTitle ?? article.title,
			description: article.metaDescription ?? article.excerpt ?? '',
			type: 'article',
			publishedTime: article.publishedAt ?? undefined,
			url: `/blog/${article.slug}`,
			images: article.ogImage ?? article.coverImage ?? [],
		},
	};
```

替换为：
```typescript
	return {
		title: article.metaTitle ?? article.title,
		description: article.metaDescription ?? article.excerpt ?? '',
		alternates: {
			canonical: `/blog/${article.slug}`,
		},
		openGraph: {
			title: article.metaTitle ?? article.title,
			description: article.metaDescription ?? article.excerpt ?? '',
			type: 'article',
			publishedTime: article.publishedAt ?? undefined,
			url: `/blog/${article.slug}`,
			images: article.ogImage ?? article.coverImage ?? [],
		},
	};
```

- [ ] **Step 2: 在 BlogArticlePage 组件中添加 JSON-LD**

将第 99-105 行的 return 语句：
```typescript
	return (
		<BlogArticleShell
			article={article}
			relatedArticles={related}
			readingTime={readingTime}
		/>
	);
```

替换为：
```typescript
	// 构建博客文章的 JSON-LD 结构化数据，帮助搜索引擎理解文章内容
	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: article.title,
		description: article.metaDescription ?? article.excerpt ?? '',
		datePublished: article.publishedAt ?? undefined,
		author: {
			'@type': 'Organization',
			name: article.authorName ?? 'EduAdmin',
		},
		publisher: {
			'@type': 'Organization',
			name: 'EduAdmin',
		},
		...(article.coverImage && { image: article.coverImage }),
	}

	return (
		<>
			{/* 注入 JSON-LD 结构化数据，供搜索引擎解析 */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>
			<BlogArticleShell
				article={article}
				relatedArticles={related}
				readingTime={readingTime}
			/>
		</>
	)
```

- [ ] **Step 3: 验证文章页 JSON-LD 和 canonical**

```bash
# 访问任意博客文章页面（需要至少一篇已发布文章）
# 检查 <head> 中的 canonical link
# 检查 <body> 中的 application/ld+json script
curl -s http://localhost:3000/blog/<任意slug> | grep 'application/ld+json'
# 预期: 看到 <script type="application/ld+json"> 标签
curl -s http://localhost:3000/blog/<任意slug> | grep 'rel="canonical"'
# 预期: 看到 <link rel="canonical" href="..."/> 标签
```

- [ ] **Step 4: 提交**

```bash
git add apps/backend/src/app/(landing)/blog/[slug]/page.tsx
git commit -m "feat(seo): add BlogPosting JSON-LD and canonical to blog article pages"
```

---

### Task 8: 最终验证

- [ ] **Step 1: 运行 TypeScript 类型检查**

```bash
cd apps/backend && npx tsc --noEmit
# 预期: 无错误
```

- [ ] **Step 2: 运行 lint 检查**

```bash
cd apps/backend && npx next lint
# 预期: 无错误（或仅有已知的与本次变更无关的警告）
```

- [ ] **Step 3: 运行开发服务器验证所有 SEO 端点**

```bash
# 确保开发服务器正在运行
# 验证 robots.txt
curl -s http://localhost:3000/robots.txt
# 预期: 包含 Allow: / 和 Disallow 规则

# 验证 sitemap.xml
curl -s http://localhost:3000/sitemap.xml
# 预期: XML 格式，包含首页、/blog、博客文章 URL

# 验证 favicon
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/icon.svg
# 预期: 200

# 验证 apple-icon
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/apple-icon
# 预期: 200
```

- [ ] **Step 4: 验证 metadata 完整性**

```bash
# 首页 <title>
curl -s http://localhost:3000 | grep '<title>'
# 预期: <title>首页 | EduAdmin</title>

# 博客列表 <title>
curl -s http://localhost:3000/blog | grep '<title>'
# 预期: <title>博客 — Generic Admin | EduAdmin</title>

# 首页 <meta name="description">
curl -s http://localhost:3000 | grep 'meta name="description"'
# 预期: 看到描述文字

# 首页 og:site_name
curl -s http://localhost:3000 | grep 'og:site_name'
# 预期: 看到 EduAdmin
```

- [ ] **Step 5: 最终提交（如有 lint 修复）**

```bash
git add -A
git commit -m "chore: final SEO verification and cleanup"
```
