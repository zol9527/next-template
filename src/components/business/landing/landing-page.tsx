"use client";

import { HeroSection } from "./hero-section";
import { ServicesSection } from "./services-section";
import { ProcessSection } from "./process-section";
import { TestimonialsSection } from "./testimonials-section";
import { CTASection } from "./cta-section";
import { PublicIcpFiling } from "@/components/business/shared/public-icp-filing";

/**
 * Landing Page 主组件
 * 通用后台管理系统展示页面
 *
 * 设计风格：8-bit 像素复古风
 * 配色：冰蓝 + 橙红 CTA，深蓝黑背景
 * 字体：Press Start 2P (标题) + VT323 (正文)
 */
export function LandingPage() {
	return (
		<div className="min-h-screen bg-[var(--color-landing-background)]">
			<HeroSection />
			<ServicesSection />
			<ProcessSection />
			<TestimonialsSection />
			<CTASection />

			<footer className="border-t-2 border-[var(--color-landing-border)] px-6 py-8 text-center [font-family:var(--font-vt323)] text-lg text-[var(--color-landing-muted)]">
				<PublicIcpFiling />
			</footer>
		</div>
	);
}
