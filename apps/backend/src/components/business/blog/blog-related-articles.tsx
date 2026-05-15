import { PublicBlogArticle } from '@/contracts/dtos/public/blog/articles.dto';
import PixelCard from '@/components/ui/PixelCard';

interface BlogRelatedArticlesProps {
  articles: PublicBlogArticle[];
}

/**
 * BlogRelatedArticles Component
 *
 * Description: 使用 PixelCard 展示相关博客文章的网格布局组件，卡片带有像素动画效果
 *
 * Parameters:
 *   articles (BlogRelatedArticlesProps): 需要展示的相关文章数组
 *
 * Returns:
 *   JSX.Element: 带像素动效的相关文章网格，无文章时返回 null
 */
export default function BlogRelatedArticles({ articles }: BlogRelatedArticlesProps) {
  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <div className="mt-12">
      <h2 className="text-xl [font-family:var(--font-press-start)] text-[var(--color-landing-foreground)] tracking-wider mb-6">
        相关文章
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {articles.map((article) => (
          <a key={article.id} href={`/blog/${article.slug}`} className="block">
            <PixelCard
              variant="default"
              gap={6}
              speed={30}
              colors="#4CC9F0,#3A86FF,#2A2A4A"
              className="!w-full !h-auto !rounded-none !border-4 !border-[var(--color-landing-border)]"
            >
              <div className="relative z-10 w-full bg-[var(--color-landing-card)]">
                <img
                  src={article.coverImage ?? ''}
                  alt={article.title ?? 'Article image'}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="text-sm [font-family:var(--font-press-start)] text-[var(--color-landing-foreground)] tracking-wider mb-2 line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-base [font-family:var(--font-vt323)] text-[var(--color-landing-muted)] mb-4 line-clamp-2">
                    {article.excerpt}
                  </p>
                  <span
                    className="inline-block px-3 py-1 bg-[var(--color-landing-primary)] text-[var(--color-landing-background)] border-2 border-[var(--color-landing-border)] [font-family:var(--font-press-start)] text-[10px] tracking-wider hover:bg-[var(--color-landing-cta)] transition-colors duration-200"
                  >
                    阅读更多
                  </span>
                </div>
              </div>
            </PixelCard>
          </a>
        ))}
      </div>
    </div>
  );
}
