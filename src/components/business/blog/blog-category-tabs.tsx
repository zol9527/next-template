"use client";

import type { PublicBlogCategory } from "@/contracts/dtos/public/blog/articles.dto";

/**
 * Function: BlogCategoryTabs
 *
 * Description: 水平可滚动的分类标签页组件，包含"全部"选项和各分类选项卡
 *
 * Parameters:
 *   categories(PublicBlogCategory[]): 分类列表数据
 *   activeSlug(string | undefined): 当前激活的分类 Slug
 *   onSelectAction((slug: string | undefined) => void): 分类选择回调
 *
 * Returns:
 *   JSX.Element: 分类标签页
 */
export function BlogCategoryTabs({
  categories,
  activeSlug,
  onSelectAction,
}: {
  categories: PublicBlogCategory[];
  activeSlug: string | undefined;
  onSelectAction: (slug: string | undefined) => void;
}) {
  return (
    <div className="-mx-1 flex min-w-0 gap-3 overflow-x-auto px-1 py-1 pb-2 scrollbar-hide">
      <button
        type="button"
        onClick={() => onSelectAction(undefined)}
        className={`shrink-0 min-w-fit px-4 py-2 [font-family:var(--font-vt323),var(--font-space-grotesk)] text-base tracking-[0.08em] transition-colors ${
          activeSlug === undefined
            ? "pixel-border-soft-primary text-(--color-landing-primary)"
            : "pixel-border-soft text-(--color-landing-muted) hover:text-(--color-landing-foreground)"
        }`}
      >
        ALL
      </button>

      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelectAction(cat.slug)}
          className={`shrink-0 min-w-fit px-4 py-2 [font-family:var(--font-vt323),var(--font-space-grotesk)] text-base tracking-[0.08em] transition-colors ${
            activeSlug === cat.slug
              ? "pixel-border-soft-primary text-(--color-landing-primary)"
              : "pixel-border-soft text-(--color-landing-muted) hover:text-(--color-landing-foreground)"
          }`}
        >
          {cat.name}
          {cat.articleCount != null && (
            <span className="ml-1 text-(--color-landing-muted)">
              ({cat.articleCount})
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
