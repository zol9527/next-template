/**
 * File: kpi-card.tsx
 * Description: KPI 卡片组件 — 带变体的管理后台 KPI 指标卡片
 *
 * 设计规范:
 * - 5 种视觉变体: default, primary, success, warning, danger
 * - 图标色块: 28×28px, 使用变体对应的浅底背景 + 主题色图标
 * - 数值: Outfit 600, 22px (--font-display), tabular-nums
 * - 标签: DM Sans 400, 11px, --fg-muted
 * - 卡片容器: border + --surface 背景, 无阴影 (信息卡片风格)
 * - 可选趋势标签: pill 圆角, 10px, 语义色
 *
 * 变体色彩映射:
 * - default:  --fg-secondary 图标色 / --bg 浅底
 * - primary:  --ds-accent / --ds-accent-subtle
 * - success:  --teal / --teal-subtle
 * - warning:  --gold / --gold-subtle
 * - danger:   --rose / --rose-subtle
 */

"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

// 复用 kpi-indicator 中的趋势类型
import type { TrendDirection, TrendInfo } from "./kpi-indicator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Type: KpiCardVariant
 *
 * Description: KPI 卡片的视觉变体
 */
export type KpiCardVariant =
	| "default"
	| "primary"
	| "success"
	| "warning"
	| "danger";

/**
 * Type: KpiCardProps
 *
 * Description: KPI 卡片组件属性
 *
 * Properties:
 *   variant(KpiCardVariant): 视觉变体（默认 default）
 *   icon(React.ReactNode): 图标元素（必填）
 *   value(string | number): 指标数值（必填）
 *   label(string): 指标标签（必填）
 *   trend(TrendInfo): 趋势信息（可选）
 *   onClick(function): 点击回调（可选，传入后卡片变为可点击）
 *   className(string): 自定义样式
 */
