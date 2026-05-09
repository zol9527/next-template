'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp } from 'lucide-react';

/**
 * Function: BlogBackToTop
 *
 * Description: 浮动回到顶部按钮，滚动超过一屏后显示，点击平滑滚动到顶部
 *
 * Returns:
 *   JSX.Element: 像素风格回到顶部按钮
 */
export default function BlogBackToTop() {
	const [visible, setVisible] = useState(false);
	const prefersReducedMotion =
		typeof window !== 'undefined'
			? window.matchMedia('(prefers-reduced-motion: reduce)').matches
			: false;

	useEffect(() => {
		let rafId = 0;

		const handleScroll = () => {
			if (rafId) cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(() => {
				setVisible(window.scrollY > 400);
			});
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => {
			window.removeEventListener('scroll', handleScroll);
			if (rafId) cancelAnimationFrame(rafId);
		};
	}, []);

	const scrollToTop = () => {
		window.scrollTo({
			top: 0,
			behavior: prefersReducedMotion ? 'auto' : 'smooth',
		});
	};

	return (
		<AnimatePresence>
			{visible && (
				<motion.button
					type="button"
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.8 }}
					transition={{ duration: 0.2 }}
					onClick={scrollToTop}
					aria-label="回到顶部"
					className="fixed bottom-6 right-6 z-40 hidden max-xl:block w-12 h-12 bg-[var(--color-landing-card)] border-2 border-[var(--color-landing-border)] flex items-center justify-center cursor-pointer hover:bg-[var(--color-landing-primary)] hover:border-[var(--color-landing-primary)] transition-colors duration-200 pixel-float pixel-border-soft"
				>
					<ArrowUp className="w-5 h-5 text-[var(--color-landing-foreground)]" />
				</motion.button>
			)}
		</AnimatePresence>
	);
}
