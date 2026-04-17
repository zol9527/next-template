import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
	PixelRobot,
	PixelMonitor,
	PixelStar,
	PixelCoin,
	PixelCursor,
	PixelHeart,
	PixelDivider,
} from "@/components/business/landing/pixel-sprites";

/**
 * Hero Section 组件
 * 8-bit像素艺术复古游戏风格的主视觉区域
 * 
 * 功能特点：
 * - 全宽布局，响应式设计
 * - 像素网格背景和边框装饰
 * - 双 CTA 按钮设计
 * - 信任指标展示
 * - 硬边框像素艺术风格
 */
export function HeroSection() {
	return (
		<section className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
			{/* 像素网格背景 */}
			<div className="absolute inset-0 -z-10 bg-[var(--color-landing-background)]">
				<div className="absolute inset-0 pixel-grid" />
			</div>

			{/* 浮动装饰元素 */}
			<div className="absolute top-8 right-8">
				<PixelStar className="w-6 h-6" />
			</div>
			<div className="absolute top-12 right-20">
				<PixelStar className="w-5 h-5" />
			</div>
			<div className="absolute top-16 right-32">
				<PixelStar className="w-7 h-7" />
			</div>
			
			<div className="absolute bottom-8 left-8">
				<PixelCoin className="w-6 h-5 pixel-float" />
			</div>
			
			<div className="absolute top-8 left-8">
				<PixelHeart className="w-6 h-6" />
			</div>

			<div className="mx-auto max-w-6xl">
				{/* 顶部像素边框标签 */}
				<div className="mb-8 inline-flex items-center px-4 py-2 text-sm font-medium text-[var(--color-landing-primary)] pixel-border-primary cursor-pointer">
					<PixelStar />
					开源插件化架构
				</div>

				{/* 两列布局 - 桌面端 */}
				<div className="flex flex-col lg:flex-row gap-12">
					{/* 左侧列 - 文本内容 */}
					<div className="flex-1 text-center lg:text-left">
						{/* 主标题 - Press Start 2P字体 */}
						<h1
							className="text-lg font-bold leading-loose tracking-wider text-[var(--color-landing-primary)] sm:text-xl lg:text-2xl"
							style={{ fontFamily: 'var(--font-press-start)' }}
						>
							构建你的
							<br />
							下一代管理系统
						</h1>

						{/* 描述 - VT323字体 */}
						<p
							className="mt-6 text-xl leading-relaxed text-[var(--color-landing-muted)] sm:text-2xl"
							style={{ fontFamily: 'var(--font-vt323)' }}
						>
							基于插件化架构的现代后台系统。核心系统提供认证与权限，业务功能按需加载，灵活扩展。
						</p>

						{/* 像素分隔线 */}
						<PixelDivider />

						{/* CTA 按钮 - 像素风格 */}
						<div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
							<Button
								asChild
								size="lg"
								className="min-w-[160px] px-8 py-6 text-base font-semibold transition-colors duration-150 cursor-pointer"
								style={{
									fontFamily: 'var(--font-press-start)',
									fontSize: '12px',
									backgroundColor: 'var(--color-landing-primary)',
									color: '#fff',
									borderRadius: 0,
									boxShadow: '4px 0 0 0 var(--color-landing-secondary), -4px 0 0 0 var(--color-landing-secondary), 0 4px 0 0 var(--color-landing-secondary), 0 -4px 0 0 var(--color-landing-secondary)',
								}}
							>
								<Link href="#features">开始使用</Link>
							</Button>
							<Button
								asChild
								size="lg"
								variant="outline"
								className="min-w-[160px] px-8 py-6 text-base font-semibold transition-colors duration-150 cursor-pointer"
								style={{
									fontFamily: 'var(--font-press-start)',
									fontSize: '12px',
									borderColor: 'var(--color-landing-primary)',
									color: 'var(--color-landing-primary)',
									borderRadius: 0,
								}}
							>
								<Link href="#process">查看文档</Link>
							</Button>
						</div>

						{/* 信任指标 - 像素艺术风格 */}
						<div className="mt-16 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-12">
							<div className="text-center">
								<div className="text-sm font-bold text-[var(--color-landing-primary)]" style={{ fontFamily: 'var(--font-press-start)' }}>
									10+
								</div>
								<div className="mt-2 text-lg text-[var(--color-landing-muted)]" style={{ fontFamily: 'var(--font-vt323)' }}>
									插件模块
								</div>
							</div>
							<div className="text-center">
								<div className="text-sm font-bold text-[var(--color-landing-primary)]" style={{ fontFamily: 'var(--font-press-start)' }}>
									99.9%
								</div>
								<div className="mt-2 text-lg text-[var(--color-landing-muted)]" style={{ fontFamily: 'var(--font-vt323)' }}>
									服务可用性
								</div>
							</div>
							<div className="text-center">
								<div className="text-sm font-bold text-[var(--color-landing-primary)]" style={{ fontFamily: 'var(--font-press-start)' }}>
									50ms
								</div>
								<div className="mt-2 text-lg text-[var(--color-landing-muted)]" style={{ fontFamily: 'var(--font-vt323)' }}>
									平均响应
								</div>
							</div>
						</div>
					</div>

					{/* 右侧列 - 像素艺术插图区域 */}
					<div className="flex-1 flex items-center justify-center lg:justify-end">
						<div className="relative w-full max-w-md h-64 lg:h-80">
							{/* 像素艺术背景 */}
							<div className="absolute inset-0 bg-[var(--color-landing-background)] rounded-none" style={{ imageRendering: 'pixelated' }}>
								<div className="absolute inset-0 pixel-grid" />
							</div>
							
							{/* 像素机器人 - 主要角色 */}
							<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
								<PixelRobot className="w-24 h-24" />
							</div>

							{/* 像素显示器 - 在机器人旁边 */}
							<div className="absolute" style={{ top: 'calc(50% - 20px)', left: 'calc(50% + 60px)' }}>
								<PixelMonitor />
							</div>

							{/* 星星 - 散布在周围 */}
							<div className="absolute top-8 right-8">
								<PixelStar className="w-8 h-8" />
							</div>
							<div className="absolute top-16 left-12">
								<PixelStar className="w-6 h-6" />
							</div>
							<div className="absolute bottom-12 right-16">
								<PixelStar className="w-7 h-7" />
							</div>

							{/* 浮动硬币 */}
							<div className="absolute top-20 left-1/4 animate-pulse">
								<PixelCoin className="w-6 h-5" />
							</div>

							{/* 闪烁光标 - 在显示器附近 */}
							<div className="absolute" style={{ top: 'calc(50% - 10px)', left: 'calc(50% + 80px)' }}>
								<PixelCursor />
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}