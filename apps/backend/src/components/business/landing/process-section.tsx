import { CheckCircle2 } from "lucide-react";
import { PixelStar, PixelCoin, PixelProgressBar, PixelDivider, PixelChest } from "@/components/business/landing/pixel-sprites";

/**
 * Process Section 组件
 * 展示系统使用流程：安装→配置→部署→扩展
 * 像素艺术复古游戏风格
 */
export function ProcessSection() {
	const steps = [
		{
			step: "01",
			title: "安装部署",
			description: "一键安装依赖，自动初始化数据库，开箱即用。",
			status: "快速部署"
		},
		{
			step: "02",
			title: "配置权限",
			description: "设置角色与权限策略，定义访问控制规则。",
			status: "安全可靠"
		},
		{
			step: "03",
			title: "启用插件",
			description: "按需开启业务模块：电商、微信、分销推广等。",
			status: "灵活扩展"
		},
		{
			step: "04",
			title: "持续迭代",
			description: "插件独立升级，核心系统稳定运行，无缝扩展。",
			status: "稳定可靠"
		},
	];

	return (
		<section id="process" className="bg-[var(--color-landing-background)] px-4 py-20 sm:px-6 lg:px-8 relative overflow-hidden">
					{/* 装饰性 PixelStar 元素 */}
					<div className="absolute top-8 left-8">
						<PixelStar className="h-8 w-8 text-[var(--color-landing-primary)]" />
					</div>
					<div className="absolute bottom-8 right-8">
						<PixelStar className="h-8 w-8 text-[var(--color-landing-primary)]" />
					</div>

					{/* 装饰性 PixelCoin 元素 */}
					<div className="absolute top-16 right-16">
						<PixelCoin className="h-6 w-6 text-[var(--color-landing-primary)] pixel-float" />
					</div>
			<div className="mx-auto max-w-6xl">
{/* 标题 */}
					<div className="text-center">
{/* QUEST LOG 徽章 */}
					<div className="inline-block mb-4 px-4 py-2 border-2 border-[var(--color-landing-primary)] bg-[var(--color-landing-background)]">
						<span className="[font-family:var(--font-press-start)] text-sm font-bold text-[var(--color-landing-primary)]">
							QUEST LOG
						</span>
					</div>

						<h2
							className="[font-family:var(--font-press-start)] text-lg font-bold text-[var(--color-landing-foreground)] sm:text-xl"
							style={{ fontWeight: 700 }}
						>
							快速上手
						</h2>
						<p
							className="[font-family:var(--font-vt323)] text-lg text-[var(--color-landing-muted)]"
							style={{ fontWeight: 400 }}
						>
							四步搭建你的管理系统
						</p>

						{/* PixelDivider */}
						<div className="my-4">
							<PixelDivider />
						</div>
					</div>

{/* 步骤 */}
					<div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
						{steps.map((item, index) => (
							<div key={index} className="relative">
								{/* 连接线（仅在大屏幕显示） */}
								{index < steps.length - 1 && (
									<div className="absolute right-0 top-12 hidden h-2 w-full translate-x-1/2 border-dashed border-[var(--color-landing-primary)] lg:block" />
								)}

<div className="relative cursor-pointer transition-all hover:bg-[var(--color-landing-card)]" style={{ boxShadow: '4px 0 0 0 var(--color-landing-border), -4px 0 0 0 var(--color-landing-border), 0 4px 0 0 var(--color-landing-border), 0 -4px 0 0 var(--color-landing-border)' }}>
										<div className="p-6">
											{/* 步骤类型标签 */}
											<div className="text-center mb-2">
												<span className="[font-family:var(--font-vt323)] text-xs text-[var(--color-landing-muted)]">
													{item.step === "01" || item.step === "02" ? "[ MAIN QUEST ]" : item.step === "03" ? "[ SIDE QUEST ]" : "[ DAILY ]"}
												</span>
											</div>

											{/* 步骤编号 - 方形框 */}
											<div className="inline-flex h-12 w-12 items-center justify-center bg-[var(--color-landing-primary)] border-2 border-[var(--color-landing-foreground)]">
												<span className="[font-family:var(--font-press-start)] text-lg font-bold text-white">
													{item.step}
												</span>
											</div>

											{/* 标题 */}
											<h3
												className="[font-family:var(--font-press-start)] text-sm font-bold text-[var(--color-landing-foreground)] mt-6"
												style={{ fontWeight: 700 }}
											>
												{item.title}
											</h3>

											{/* 描述 */}
											<p
												className="[font-family:var(--font-vt323)] text-lg leading-relaxed text-[var(--color-landing-muted)] mt-3"
												style={{ fontWeight: 400 }}
											>
												{item.description}
											</p>

{/* 像素进度条 */}
											<PixelProgressBar 
												value={item.step === "01" ? 100 : item.step === "02" ? 75 : item.step === "03" ? 50 : 25} 
												max={100} 
											/>

											{/* 完成标识 */}
											<div className="mt-4 flex items-center gap-2">
												<CheckCircle2 className="h-4 w-4 text-[var(--color-landing-success)]" />
												<span className="[font-family:var(--font-vt323)] text-sm text-[var(--color-landing-success)]">
													{item.status}
												</span>
												{/* 奖励元素 - 仅 Step 01 */}
												{item.step === "01" && (
													<PixelChest className="h-5 w-5 text-[var(--color-landing-primary)]" />
												)}
											</div>
										</div>
									</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}