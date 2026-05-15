import { fetchArticles, fetchCategories, fetchTags } from "@/lib/blog/api";
import { BlogListingClient } from "@/components/business/blog/blog-listing-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: '博客 — Generic Admin',
	description: '技术文章、系统更新与最佳实践分享。探索 NextAdmin 的功能特性和开发动态。',
	keywords: ['博客', '技术文章', '系统更新', 'NextAdmin', '教程'],
	alternates: {
		canonical: '/blog',
	},
	openGraph: {
		title: '博客 — Generic Admin',
		description: '技术文章、系统更新与最佳实践分享。',
		type: 'website',
	},
}

/**
 * Function: BlogPage
 *
 * Description: 博客列表页面（Server Component），并行获取文章、分类、标签数据后渲染客户端交互组件
 *
 * Parameters:
 *   searchParams(Promise<{ keyword?: string; category?: string; tag?: string; cursor?: string }>): URL 查询参数
 *
 * Returns:
 *   JSX.Element: 博客列表页面
 */
export default async function BlogPage({
	searchParams,
}: {
	searchParams: Promise<{
		keyword?: string;
		category?: string;
		tag?: string;
		cursor?: string;
	}>;
}) {
	const params = await searchParams;

	const [articlesData, categories, tags] = await Promise.all([
		fetchArticles({
			keyword: params.keyword,
			categorySlug: params.category,
			tagSlug: params.tag,
		}),
		fetchCategories(),
		fetchTags(),
	]);

	return (
		<BlogListingClient
			initialData={articlesData}
			categories={categories}
			tags={tags}
			initialParams={params}
		/>
	);
}
