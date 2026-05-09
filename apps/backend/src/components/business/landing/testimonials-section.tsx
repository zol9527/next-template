import { Star } from "lucide-react";
import { PixelAvatar, PixelStar, PixelHeart, PixelDivider } from "@/components/business/landing/pixel-sprites";

/**
 * Testimonials Section 组件
 * 展示虚构科技公司评价 - 8位像素艺术复古游戏风格
 */
export function TestimonialsSection() {
	const testimonials = [
		{
			name: "陈磊",
			role: "CTO, TechFlow Inc.",
			content:
				"插件化架构让我们的开发效率提升了 3 倍。核心系统稳定，业务模块按需加载，再也不用维护庞大的单体应用了。",
			rating: 5,
		},
		{
			name: "林雨桐",
			role: "技术负责人, DataPulse",
			content:
				"RBAC 权限系统设计得非常精细，满足了我们多层级组织架构的需求。API 文档自动生成，前后端协作效率大幅提升。",
			rating: 5,
		},
		{
			name: "赵明远",
			role: "独立开发者",
			content:
				"作为一个人的 SaaS 项目，Generic Admin 让我专注在业务逻辑上。多数据库支持和 TypeScript 全栈让开发体验非常丝滑。",
			rating: 5,
		},
	];

	return (
		<section className="px-4 py-20 sm:px-6 lg:px-8 relative overflow-hidden">
			{/* NPC TALK 徽章 */}
			<div className="absolute top-4 left-4 z-10">
				<div className="inline-block px-3 py-1 border-2 border-[var(--color-landing-primary)] bg-[var(--color-landing-card)]">
					<span className="[font-family:var(--font-press-start)] text-xs text-[var(--color-landing-primary)]" style={{ fontWeight: 700 }}>
						NPC DIALOG
					</span>
				</div>
			</div>

			{/* 装饰性心形 */}
			<div className="absolute top-8 right-8 z-10">
				<PixelHeart />
			</div>

			<div className="mx-auto max-w-6xl">
				{/* 标题 */}
				<div className="text-center">
					<h2
						className="[font-family:var(--font-press-start)] text-lg font-bold text-[var(--color-landing-foreground)] sm:text-xl"
						style={{ fontWeight: 700 }}
					>
						用户评价
					</h2>
					<p
						className="mt-4 [font-family:var(--font-vt323)] text-lg text-[var(--color-landing-muted)]"
						style={{ fontWeight: 400 }}
					>
						听听团队怎么说
					</p>
				</div>

				{/* PixelDivider */}
				<div className="flex justify-center my-6">
					<PixelDivider />
				</div>

				{/* 评价卡片 */}
				<div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
					{testimonials.map((testimonial, index) => (
						<div
							key={index}
							className="flex flex-col bg-[var(--color-landing-card)] p-8 cursor-pointer border-2 border-[var(--color-landing-border)] relative"
						>
							<div className="flex items-center gap-1 mb-4">
								{Array.from({ length: testimonial.rating }).map((_, i) => (
									<Star
										key={i}
										className="h-5 w-5 fill-[var(--color-landing-gold)] text-[var(--color-landing-gold)]"
									/>
								))}
								<PixelStar className="ml-2" />
							</div>

							<div className="flex-1 pl-4 border-l-4 border-[var(--color-landing-primary)]">
								<p
									className="[font-family:var(--font-vt323)] text-xl leading-relaxed text-[var(--color-landing-foreground)]"
									style={{ fontWeight: 400 }}
								>
									&ldquo;{testimonial.content}&rdquo;
								</p>
							</div>

							<div className="mt-6 pt-4 border-t border-[var(--color-landing-border)] flex items-center gap-4">
								<div className="shrink-0" style={{ width: 30, height: 35 }}>
									<PixelAvatar index={index} />
								</div>
								<div>
									<div
										className="[font-family:var(--font-press-start)] text-xs text-[var(--color-landing-foreground)]"
										style={{ fontWeight: 700 }}
									>
										{testimonial.name}
									</div>
									<div
										className="mt-1 [font-family:var(--font-vt323)] text-base text-[var(--color-landing-muted)]"
										style={{ fontWeight: 400 }}
									>
										{testimonial.role}
									</div>
								</div>
							</div>
						</div>
					))}
				</div>

				{/* PRESS START TO READ MORE */}
				<div className="mt-12 text-center">
					<p className="inline-block cursor-pointer border-2 border-[var(--color-landing-primary)] bg-[var(--color-landing-card)] px-4 py-2">
						<span className="pixel-blink [font-family:var(--font-press-start)] text-sm text-[var(--color-landing-primary)]" style={{ fontWeight: 700 }}>
							PRESS ▶ TO READ MORE
						</span>
					</p>
				</div>
			</div>
		</section>
	);
}