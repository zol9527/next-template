"use client";

import type { PublicBlogTag } from "@/contracts/dtos/public/blog/articles.dto";

/**
 * Function: BlogTagFilter
 *
 * Description: 水平可滚动的标签筛选组件，点击标签切换筛选状态
 *
 * Parameters:
 *   tags(PublicBlogTag[]): 标签列表数据
 *   activeSlug(string | undefined): 当前激活的标签 Slug
 *   onSelect((slug: string | undefined) => void): 标签选择回调
 *
 * Returns:
 *   JSX.Element: 标签筛选器
 */
export function BlogTagFilter({
  tags,
  activeSlug,
  onSelectAction,
}: {
  tags: PublicBlogTag[];
  activeSlug: string | undefined;
  onSelectAction: (slug: string | undefined) => void;
}) {
  return (
    <div className="-mx-1 flex flex-nowrap gap-3 overflow-x-auto px-1 py-1 scrollbar-hide">
      {tags.map((tag) => {
        const isActive = activeSlug === tag.slug;
        return (
<button
  key={tag.id}
  type="button"
  onClick={() => onSelectAction(tag.slug)}
  className={`shrink-0 whitespace-nowrap px-3 py-1 [font-family:var(--font-vt323),var(--font-space-grotesk)] text-base tracking-[0.08em] transition-colors ${
    isActive
      ? "pixel-border-soft-primary text-(--color-landing-primary)"
      : "pixel-border-soft text-(--color-landing-muted) hover:text-(--color-landing-foreground)"
  }`}
>
  # {tag.name}
  {tag.articleCount != null && (
    <span className="ml-1 text-(--color-landing-muted)">
      ({tag.articleCount})
    </span>
  )}
</button>
        );
      })}
    </div>
  );
}
