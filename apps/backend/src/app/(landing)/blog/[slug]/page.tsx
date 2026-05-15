import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { fetchArticleBySlug, fetchArticles } from '@/lib/blog/api';
import BlogArticleShell from '@/components/business/blog/blog-article-shell';

/**
 * Function: calculateReadingTime
 *
 * Description: 根据文章内容估算阅读时间（分钟），中文按 2 字符算 1 词
 *
 * Parameters:
 *   content(string | null | undefined): 文章 HTML 内容
 *
 * Returns:
 *   number: 预计阅读时间（分钟），最少 1 分钟
 */
function calculateReadingTime(content: string | null | undefined): number {
	if (!content) return 1;
	const plainText = content.replace(/<[^>]*>/g, '');
	const chineseChars = (plainText.match(/[\u4e00-\u9fff]/g) || []).length;
	const englishWords = plainText.replace(/[\u4e00-\u9fff]/g, ' ').split(/\s+/).filter(Boolean).length;
	const totalWords = Math.floor(chineseChars / 2) + englishWords;
	return Math.max(1, Math.ceil(totalWords / 300));
}

/**
 * Function: generateMetadata
 *
 * Description: 根据 slug 动态生成文章页面的 SEO 元数据
 *
 * Parameters:
 *   params(Promise<{ slug: string }>): 路由参数
 *
 * Returns:
 *   Metadata: 页面元数据
 */
export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const article = await fetchArticleBySlug(slug);

	if (!article) {
		return {
			title: '文章未找到',
			description: '请求的文章不存在',
		};
	}

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
}

/**
 * Function: BlogArticlePage
 *
 * Description: 博客文章详情页面（Server Component），获取文章内容、相关文章和阅读时间，
 * 交给 BlogArticleShell 客户端壳组件渲染双栏布局
 *
 * Parameters:
 *   params(Promise<{ slug: string }>): 路由参数，包含文章 slug
 *
 * Returns:
 *   JSX.Element: 文章详情页面
 */
export default async function BlogArticlePage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const article = await fetchArticleBySlug(slug);

	if (!article) {
		notFound();
	}

	const relatedArticles = await fetchArticles({
		categorySlug: article.categorySlug ?? undefined,
		limit: 4,
	});

	const related = relatedArticles.items.filter((a) => a.slug !== slug).slice(0, 3);
	const readingTime = calculateReadingTime(article.content);

	// 构建博客文章的 JSON-LD 结构化数据，帮助搜索引擎理解文章内容
	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: article.title,
		description: article.metaDescription ?? article.excerpt ?? '',
		datePublished: article.publishedAt ?? undefined,
		author: {
			'@type': 'Organization',
			name: article.authorName ?? 'NextAdmin',
		},
		publisher: {
			'@type': 'Organization',
			name: 'NextAdmin',
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
}
