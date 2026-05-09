'use client';

import { useState, useCallback } from 'react';
import { List } from 'lucide-react';
import type { PublicBlogArticle } from '@/contracts/dtos/public/blog/articles.dto';
import type { TocItem } from '@/lib/blog/toc';
import BlogTOCSidebar from '@/components/business/blog/blog-toc-sidebar';
import BlogReadingProgress from '@/components/business/blog/blog-reading-progress';
import BlogBackToTop from '@/components/business/blog/blog-back-to-top';
import BlogArticleReader from '@/components/business/blog/blog-article-reader';
import {
	Sheet,
	SheetTrigger,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from '@/components/ui/sheet';

/**
 * Interface: BlogArticleShellProps
 *
 * Description: 文章阅读页面客户端壳组件属性
 */
interface BlogArticleShellProps {
	article: PublicBlogArticle;
	relatedArticles: PublicBlogArticle[];
	readingTime: number;
}

/**
 * Function: BlogArticleShell
 *
 * Description: 文章阅读页面客户端壳组件。管理 TOC 状态、阅读进度条、回到顶部按钮。
 * 桌面端双栏布局（正文 + sticky TOC 侧边栏），移动端 Sheet 抽屉目录。
 *
 * Parameters:
 *   article(PublicBlogArticle): 文章数据
 *   relatedArticles(PublicBlogArticle[]): 相关文章列表
 *   readingTime(number): 预计阅读时间（分钟）
 *
 * Returns:
 *   JSX.Element: 双栏阅读布局
 */
export default function BlogArticleShell({
	article,
	relatedArticles,
	readingTime,
}: BlogArticleShellProps) {
	const [tocItems, setTocItems] = useState<TocItem[]>([]);
	const [sheetOpen, setSheetOpen] = useState(false);

	const handleTocReady = useCallback((items: TocItem[]) => {
		setTocItems(items);
	}, []);

	return (
		<>
			<BlogReadingProgress />

			<div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-8">
					<main>
						<BlogArticleReader
							article={article}
							relatedArticles={relatedArticles}
							readingTime={readingTime}
							onTocReady={handleTocReady}
						/>
					</main>

					{tocItems.length > 0 && (
						<aside className="hidden xl:block">
							<div className="sticky top-[6rem]">
								<div
									className="max-h-[calc(100vh-8rem)] overflow-y-auto"
									style={{
										scrollbarWidth: 'thin',
										scrollbarColor: 'var(--color-landing-border) transparent',
									}}
								>
									<BlogTOCSidebar tocItems={tocItems} />
								</div>
							</div>
						</aside>
					)}
				</div>
			</div>

			{tocItems.length > 0 && (
				<div className="xl:hidden fixed bottom-6 right-6 z-40">
					<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
						<SheetTrigger asChild>
							<button
								type="button"
								aria-label="打开目录"
								className="w-12 h-12 bg-[var(--color-landing-card)] border-2 border-[var(--color-landing-border)] flex items-center justify-center cursor-pointer hover:bg-[var(--color-landing-primary)] hover:border-[var(--color-landing-primary)] transition-colors duration-200"
							>
								<List className="w-5 h-5 text-[var(--color-landing-foreground)]" />
							</button>
						</SheetTrigger>
						<SheetContent
							side="right"
							className="bg-[var(--color-landing-background)] border-[var(--color-landing-border)]"
							showCloseButton={false}
						>
							<SheetHeader>
								<SheetTitle className="[font-family:var(--font-press-start)] text-xs text-[var(--color-landing-foreground)] tracking-wider">
									目录
								</SheetTitle>
								<SheetDescription className="sr-only">
									文章目录导航
								</SheetDescription>
							</SheetHeader>
							<div className="px-4 pb-4">
								<BlogTOCSidebar tocItems={tocItems} />
							</div>
						</SheetContent>
					</Sheet>
				</div>
			)}

			<div className="xl:hidden">
				<BlogBackToTop />
			</div>
		</>
	);
}
