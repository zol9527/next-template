import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PixelRobot } from "@/components/business/landing/pixel-sprites/pixel-robot";
import { PixelStar } from "@/components/business/landing/pixel-sprites/pixel-star";
import { PixelCoin } from "@/components/business/landing/pixel-sprites/pixel-coin";
import { PixelHeart } from "@/components/business/landing/pixel-sprites/pixel-heart";
import GlitchText from "@/components/ui/GlitchText";
import ClickSpark from "@/components/ui/ClickSpark";

/**
 * CTA Section 组件
 * 8 位像素艺术复古游戏风格
 */
export function CTASection() {
	return (
		<section className="relative isolate overflow-hidden px-4 py-16 sm:px-6 lg:px-8">
			{/* 像素边框效果 */}
			<div 
				className="absolute inset-0 -z-10"
				style={{
					boxShadow: '4px 0 0 0 var(--color-landing-primary), -4px 0 0 0 var(--color-landing-primary), 0 4px 0 0 var(--color-landing-primary), 0 -4px 0 0 var(--color-landing-primary)'
				}}
			/>

			{/* 浮动装饰 - 星星 */}
			<PixelStar className="absolute top-8 right-8 text-[var(--color-landing-primary)] pixel-float" />
			<PixelStar className="absolute bottom-8 left-8 text-[var(--color-landing-primary)] pixel-float" style={{ animationDelay: '1.5s' }} />

			{/* 浮动装饰 - 硬币 */}
			<PixelCoin className="absolute top-16 right-16 text-[var(--color-landing-cta)] pixel-float" style={{ animationDelay: '0.5s' }} />

			{/* 浮动装饰 - 心形 */}
			<PixelHeart className="absolute bottom-16 right-24 text-[var(--color-landing-heart)] pixel-float" style={{ animationDelay: '2s' }} />

			<style jsx>{`
				.pixel-float {
					animation: float 3s ease-in-out infinite;
				}
				.pixel-blink {
					animation: blink 1s step-end infinite;
				}
				@keyframes float {
					0%, 100% { transform: translateY(0); }
					50% { transform: translateY(-10px); }
				}
				@keyframes blink {
					0%, 100% { opacity: 1; }
					50% { opacity: 0; }
				}
			`}</style>
			{/* 像素艺术背景 - 深色卡片背景 */}
			<div className="absolute inset-0 -z-10 bg-[var(--color-landing-card)]" />

			{/* 像素边框顶部 */}
			<div className="absolute top-0 left-0 right-0 h-2 bg-[var(--color-landing-primary)]" />
			
			{/* 像素边框底部 */}
			<div className="absolute bottom-0 left-0 right-0 h-2 bg-[var(--color-landing-primary)]" />

			{/* 像素点图案叠加 */}
			<div 
				className="absolute inset-0 -z-10 opacity-20"
				style={{
					backgroundImage: `
						repeating-linear-gradient(
							0deg,
							rgba(255, 255, 255, 0.1) 0px,
							transparent 1px,
							transparent 2px,
							rgba(255, 255, 255, 0.1) 3px
						),
						repeating-linear-gradient(
							90deg,
							rgba(255, 255, 255, 0.1) 0px,
							transparent 1px,
							transparent 2px,
							rgba(255, 255, 255, 0.1) 3px
						)
					`
				}}
			/>

			<div className="mx-auto max-w-4xl text-center">
				{/* PLAYER 1 READY 徽章 */}
				<div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
					<div className="bg-[var(--color-landing-primary)] px-3 py-1 border-2 border-black text-black text-xs" style={{ fontFamily: 'var(--font-press-start)', fontWeight: 400 }}>
						PLAYER 1 READY
					</div>
				</div>

				{/* 像素机器人插图 */}
				<div className="flex justify-center mb-8">
					<div className="relative">
						<PixelRobot />
						<PixelStar className="absolute -top-2 -right-2" />
					</div>
				</div>

{/* 标题 - Press Start 2P 字体 */}
<GlitchText
	speed={0.3}
	enableShadows={true}
	enableOnHover={true}
	className="text-2xl sm:text-3xl lg:text-4xl [font-family:var(--font-press-start)] text-[var(--color-landing-primary)]"
>
	准备好构建你的管理系统了吗？
</GlitchText>

				{/* 描述 - VT323 字体 */}
				<p
					className="[font-family:var(--font-vt323)] text-lg sm:text-xl text-[var(--color-landing-foreground)] mt-4"
					style={{ fontWeight: 400 }}
				>
					立即开始，体验插件化架构带来的灵活与高效
				</p>

				{/* CTA 按钮 */}
				<ClickSpark sparkColor="#FF6B35" sparkSize={12} sparkRadius={25} sparkCount={8}>
					<div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
						{/* 主要按钮 - 像素风格 */}
						<Button
							asChild
							size="lg"
							className="px-8 py-4 text-lg font-bold text-white cursor-pointer hover:text-[var(--color-landing-cta)] transition-colors"
							style={{
								backgroundColor: 'var(--color-landing-cta)',
								borderRadius: 0,
								boxShadow: '4px 0 0 0 var(--color-landing-cta), -4px 0 0 0 var(--color-landing-cta), 0 4px 0 0 var(--color-landing-cta), 0 -4px 0 0 var(--color-landing-cta), 0 0 0 2px var(--color-landing-cta)'
							}}
						>
							<Link href="#">
								&gt; 免费开始使用
								<ArrowRight className="ml-2 h-5 w-5" />
							</Link>
						</Button>

						{/* 轮廓按钮 - 像素风格 */}
						<Button
							asChild
							variant="outline"
							size="lg"
							className="px-8 py-4 text-lg font-bold cursor-pointer hover:text-[var(--color-landing-primary)] transition-colors"
							style={{
								backgroundColor: 'transparent',
								borderColor: 'var(--color-landing-primary)',
								color: 'var(--color-landing-primary)',
								borderRadius: 0,
								boxShadow: '4px 0 0 0 var(--color-landing-primary), -4px 0 0 0 var(--color-landing-primary), 0 4px 0 0 var(--color-landing-primary), 0 -4px 0 0 var(--color-landing-primary)'
							}}
						>
							<Link href="#">
								查看 GitHub
							</Link>
						</Button>
					</div>
				</ClickSpark>

				{/* 底部信任指标 - VT323 字体 */}
				<div className="[font-family:var(--font-vt323)] text-[var(--color-landing-muted)] mt-12" style={{ fontWeight: 400 }}>
					<p className="flex items-center justify-center gap-8">
						<span className="flex items-center gap-2">
							<PixelStar style={{ color: 'var(--color-landing-success)' }} />
							<span>开源免费</span>
						</span>
						<span className="flex items-center gap-2">
							<PixelStar style={{ color: 'var(--color-landing-success)' }} />
							<span>5 分钟部署</span>
						</span>
						<span className="flex items-center gap-2">
							<PixelStar style={{ color: 'var(--color-landing-success)' }} />
							<span>无需信用卡</span>
						</span>
					</p>
				</div>

				{/* INSERT COIN 闪烁文本 */}
				<div className="mt-8 cursor-pointer" style={{ fontFamily: 'var(--font-press-start)', fontSize: '12px' }}>
					<span className="pixel-blink text-[var(--color-landing-primary)]">INSERT COIN TO CONTINUE ▮</span>
				</div>
			</div>
		</section>
	);
}