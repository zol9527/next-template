'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TocItem } from '@/lib/blog/toc';

/**
 * Interface: BlogTOCSidebarProps
 *
 * Description: TOC 侧边栏组件的 Props 定义
 */
interface BlogTOCSidebarProps {
	tocItems: TocItem[];
	className?: string;
}

/**
 * Function: BlogTOCSidebar
 *
 * Description: 博客文章目录侧边栏组件，支持 IntersectionObserver 追踪当前阅读位置并高亮对应目录项。
 * 桌面端以 sticky 侧边栏形式展示，移动端可由外层通过 Sheet 包装使用。
 *
 * Parameters:
 *   tocItems(TocItem[]): 从 toc.ts 解析得到的目录项列表
 *   className(string | undefined): 额外 CSS 类名
 *
 * Returns:
 *   JSX.Element | null: 目录侧边栏组件，无目录项时返回 null
 */
export default function BlogTOCSidebar({ tocItems, className }: BlogTOCSidebarProps) {
	const [activeId, setActiveId] = useState<string>('');
	const observerRef = useRef<IntersectionObserver | null>(null);

	/**
	 * Function: scrollToHeading
	 *
	 * Description: 点击目录项时平滑滚动到对应标题位置
	 *
	 * Parameters:
	 *   id(string): 目标标题的 DOM id
	 */
	const scrollToHeading = useCallback((id: string) => {
		const element = document.getElementById(id);
		if (!element) return;

		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		element.scrollIntoView({
			behavior: prefersReducedMotion ? 'instant' : 'smooth',
			block: 'start',
		});
	}, []);

	useEffect(() => {
		if (tocItems.length === 0) return;

		observerRef.current = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setActiveId(entry.target.id);
					}
				}
			},
			{
				rootMargin: '-80px 0px -60% 0px',
				threshold: 0,
			},
		);

		for (const item of tocItems) {
			const element = document.getElementById(item.id);
			if (element) {
				observerRef.current.observe(element);
			}
		}

		return () => {
			observerRef.current?.disconnect();
		};
	}, [tocItems]);

	if (tocItems.length === 0) {
		return null;
	}

	return (
		<nav
			className={`bg-[var(--color-landing-card)] border-2 border-[var(--color-landing-border)] p-4 ${className ?? ''}`}
		>
			<h2 className="[font-family:var(--font-press-start)] text-xs text-[var(--color-landing-foreground)] tracking-wider mb-4">
				目录
			</h2>

			<ul className="flex flex-col gap-0">
				{tocItems.map((item) => {
					const isActive = activeId === item.id;

					return (
						<li
							key={item.id}
							className={`${item.level === 3 ? 'pl-6' : 'pl-3'} border-l-2 ${isActive ? 'border-[var(--color-landing-primary)]' : 'border-[var(--color-landing-border)]'}`}
						>
							<button
								type="button"
								onClick={() => scrollToHeading(item.id)}
								className={`[font-family:var(--font-space-grotesk)] text-sm py-1.5 cursor-pointer transition-colors duration-200 text-left w-full ${isActive ? 'text-[var(--color-landing-primary)]' : 'text-[var(--color-landing-muted)] hover:text-[var(--color-landing-primary)]'}`}
							>
								{item.text}
							</button>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
