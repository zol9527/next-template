'use client';

import { useEffect, useMemo, useRef } from 'react';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { extractTocItems, injectHeadingIds, type TocItem } from '@/lib/blog/toc';

// 注册 GSAP ScrollTrigger 插件
gsap.registerPlugin(ScrollTrigger);

/**
 * Interface: BlogArticleContentProps
 *
 * Description: 博客文章内容渲染器的属性定义
 *
 * Properties:
 *   className(string | undefined): 额外 CSS 类名
 *   htmlContent(string | null | undefined): 文章 HTML 内容
 *   onTocReady((items: TocItem[]) => void | undefined): TOC 数据准备就绪时的回调函数
 */
interface BlogArticleContentProps {
	className?: string;
	htmlContent: string | null | undefined;
	onTocReady?: (items: TocItem[]) => void;
}

/**
 * Function: BlogArticleContent
 *
 * Description: 博客文章 HTML 内容渲染器。
 * 使用 dangerouslySetInnerHTML 渲染 TipTap 编辑器输出的 HTML，
 * 支持标题 ID 注入（用于 TOC 锚点定位）和 GSAP ScrollTrigger 滚动动画。
 * 深色主题下需要 prose-invert 确保文字可读性。
 *
 * Parameters:
 *   htmlContent(string | null | undefined): 文章 HTML 内容
 *   className(string | undefined): 额外 CSS 类名
 *   onTocReady((items: TocItem[]) => void | undefined): TOC 数据回调
 *
 * Returns:
 *   JSX.Element | null: 渲染后的文章内容
 */
