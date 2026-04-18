import { Eye } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils/date";
import { PixelStar } from "@/components/business/landing/pixel-sprites";
import type { PublicBlogArticle } from "@/contracts/dtos/public/blog/articles.dto";

/**
 * Function: BlogArticleCard
 *
 * Description: 像素风格文章卡片组件，展示文章封面、标题、摘要、分类、标签和元信息
 *
 * Parameters:
 *   article(PublicBlogArticle): 文章数据
 *
 * Returns:
 *   JSX.Element: 像素风格的文章卡片
 */
export function BlogArticleCard({ article }: { article: PublicBlogArticle }) {
  const displayDate = article.publishedAt ?? article.createdAt;

  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group block h-full transition-transform hover:-translate-y-1"
    >
      <article className="flex h-full flex-col bg-(--color-landing-card) p-5 sm:p-6 pixel-border-soft pixel-border-soft-hover-primary transition-colors duration-150">
        {/* 封面图片 */}
        <div className="mb-4 overflow-hidden pixel-border-soft">
          {article.coverImage ? (
            <img
              src={article.coverImage}
              alt={article.title}
              className="h-36 w-full object-cover pixel-sharp transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-36 items-center justify-center bg-(--color-landing-background)">
              <PixelStar className="h-12 w-12 pixel-float" />
            </div>
          )}
        </div>

        {/* 分类徽章 */}
        {article.categoryName && (
          <div className="mb-3 inline-block -ml-2.5 px-2.5 py-1 pixel-border-soft-primary">
            <span className="[font-family:var(--font-vt323)] text-sm tracking-[0.08em] text-(--color-landing-primary)">
              {article.categoryName}
            </span>
          </div>
        )}

        {/* 标题 */}
        <h3 className="mb-2 line-clamp-2 [font-family:var(--font-vt323),var(--font-space-grotesk)] text-lg leading-snug tracking-[0.06em] text-(--color-landing-foreground) transition-colors group-hover:text-(--color-landing-primary)">
          {article.title}
        </h3>

        {/* 摘要（占位高度用于卡片等高） */}
        <div className="mb-4 min-h-[3.2em]">
          {article.excerpt ? (
            <p className="line-clamp-2 [font-family:var(--font-vt323),var(--font-space-grotesk)] text-base text-(--color-landing-muted)">
              {article.excerpt}
            </p>
          ) : null}
        </div>

        {/* 标签 */}
        {article.tagNames.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {article.tagNames.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 pixel-border-soft text-xs [font-family:var(--font-vt323),var(--font-space-grotesk)] tracking-[0.08em] text-(--color-landing-muted)"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 底部元信息 */}
        <div className="mt-auto flex items-center justify-between border-t-2 border-(--color-landing-border) pt-3">
          <div className="flex items-center gap-3">
            <time
              className="[font-family:var(--font-vt323),var(--font-space-grotesk)] text-xs tracking-[0.06em] text-(--color-landing-muted)"
              dateTime={displayDate}
            >
              {formatDate(displayDate)}
            </time>
            {article.authorName && (
              <span className="[font-family:var(--font-vt323),var(--font-space-grotesk)] text-xs tracking-[0.06em] text-(--color-landing-muted)">
                {article.authorName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-(--color-landing-muted)">
            <Eye className="h-3.5 w-3.5" />
            <span className="[font-family:var(--font-vt323),var(--font-space-grotesk)] text-xs tracking-[0.06em]">
              {article.viewCount}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