export interface KpiCardProps {
	/** 视觉变体 */
	variant?: KpiCardVariant;
	/** 图标元素（建议传入 16px 的 lucide 图标） */
	icon: React.ReactNode;
	/** 指标数值 */
	value: string | number;
	/** 指标标签 */
	label: string;
	/** 趋势信息 */
	trend?: TrendInfo;
	/** 点击回调，传入后卡片变为可点击样式 */
	onClick?: () => void;
	/** 自定义样式 */
	className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Constant: VARIANT_COLOR_MAP
 *
 * Description: KPI 卡片变体到颜色 CSS 变量的映射
 *
 * Details:
 *   每个变体包含前景色（图标颜色）和浅底色（图标背景色）
 */
const VARIANT_COLOR_MAP: Record<
	KpiCardVariant,
	{ color: string; subtle: string }
> = {
	default: {
		color: "var(--fg-secondary)",
		subtle: "var(--bg)",
	},
	primary: {
		color: "var(--ds-accent)",
		subtle: "var(--ds-accent-subtle)",
	},
	success: {
		color: "var(--teal)",
		subtle: "var(--teal-subtle)",
	},
	warning: {
		color: "var(--gold)",
		subtle: "var(--gold-subtle)",
	},
	danger: {
		color: "var(--rose)",
		subtle: "var(--rose-subtle)",
	},
};

/**
 * Constant: TREND_STYLE_MAP
 *
 * Description: 趋势方向到颜色和图标的映射（与 kpi-indicator 保持一致）
 */
const TREND_STYLE_MAP: Record<
	TrendDirection,
	{ color: string; Icon: typeof TrendingUp }
> = {
	up: { color: "var(--teal)", Icon: TrendingUp },
	down: { color: "var(--rose)", Icon: TrendingDown },
	stable: { color: "var(--fg-muted)", Icon: Minus },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Function: KpiCard
 *
 * Description: 管理后台 KPI 卡片组件，支持 5 种视觉变体。
 *              信息卡片风格（border + 无阴影），包含图标色块、数值、标签和可选趋势。
 *              可通过 onClick 属性变为可点击卡片。
 *
 * Parameters:
 *   variant(KpiCardVariant): 视觉变体
 *   icon(React.ReactNode): 图标元素
 *   value(string | number): 数值
 *   label(string): 标签
 *   trend(TrendInfo): 趋势
 *   onClick(function): 点击回调
 *   className(string): 自定义样式
 *
 * Returns:
 *   JSX.Element: KPI 卡片
 *
 * Example:
 *   <KpiCard variant="primary" icon={<Users />} value="12,846" label="学员总数" />
 *
 *   <KpiCard
 *     variant="success"
 *     icon={<BookOpen />}
 *     value="98.5%"
 *     label="课程完成率"
 *     trend={{ direction: 'up', value: '+2.3%' }}
 *     onClick={() => router.push('/courses')}
 *   />
 */
export function KpiCard({
	variant = "default",
	icon,
	value,
	label,
	trend,
	onClick,
	className,
}: KpiCardProps) {
	const { color, subtle } = VARIANT_COLOR_MAP[variant];
	const isClickable = typeof onClick === "function";

	return (
		<div
			role={isClickable ? "button" : undefined}
			tabIndex={isClickable ? 0 : undefined}
			onClick={onClick}
			onKeyDown={
				isClickable
					? (e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onClick();
							}
						}
					: undefined
			}
			className={cn(
				// 信息卡片: border + --surface 背景, 无阴影
				"rounded-[var(--radius-md)] border border-[var(--border-default)]",
				"bg-surface p-5",
				// 布局: 水平排列图标区和内容区
				"flex items-center gap-4",
				// 可点击状态: cursor + hover 效果
				isClickable && [
					"cursor-pointer",
					"transition-[box-shadow,background-color] duration-150 ease-[var(--easing)]",
					"hover:bg-[var(--surface-alt)] hover:shadow-[var(--shadow-hover)]",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-accent)] focus-visible:ring-offset-2",
				],
				className,
			)}
		>
			{/* ---- 图标色块 (28×28px) ---- */}
			<div
				className="flex items-center justify-center shrink-0"
				style={{
					width: "var(--kpi-icon-size)",
					height: "var(--kpi-icon-size)",
					backgroundColor: subtle,
					borderRadius: "var(--radius-sm)",
					color,
				}}
				aria-hidden="true"
			>
				{icon}
			</div>

			{/* ---- 内容区 ---- */}
			<div className="flex flex-1 flex-col gap-1">
				{/* 数值: Outfit 600, 22px, tabular-nums */}
				<span
					className={cn(
						"font-display text-[22px] font-semibold leading-tight",
						"text-fg",
						"text-tabular",
					)}
				>
					{value}
				</span>

				{/* 标签: DM Sans 400, 11px, --fg-muted */}
				<span className="text-caption text-fg-muted">{label}</span>
			</div>

			{/* ---- 趋势标签 (可选) ---- */}
			{trend && <KpiCardTrend trend={trend} />}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Function: KpiCardTrend
 *
 * Description: KPI 卡片内的趋势标签，与 KpiIndicator 中的 TrendBadge 保持视觉一致
 *
 * Parameters:
 *   trend(TrendInfo): 趋势信息
 *
 * Returns:
 *   JSX.Element: 趋势标签
 */
function KpiCardTrend({ trend }: { trend: TrendInfo }) {
	const { color, Icon } = TREND_STYLE_MAP[trend.direction];

	return (
		<span
			className={cn(
				"inline-flex items-center gap-0.5 shrink-0 self-start",
				"rounded-[var(--radius-pill)]",
				"px-1.5 py-0.5",
				"text-[10px] font-semibold leading-tight tracking-tight",
			)}
			style={{ backgroundColor: `${color}10`, color }}
		>
			<Icon className="size-3 shrink-0" aria-hidden="true" />
			{trend.value}
		</span>
	);
}
