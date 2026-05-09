/**
 * Blog 客户端 API — Client Component 专用
 *
 * 通过浏览器 fetch 调用公开 API 路由，用于客户端交互（Load More、搜索等）。
 * Server Component 的数据获取使用 @/lib/blog/api.ts（直接调用 service 层）。
 */

import type {
	PublicBlogArticleListResponse,
	PublicBlogCategoryListResponse,
	PublicBlogTagListResponse,
} from "@/contracts/dtos/public/blog/articles.dto";

const BASE = "/api/v1/public/blog";

interface ApiResponse<T> {
	success: boolean;
	data: T;
}

function buildParams(params: Record<string, string | number | null | undefined>): URLSearchParams {
	const sp = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value != null && value !== "") sp.set(key, String(value));
	}
	return sp;
}

/**
 * Function: clientFetchArticles
 *
 * Description: 客户端获取博客文章列表（用于 Load More 等交互场景）
 *
 * Parameters:
 *   params: 同 PublicBlogArticleListQuery
 *
 * Returns:
 *   PublicBlogArticleListResponse
 */
export async function clientFetchArticles(params?: {
	limit?: number;
	cursor?: string | null;
	keyword?: string;
	categorySlug?: string;
	tagSlug?: string;
}): Promise<PublicBlogArticleListResponse> {
	const sp = buildParams({
		limit: params?.limit,
		cursor: params?.cursor,
		keyword: params?.keyword,
		categorySlug: params?.categorySlug,
		tagSlug: params?.tagSlug,
	});
	const url = `${BASE}/articles${sp.toString() ? `?${sp}` : ""}`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`获取文章列表失败: ${res.status}`);
	const json: ApiResponse<PublicBlogArticleListResponse> = await res.json();
	return json.data;
}

/**
 * Function: clientFetchCategories
 *
 * Description: 客户端获取分类列表
 *
 * Returns:
 *   PublicBlogCategoryListResponse
 */
export async function clientFetchCategories(): Promise<PublicBlogCategoryListResponse> {
	const res = await fetch(`${BASE}/categories`);
	if (!res.ok) throw new Error(`获取分类失败: ${res.status}`);
	const json: ApiResponse<PublicBlogCategoryListResponse> = await res.json();
	return json.data;
}

/**
 * Function: clientFetchTags
 *
 * Description: 客户端获取标签列表
 *
 * Returns:
 *   PublicBlogTagListResponse
 */
export async function clientFetchTags(): Promise<PublicBlogTagListResponse> {
	const res = await fetch(`${BASE}/tags`);
	if (!res.ok) throw new Error(`获取标签失败: ${res.status}`);
	const json: ApiResponse<PublicBlogTagListResponse> = await res.json();
	return json.data;
}
