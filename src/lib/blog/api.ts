/**
 * Blog 公开数据获取 — Server Component 专用
 *
 * 直接调用 Service 层获取博客数据，避免 Server Component 中的 HTTP fetch 回环问题。
 * API 路由层（route.ts）继续使用 fetch 对外暴露 RESTful 接口。
 */

import type {
	PublicBlogArticleListResponse,
	PublicBlogArticle,
	PublicBlogCategoryListResponse,
	PublicBlogTagListResponse,
} from "@/contracts/dtos/public/blog/articles.dto";

import {
	createBlogArticleRepository,
	createBlogCategoryRepository,
	createBlogTagRepository,
	createBlogArticleViewRepository,
} from "@/repositories/factory/content/blog.factory";
import { createPublicBlogArticleService } from "@/services/content/public-blog-article.service";
import { createServiceContext } from "@/types/service/service-context";
import { logger, createRequestLogger } from "@/lib/logger";
import { randomUUID } from "crypto";

/**
 * Function: createServerBlogService
 *
 * Description: 在 Server Component 中创建博客 service 实例，注入 repo 依赖和最小 service context
 *
 * Returns:
 *   service: PublicBlogArticleService 的全部方法
 */
async function createServerBlogService() {
	const traceId = `ssg-blog-${randomUUID().slice(0, 8)}`;
	const requestLogger = createRequestLogger({ traceId });
	const serviceContext = createServiceContext(traceId, requestLogger);

	const [articles, categories, tags, views] = await Promise.all([
		createBlogArticleRepository(),
		createBlogCategoryRepository(),
		createBlogTagRepository(),
		createBlogArticleViewRepository(),
	]);

	return createPublicBlogArticleService(
		{ articles, categories, tags, views },
		serviceContext,
	);
}

/**
 * Function: fetchArticles
 *
 * Description: 获取已发布博客文章列表，支持关键词搜索、分类和标签筛选
 *
 * Parameters:
 *   params.limit(number | undefined): 分页大小，默认 20
 *   params.cursor(string | null | undefined): 分页游标
 *   params.keyword(string | undefined): 搜索关键词
 *   params.categorySlug(string | undefined): 分类 Slug
 *   params.tagSlug(string | undefined): 标签 Slug
 *
 * Returns:
 *   data(PublicBlogArticleListResponse): 文章列表、下一页游标和总数
 */
export async function fetchArticles(params?: {
	limit?: number;
	cursor?: string | null;
	keyword?: string;
	categorySlug?: string;
	tagSlug?: string;
}): Promise<PublicBlogArticleListResponse> {
	const service = await createServerBlogService();
	return service.listPublishedArticles(params);
}

/**
 * Function: fetchArticleBySlug
 *
 * Description: 根据 Slug 获取单篇已发布博客文章详情，不存在时返回 null
 *
 * Parameters:
 *   slug(string): 文章的唯一 URL 标识
 *
 * Returns:
 *   article(PublicBlogArticle | null): 文章详情，未找到返回 null
 */
export async function fetchArticleBySlug(
	slug: string,
): Promise<PublicBlogArticle | null> {
	const service = await createServerBlogService();
	return service.getArticleBySlug(slug);
}

/**
 * Function: trackArticleView
 *
 * Description: 记录文章阅读数据（由客户端组件调用，仍使用 fetch）
 *
 * Parameters:
 *   slug(string): 文章 slug
 *   data.readTime(number | undefined): 阅读时长（秒）
 *   data.referer(string | undefined): 来源页面 URL
 *
 * Returns:
 *   void: 无返回值
 */
export async function trackArticleView(
	slug: string,
	data?: { readTime?: number; referer?: string },
): Promise<void> {
	try {
		await fetch(`/api/v1/public/blog/articles/${slug}/view`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data ?? {}),
		});
	} catch {
		// fire-and-forget
	}
}

/**
 * Function: fetchCategories
 *
 * Description: 获取所有公开博客分类列表（仅返回有已发布文章的活跃分类）
 *
 * Returns:
 *   data(PublicBlogCategoryListResponse): 分类列表
 */
export async function fetchCategories(): Promise<PublicBlogCategoryListResponse> {
	const service = await createServerBlogService();
	return service.listCategories();
}

/**
 * Function: fetchTags
 *
 * Description: 获取所有公开博客标签列表（仅返回有已发布文章的标签）
 *
 * Returns:
 *   data(PublicBlogTagListResponse): 标签列表
 */
export async function fetchTags(): Promise<PublicBlogTagListResponse> {
	const service = await createServerBlogService();
	return service.listTags();
}
