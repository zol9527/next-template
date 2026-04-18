'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Function: BlogReadingProgress
 *
 * Description: 阅读进度条组件，固定在页面顶部显示当前文章阅读进度
 *
 * Returns:
 *   JSX.Element: 像素风格阅读进度条
 */
export default function BlogReadingProgress() {
	const [progress, setProgress] = useState(0);
	const rafRef = useRef<number>(0);

	useEffect(() => {
		const handleScroll = () => {
			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
			}

			rafRef.current = requestAnimationFrame(() => {
				const scrollTop = window.scrollY;
				const scrollHeight = document.documentElement.scrollHeight;
				const clientHeight = document.documentElement.clientHeight;

				if (scrollHeight <= clientHeight) {
					setProgress(0);
					return;
				}

				const scrolled = (scrollTop / (scrollHeight - clientHeight)) * 100;
				setProgress(Math.min(100, Math.max(0, scrolled)));
			});
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => {
			window.removeEventListener('scroll', handleScroll);
			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
			}
		};
	}, []);

	return (
		<div className="fixed top-0 left-0 right-0 z-[60] h-[3px] bg-[var(--color-landing-border)]">
			<div
				className="h-full bg-gradient-to-r from-[var(--color-landing-primary)] to-[var(--color-landing-cta)] transition-[width] duration-150 ease-out"
				style={{ width: `${progress}%` }}
			/>
		</div>
	);
}
