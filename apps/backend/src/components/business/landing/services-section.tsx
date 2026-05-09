import { FileSearch, Code2 } from "lucide-react";
import { PixelChest, PixelShield, PixelSword, PixelPotion, PixelStar, PixelDivider } from "@/components/business/landing/pixel-sprites";
import BlurText from "@/components/BlurText";

/**
 * Services Section 组件
 * 展示科技 SaaS 系统的核心特性
 * 
 * 功能特点：
 * - 6 个特性卡片，2x3 网格布局
 * - 响应式设计，支持不同屏幕尺寸
 * - 8位像素艺术复古游戏风格
 * - 使用语义化图标
 * - 颜色变量统一管理
 */
export function ServicesSection() {
	const features = [
		{
			title: "插件化架构",
			description: "Core + Plugins 设计，业务模块按需启用，零耦合扩展。"
		},
		{
			title: "RBAC 权限控制",
			description: "精细的角色与权限管理，支持多层级授权策略。"
		},
		{
			title: "API 优先设计",
			description: "RESTful API + OpenAPI 文档，前后端分离架构。"
		},
		{
			title: "多数据库支持",
			description: "MySQL / PostgreSQL / SQLite，工厂模式切换。"
		},
		{
			title: "审计日志",
			description: "全链路操作追踪，敏感字段自动脱敏。"
		},
		{
			title: "开发者友好",
			description: "TypeScript 全栈、结构化日志、完善文档。"
		},
	];

	return (
<section id="features" className="px-4 py-20 sm:px-6 lg:px-8 relative overflow-hidden">
	<div className="mx-auto max-w-6xl">
		{/* 像素艺术 section badge */}
		<div className="absolute top-8 left-8 z-10">
			<div className="px-3 py-1 border-2 border-[var(--color-landing-primary)] bg-[var(--color-landing-background)]">
				<span className="[font-family:var(--font-press-start)] text-sm text-[var(--color-landing-primary)]" style={{ fontWeight: 700 }}>
					LV.1
				</span>
			</div>
		</div>

		{/* 装饰性星星 */}
		<div className="absolute top-16 right-16 z-10">
			<PixelStar className="w-6 h-6" />
		</div>
		<div className="absolute bottom-20 left-20 z-10">
			<PixelStar className="w-4 h-4" />
		</div>
{/* 标题 */}
	<div className="text-center">
		<BlurText
			text="核心特性"
			className="[font-family:var(--font-press-start)] text-lg font-bold text-[var(--color-landing-foreground)] sm:text-xl inline-flex"
			animateBy="letters"
			direction="top"
			delay={50}
		/>
		<p className="mt-4 [font-family:var(--font-vt323)] text-lg text-[var(--color-landing-muted)]" style={{ fontWeight: 400 }}>
			强大的功能特性，构建现代化管理系统
		</p>
	</div>

	{/* PixelDivider */}
	<PixelDivider />

	{/* 特性卡片 */}
	<div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
					{features.map((feature, index) => {
						return (
							<div
								key={index}
								className="group cursor-pointer rounded-none bg-[var(--color-landing-card)] p-8 pixel-border transition-colors duration-150 hover:bg-[var(--color-landing-primary)]/10 relative"
							>
								{/* 图标容器 */}
								<div className="inline-flex rounded-none bg-[var(--color-landing-background)] p-3 transition-colors group-hover:bg-[var(--color-landing-secondary)]">
									{feature.title === "插件化架构" && <PixelChest className="h-6 w-6" />}
									{feature.title === "RBAC 权限控制" && <PixelShield className="h-6 w-6" />}
									{feature.title === "API 优先设计" && <PixelSword className="h-6 w-6" />}
									{feature.title === "多数据库支持" && <PixelPotion className="h-6 w-6" />}
									{feature.title === "审计日志" && <FileSearch className="h-6 w-6 text-[var(--color-landing-primary)]" />}
									{feature.title === "开发者友好" && <Code2 className="h-6 w-6 text-[var(--color-landing-primary)]" />}
								</div>

								{/* 标题 */}
								<h3
									className="mt-6 [font-family:var(--font-press-start)] text-sm font-semibold text-[var(--color-landing-foreground)] relative"
									style={{ fontWeight: 700 }}
								>
									{feature.title}
									{/* 悬停时显示的星星 */}
									<PixelStar className="absolute -right-8 top-0 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
								</h3>

								{/* 描述 */}
								<p
									className="mt-4 [font-family:var(--font-vt323)] text-lg leading-relaxed text-[var(--color-landing-muted)]"
									style={{ fontWeight: 400 }}
								>
									{feature.description}
								</p>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}