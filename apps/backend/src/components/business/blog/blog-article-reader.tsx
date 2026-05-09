'use client';

import type { PublicBlogArticle } from '@/contracts/dtos/public/blog/articles.dto';
import type { TocItem } from '@/lib/blog/toc';
import BlogArticleHeader from '@/components/business/blog/blog-article-header';
import BlogArticleContent from '@/components/business/blog/blog-article-content';
import BlogViewTracker from '@/components/business/blog/blog-view-tracker';
import BlogShareButtons from '@/components/business/blog/blog-share-buttons';
import BlogRelatedArticles from '@/components/business/blog/blog-related-articles';

/**
 * Interface: BlogArticleReaderProps
 *
 * Description: 文章阅读器属性，包含文章数据、相关文章和 TOC 回调
 */
interface BlogArticleReaderProps {
	article: PublicBlogArticle;
	relatedArticles: PublicBlogArticle[];
	readingTime: number;
	onTocReady: (items: TocItem[]) => void;
}

/**
 * Function: BlogArticleReader
 *
 * Description: 文章阅读器核心组件，组合文章头部、内容渲染器、浏览追踪、分享按钮和相关文章。
 * 内容渲染完成 TOC 解析后通过 onTocReady 回调通知父组件。
 *
 * Parameters:
 *   article(PublicBlogArticle): 文章数据
 *   relatedArticles(PublicBlogArticle[]): 相关文章列表
 *   readingTime(number): 预计阅读时间（分钟）
 *   onTocReady((items: TocItem[]) => void): TOC 数据回调
 *
 * Returns:
 *   JSX.Element: 文章阅读器
 */
export default function BlogArticleReader({
	article,
	relatedArticles,
	readingTime,
	onTocReady,
}: BlogArticleReaderProps) {
	return (
		<>
			<BlogArticleHeader article={article} readingTime={readingTime} />
			<BlogViewTracker slug={article.slug} />
			<BlogArticleContent
				htmlContent={article.content ?? undefined}
				onTocReady={onTocReady}
			/>
			<BlogShareButtons article={article} />
			<BlogRelatedArticles articles={relatedArticles} />
		</>
	);
}