export default function BlogArticleContent({ htmlContent, className, onTocReady }: BlogArticleContentProps) {
	// 容器 DOM 引用，用于 GSAP 动画绑定
	const containerRef = useRef<HTMLDivElement>(null);

	// 使用 useRef 保存 onTocReady 回调引用，避免作为 useEffect 依赖导致重复执行
	const onTocReadyRef = useRef(onTocReady);
	onTocReadyRef.current = onTocReady;

	// 使用 useMemo 缓存 HTML 处理结果，避免每次渲染重复计算
	const { processedHtml, tocItems } = useMemo(() => {
		if (!htmlContent) {
			return { processedHtml: '', tocItems: [] as TocItem[] };
		}

		let processed = injectHeadingIds(htmlContent);

		// 空 src img 标签 → 1x1 透明占位符，防止浏览器重复请求当前页面
		processed = processed.replace(/<img\s([^>]*?)src=["']\s*["']([^>]*)>/gi, (match) => {
			return match.replace(/src=["']\s*["']/gi, 'src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"');
		});

		const items = extractTocItems(processed);

		return { processedHtml: processed, tocItems: items };
	}, [htmlContent]);

	// TOC 数据就绪时通知父组件
	useEffect(() => {
		if (tocItems.length > 0 && onTocReadyRef.current) {
			onTocReadyRef.current(tocItems);
		}
	}, [tocItems]);

	// GSAP ScrollTrigger 滚动动画
	useEffect(() => {
		// 无内容或无容器时跳过
		if (!processedHtml || !containerRef.current) {
			return;
		}

		// 尊重用户的减少动画偏好
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
		if (prefersReducedMotion.matches) {
			return;
		}

		const container = containerRef.current;
		const animations: gsap.core.Tween[] = [];
		const triggers: ScrollTrigger[] = [];

		// --- h2/h3 标题：淡入 + 轻微上移 ---
		const headings = container.querySelectorAll('.prose h2, .prose h3');
		headings.forEach((heading) => {
			const tween = gsap.fromTo(
				heading,
				{ opacity: 0, y: 16 },
				{
					opacity: 1,
					y: 0,
					duration: 0.5,
					ease: 'power2.out',
					scrollTrigger: {
						trigger: heading,
						start: 'top 85%',
						once: true,
					},
				},
			);
			animations.push(tween);
			if (tween.scrollTrigger) {
				triggers.push(tween.scrollTrigger);
			}
		});

		// --- 段落/列表：透明度随滚动渐变（scrub 模式） ---
		const paragraphs = container.querySelectorAll('.prose p, .prose ul, .prose ol');
		paragraphs.forEach((el) => {
			const tween = gsap.fromTo(
				el,
				{ opacity: 0.2 },
				{
					opacity: 1,
					scrollTrigger: {
						trigger: el,
						start: 'top 85%',
						end: 'top 50%',
						scrub: true,
					},
				},
			);
			animations.push(tween);
			if (tween.scrollTrigger) {
				triggers.push(tween.scrollTrigger);
			}
		});

		// --- 图片：淡入 + 轻微缩放 ---
		const images = container.querySelectorAll('.prose img');
		images.forEach((img) => {
			const tween = gsap.fromTo(
				img,
				{ opacity: 0, scale: 0.98 },
				{
					opacity: 1,
					scale: 1,
					duration: 0.4,
					scrollTrigger: {
						trigger: img,
						start: 'top 85%',
						once: true,
					},
				},
			);
			animations.push(tween);
			if (tween.scrollTrigger) {
				triggers.push(tween.scrollTrigger);
			}
		});

		// --- 代码块：从左侧淡入 ---
		const codeBlocks = container.querySelectorAll('.prose pre');
		codeBlocks.forEach((block) => {
			const tween = gsap.fromTo(
				block,
				{ opacity: 0, x: -12 },
				{
					opacity: 1,
					x: 0,
					duration: 0.4,
					scrollTrigger: {
						trigger: block,
						start: 'top 85%',
						once: true,
					},
				},
			);
			animations.push(tween);
			if (tween.scrollTrigger) {
				triggers.push(tween.scrollTrigger);
			}
		});

		// --- 引用块：左边框生长效果 ---
		const blockquotes = container.querySelectorAll('.prose blockquote');
		blockquotes.forEach((quote) => {
			// 获取实际的 border-left-width 值
			const computedStyle = window.getComputedStyle(quote);
			const targetBorderWidth = computedStyle.borderLeftWidth || '4px';

			// 先设置初始状态
			gsap.set(quote, { borderLeftWidth: '0px' });

			const tween = gsap.to(quote, {
				borderLeftWidth: targetBorderWidth,
				duration: 0.5,
				scrollTrigger: {
					trigger: quote,
					start: 'top 85%',
					once: true,
				},
			});
			animations.push(tween);
			if (tween.scrollTrigger) {
				triggers.push(tween.scrollTrigger);
			}
		});

		// 清理函数：仅 kill 与当前容器相关的 ScrollTrigger
		return () => {
			triggers.forEach((st) => {
				st.kill();
			});
			animations.forEach((anim) => {
				anim.kill();
			});
		};
	}, [processedHtml]);

	if (!processedHtml) {
		return null;
	}

	return (
		<div
			ref={containerRef}
			className={`prose prose-invert max-w-none mt-8 text-white [font-family:var(--font-space-grotesk)] text-lg leading-relaxed [&_h1]:[font-family:var(--font-archivo)] [&_h1]:font-bold [&_h1]:!text-[var(--color-landing-primary)] [&_h2]:[font-family:var(--font-archivo)] [&_h2]:font-semibold [&_h2]:!text-[var(--color-landing-primary)] [&_h3]:[font-family:var(--font-archivo)] [&_h3]:font-semibold [&_h3]:!text-white [&_p]:!text-white [&_li]:!text-white [&_span]:!text-white [&_a]:text-[var(--color-landing-primary)] [&_a:hover]:text-[var(--color-landing-cta)] [&_strong]:!text-white [&_code]:pixel-border [&_code]:bg-[var(--color-landing-card)] [&_code]:text-[var(--color-landing-cta)] [&_blockquote]:border-l-[var(--color-landing-primary)] [&_blockquote]:!text-white [&_hr]:border-[var(--color-landing-border)] [&_td]:!text-white [&_th]:!text-white [&_figcaption]:!text-white [&_figcaption]:text-sm [&_figcaption]:opacity-70 ${className ?? ''}`}
			dangerouslySetInnerHTML={{ __html: processedHtml }}
		/>
	);
}
