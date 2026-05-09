"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clientFetchArticles } from "@/lib/blog/client-api";
import { BlogArticleCard } from "./blog-article-card";
import { BlogSearchBar } from "./blog-search-bar";
import { BlogCategoryTabs } from "./blog-category-tabs";
import { BlogTagFilter } from "./blog-tag-filter";
import { BlogLoadMore } from "./blog-load-more";
import { BlogEmptyState } from "./blog-empty-state";
import { PixelDivider } from "@/components/business/landing/pixel-sprites";
import type {
  PublicBlogArticleListResponse,
  PublicBlogCategoryListResponse,
  PublicBlogTagListResponse,
  PublicBlogArticle,
} from "@/contracts/dtos/public/blog/articles.dto";

/**
 * Function: BlogListingClient
 *
 * Description: 博客列表核心交互组件，管理搜索、分类、标签筛选和加载更多等状态，
 * 通过 URL searchParams 实现可分享的筛选状态
 *
 * Parameters:
 *   initialData(PublicBlogArticleListResponse): 服务端预取的初始文章数据
 *   categories(PublicBlogCategoryListResponse): 分类列表数据
 *   tags(PublicBlogTagListResponse): 标签列表数据
 *   initialParams({ keyword?: string; category?: string; tag?: string; cursor?: string }): 初始 URL 查询参数
 *
 * Returns:
 *   JSX.Element: 博客列表交互页面
 */
export function BlogListingClient({
  initialData,
  categories,
  tags,
  initialParams,
}: {
  initialData: PublicBlogArticleListResponse;
  categories: PublicBlogCategoryListResponse;
  tags: PublicBlogTagListResponse;
  initialParams: {
    keyword?: string;
    category?: string;
    tag?: string;
    cursor?: string;
  };
}) {
const router = useRouter();

  const [articles, setArticles] = useState<PublicBlogArticle[]>(
    initialData.items,
  );
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialData.nextCursor,
  );
  const [total, setTotal] = useState(initialData.total);
  const [loading, setLoading] = useState(false);

  const keyword = initialParams.keyword;
  const categorySlug = initialParams.category;
  const tagSlug = initialParams.tag;

  /**
   * Function: syncListingState
   *
   * Description: 当 URL 筛选参数变化导致 Server Component 重新下发 initialData 时，
   * 同步重置客户端列表状态；否则组件不卸载时会保留旧的 useState，表现为“筛选没效果”。
   */
  useEffect(() => {
    setArticles(initialData.items);
    setNextCursor(initialData.nextCursor);
    setTotal(initialData.total);
    setLoading(false);
  }, [initialData.items, initialData.nextCursor, initialData.total, keyword, categorySlug, tagSlug]);

  /**
   * Function: buildUrl
   *
   * Description: 根据筛选参数构建博客页面 URL
   *
   * Parameters:
   *   overrides({ keyword?: string; category?: string | undefined; tag?: string | undefined }): 需要覆盖的参数
   *
   * Returns:
   *   path(string): 带查询参数的路径
   */
  const buildUrl = useCallback(
    (overrides: {
      keyword?: string;
      category?: string | undefined;
      tag?: string | undefined;
    }) => {
      const params = new URLSearchParams();

      const kw = overrides.keyword ?? keyword ?? "";
      const cat = "category" in overrides ? overrides.category : categorySlug;
      const tg = "tag" in overrides ? overrides.tag : tagSlug;

      if (kw) params.set("keyword", kw);
      if (cat) params.set("category", cat);
      if (tg) params.set("tag", tg);

      const qs = params.toString();
      return `/blog${qs ? `?${qs}` : ""}`;
    },
    [keyword, categorySlug, tagSlug],
  );

  /** 搜索回调：更新 URL 中的 keyword 参数 */
  const handleSearch = useCallback(
    (newKeyword: string) => {
      router.push(buildUrl({ keyword: newKeyword }));
    },
    [router, buildUrl],
  );

  /** 分类选择回调：更新 URL 中的 category 参数 */
  const handleCategorySelect = useCallback(
    (slug: string | undefined) => {
      router.push(buildUrl({ category: slug }));
    },
    [router, buildUrl],
  );

  /** 标签选择回调：更新 URL 中的 tag 参数 */
  const handleTagSelect = useCallback(
    (slug: string | undefined) => {
      router.push(buildUrl({ tag: slug }));
    },
    [router, buildUrl],
  );

  /** 加载更多回调：追加分页数据 */
  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || loading) return;

    setLoading(true);
    try {
	const data = await clientFetchArticles({
        cursor: nextCursor,
        keyword,
        categorySlug,
        tagSlug,
      });
      setArticles((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [nextCursor, loading, keyword, categorySlug, tagSlug]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 页面标题 */}
      <div className="mb-8 text-center">
        <h1 className="[font-family:var(--font-press-start)] text-xl text-(--color-landing-foreground) sm:text-2xl">
          BLOG
        </h1>
        <p className="mt-3 [font-family:var(--font-vt323)] text-lg text-(--color-landing-muted)">
          技术文章与系统更新 — 共 {total} 篇
        </p>
        <PixelDivider />
      </div>

      {/* 搜索栏 */}
      <div className="mb-6">
<BlogSearchBar
  initialKeyword={keyword ?? ""}
  onSearchAction={handleSearch}
/>
      </div>

      {/* 分类标签页 */}
      {categories.items.length > 0 && (
        <div className="mb-4">
<BlogCategoryTabs
  categories={categories.items}
  activeSlug={categorySlug}
  onSelectAction={handleCategorySelect}
/>
        </div>
      )}

      {/* 标签筛选 */}
      {tags.items.length > 0 && (
        <div className="mb-8">
<BlogTagFilter
  tags={tags.items}
  activeSlug={tagSlug}
  onSelectAction={handleTagSelect}
/>
        </div>
      )}

      {/* 文章列表 */}
      {articles.length === 0 ? (
        <BlogEmptyState keyword={keyword} />
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article, index) => (
              <div
                key={article.id}
                className="pixel-card-enter h-full"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <BlogArticleCard article={article} />
              </div>
            ))}
          </div>

          {/* 加载更多 */}
          <BlogLoadMore
            loading={loading}
            hasMore={nextCursor != null}
            onClick={handleLoadMore}
          />
        </>
      )}
    </div>
  );
}
