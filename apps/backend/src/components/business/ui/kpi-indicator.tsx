/**
 * File: kpi-indicator.tsx
 * Description: KPI 指标项组件 — 用于 Dashboard 六列等宽 KPI 指标条的独立指标展示
 *
 * 设计规范:
 * - 图标色块: 28×28px, 使用主题色浅底背景 + 主题色图标 (16px)
 * - 数值: Outfit 600, 22px (--font-display), tabular-nums 保持数字对齐
 * - 标签: DM Sans 400, 11px, --fg-muted 颜色
 * - 趋势标签: pill 圆角, 10px 字号, 语义色 (teal=上升, rose=下降, --fg-muted=稳定)
 * - 趋势图标: TrendingUp / TrendingDown / Minus (lucide-react)
 *
 * 色彩主题:
 * - orange → --ds-accent / --ds-accent-subtle
 * - gold   → --gold / --gold-subtle
 * - teal   → --teal / --teal-subtle
 * - rose   → --rose / --rose-subtle
 * - brown  → --brown / --brown-subtle
 * - peach  → --peach / --peach-subtle
 */

"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Type: ColorTheme
 *
 * Description: KPI 指标的色彩主题，映射到设计系统辅助色
 */
export type ColorTheme =
	| "orange"
	| "gold"
	| "teal"
	| "rose"
	| "brown"
	| "peach";

/**
 * Type: TrendDirection
 *
 * Description: 趋势方向
 */
export type TrendDirection = "up" | "down" | "stable";

/**
 * Type: TrendInfo
 *
 * Description: 趋势信息
 *
 * Properties:
 *   direction(TrendDirection): 趋势方向（上升/下降/稳定）
 *   value(string): 趋势数值文本，如 "+12.5%"
 */
export interface TrendInfo {
	/** 趋势方向 */
	direction: TrendDirection;
	/** 趋势数值文本 */
	value: string;
}

/**
 * Type: KpiIndicatorProps
 *
 * Description: KPI 指标项组件属性
 *
 * Properties:
 *   icon(React.ReactNode): 图标元素（必填，16px 尺寸）
 *   value(string | number): 指标数值（必填）
 *   label(string): 指标标签文本（必填）
 *   trend(TrendInfo): 趋势信息（可选）
 *   colorTheme(ColorTheme): 色彩主题（默认 orange）
 *   className(string): 自定义样式
 */
export interface KpiIndicatorProps {
	/** 图标元素（建议传入 16px 的 lucide 图标） */
	icon: React.ReactNode;
	/** 指标数值 */
	value: string | number;
	/** 指标标签 */
	label: string;
	/** 趋势信息 */
	trend?: TrendInfo;
	/** 色彩主题，决定图标色块和趋势颜色 */
	colorTheme?: ColorTheme;
	/** 自定义样式 */
	className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Constant: COLOR_THEME_MAP
 *
 * Description: 色彩主题到 CSS 变量的映射表
 *
 * Details:
 *   每个主题包含前景色（用于图标和趋势标签）和浅底色（用于图标背景块）
 */
const COLOR_THEME_MAP: Record<ColorTheme, { color: string; subtle: string }> = {
	orange: { color: "var(--ds-accent)", subtle: "var(--ds-accent-subtle)" },
	gold: { color: "var(--gold)", subtle: "var(--gold-subtle)" },
	teal: { color: "var(--teal)", subtle: "var(--teal-subtle)" },
	rose: { color: "var(--rose)", subtle: "var(--rose-subtle)" },
	brown: { color: "var(--brown)", subtle: "var(--brown-subtle)" },
	peach: { color: "var(--peach)", subtle: "var(--peach-subtle)" },
};

/**
 * Constant: TREND_COLOR_MAP
 *
 * Description: 趋势方向到颜色和图标的映射
 *
 * Details:
 *   上升使用 teal（正向），下降使用 rose（负向），稳定使用 --fg-muted
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
 * Function: KpiIndicator
 *
 * Description: KPI 指标项组件，用于 Dashboard 六列等宽 KPI 指标条中的单个指标展示。
 *              包含彩色图标色块、大号数值、标签文字和可选的趋势标签。
 *
 * Parameters:
 *   icon(React.ReactNode): 图标元素
 *   value(string | number): 数值
 *   label(string): 标签
 *   trend(TrendInfo): 趋势
 *   colorTheme(ColorTheme): 主题色
 *   className(string): 自定义样式
 *
 * Returns:
 *   JSX.Element: KPI 指标项
 *
 * Example:
 *   <KpiIndicator
 *     icon={<Users size={16} />}
 *     value="12,846"
 *     label="学员总数"
 *     trend={{ direction: 'up', value: '+12.5%' }}
 *     colorTheme="orange"
 *   />
 */
export function KpiIndicator({
	icon,
	value,
	label,
	trend,
	colorTheme = "orange",
	className,
}: KpiIndicatorProps) {
	// 根据主题获取前景色和浅底色
	const theme = COLOR_THEME_MAP[colorTheme];

	return (
		<div className={cn("flex flex-col gap-2.5", className)}>
			{/* ---- 图标色块 (28×28px) ---- */}
			<div
				className="flex items-center justify-center shrink-0"
				style={{
					width: "var(--kpi-icon-size)",
					height: "var(--kpi-icon-size)",
					backgroundColor: theme.subtle,
					borderRadius: "var(--radius-sm)",
					color: theme.color,
				}}
				aria-hidden="true"
			>
				{icon}
			</div>

			{/* ---- 数值: Outfit 600, 22px, tabular-nums ---- */}
			<span
				className={cn(
					"font-display text-[22px] font-semibold leading-tight",
					"text-fg",
					"text-tabular", // font-variant-numeric: tabular-nums
				)}
			>
				{value}
			</span>

			{/* ---- 标签: DM Sans 400, 11px, --fg-muted ---- */}
			<span className="text-caption text-fg-muted">{label}</span>

			{/* ---- 趋势标签 (可选) ---- */}
			{trend && <TrendBadge trend={trend} />}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Function: TrendBadge
 *
 * Description: 趋势标签子组件，pill 圆角，显示趋势方向图标和数值
 *
 * Parameters:
 *   trend(TrendInfo): 趋势信息
 *
 * Returns:
 *   JSX.Element: 趋势标签
 */
function TrendBadge({ trend }: { trend: TrendInfo }) {
	const { color, Icon } = TREND_STYLE_MAP[trend.direction];

	return (
		<span
			className={cn(
				"inline-flex items-center gap-0.5",
				"rounded-[var(--radius-pill)]",
				"px-1.5 py-0.5",
				"text-[10px] font-semibold leading-tight tracking-tight",
			)}
			style={{ backgroundColor: `${color}10`, color }}
		>
			{/* 趋势箭头图标: 12px */}
			<Icon className="size-3 shrink-0" aria-hidden="true" />
			{trend.value}
		</span>
	);
}
