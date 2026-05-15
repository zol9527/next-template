/**
 * File: stat-card.tsx
 * Description: 统计卡片组件 — 带进度条和元数据的统计展示卡片
 *
 * 设计规范:
 * - 头部: 图标色块 (28×28px, 主题浅底色) + 标题 (DM Sans 500, 13px, --fg)
 * - 数值: 大号数字 (Outfit 600, 22px, tabular-nums)
 * - 进度条: 90×5px, 3px 圆角, 三种颜色变体
 *   - green  → --teal (成功/正向)
 *   - gold   → --gold (警告/中等)
 *   - orange → --ds-accent (注意/偏弱)
 * - 底部: label-value 元数据对（如 "完成率 78%"）
 * - 卡片容器: 信息卡片风格 (border + --surface, 无阴影)
 *
 * 进度条规则 (来自设计规范):
 * - 容器: 90×5px, --bg 背景, 3px 圆角
 * - 填充: 3px 圆角, 颜色变体 green(--teal) / gold(--gold) / orange(--ds-accent)
 */

"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Type: ProgressColor
 *
 * Description: 进度条颜色变体
 */
export type ProgressColor = "green" | "gold" | "orange";

/**
 * Type: StatDetail
 *
 * Description: 统计卡片底部的元数据项
 *
 * Properties:
 *   label(string): 标签文本
 *   value(string): 值文本
 */
export interface StatDetail {
	/** 标签文本 */
	label: string;
	/** 值文本 */
	value: string;
}

/**
 * Type: StatCardColorTheme
 *
 * Description: 统计卡片的图标色彩主题
 */
export type StatCardColorTheme = "orange" | "teal" | "gold" | "rose" | "brown";

/**
 * Type: StatCardProps
 *
 * Description: 统计卡片组件属性
 *
 * Properties:
 *   icon(React.ReactNode): 图标元素（必填，建议 16px）
 *   title(string): 卡片标题（必填）
 *   value(string | number): 统计数值（必填）
 *   progress(number): 进度百分比 0-100（可选）
 *   progressColor(ProgressColor): 进度条颜色（默认 green）
 *   details(StatDetail[]): 底部元数据列表（可选）
 *   colorTheme(StatCardColorTheme): 图标色块主题色（默认 orange）
 *   className(string): 自定义样式
 */
export interface StatCardProps {
	/** 图标元素（建议传入 16px 的 lucide 图标） */
	icon: React.ReactNode;
	/** 卡片标题 */
	title: string;
	/** 统计数值 */
	value: string | number;
	/** 进度百分比 (0-100) */
	progress?: number;
	/** 进度条颜色变体 */
	progressColor?: ProgressColor;
	/** 底部元数据列表 */
	details?: StatDetail[];
	/** 图标色块色彩主题 */
	colorTheme?: StatCardColorTheme;
	/** 自定义样式 */
	className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Constant: COLOR_THEME_MAP
 *
 * Description: 图标色块主题到 CSS 变量的映射
 */
const COLOR_THEME_MAP: Record<
	StatCardColorTheme,
	{ color: string; subtle: string }
> = {
	orange: { color: "var(--ds-accent)", subtle: "var(--ds-accent-subtle)" },
	teal: { color: "var(--teal)", subtle: "var(--teal-subtle)" },
	gold: { color: "var(--gold)", subtle: "var(--gold-subtle)" },
	rose: { color: "var(--rose)", subtle: "var(--rose-subtle)" },
	brown: { color: "var(--brown)", subtle: "var(--brown-subtle)" },
};

/**
 * Constant: PROGRESS_COLOR_MAP
 *
 * Description: 进度条颜色变体到 CSS 变量的映射
 *
 * Details:
 *   green  → --teal (成功/正向)
 *   gold   → --gold (警告/中等)
 *   orange → --ds-accent (注意/偏弱)
 */
const PROGRESS_COLOR_MAP: Record<ProgressColor, string> = {
	green: "var(--teal)",
	gold: "var(--gold)",
	orange: "var(--ds-accent)",
};

/**
 * Constant: PROGRESS_BAR_HEIGHT
 *
 * Description: 进度条高度 (5px)
 */
const PROGRESS_BAR_HEIGHT = "5px";

/**
 * Constant: PROGRESS_BAR_RADIUS
 *
 * Description: 进度条圆角 (3px)
 */
const PROGRESS_BAR_RADIUS = "3px";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Function: StatCard
 *
 * Description: 统计卡片组件，用于展示带进度条的统计数据。
 *              包含图标色块、标题、大号数值、可选进度条和底部元数据。
 *              信息卡片风格（border + --surface 背景，无阴影）。
 *
 * Parameters:
 *   icon(React.ReactNode): 图标
 *   title(string): 标题
 *   value(string | number): 数值
 *   progress(number): 进度
 *   progressColor(ProgressColor): 进度条颜色
 *   details(StatDetail[]): 底部元数据
 *   colorTheme(StatCardColorTheme): 图标主题
 *   className(string): 自定义样式
 *
 * Returns:
 *   JSX.Element: 统计卡片
 *
 * Example:
 *   <StatCard
 *     icon={<BookOpen size={16} />}
 *     title="课程完成"
 *     value="1,024"
 *     progress={78}
 *     progressColor="green"
 *     details={[
 *       { label: '完成率', value: '78%' },
 *       { label: '本月新增', value: '+23' },
 *     ]}
 *   />
 */
export function StatCard({
	icon,
	title,
	value,
	progress,
	progressColor = "green",
	details,
	colorTheme = "orange",
	className,
}: StatCardProps) {
	const theme = COLOR_THEME_MAP[colorTheme];

	// 钳制进度值到 [0, 100] 范围
	const clampedProgress = Math.max(0, Math.min(100, progress ?? 0));

	return (
		<div
			className={cn(
				// 信息卡片: border + --surface 背景, 无阴影
				"rounded-[var(--radius-md)] border border-[var(--border-default)]",
				"bg-surface p-5",
				"flex flex-col gap-4",
				className,
			)}
		>
			{/* ---- 头部: 图标色块 + 标题 ---- */}
			<div className="flex items-center gap-3">
				{/* 图标色块: 28×28px, 主题浅底 */}
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

				{/* 标题: DM Sans 500, 13px, --fg */}
				<span className="font-body text-[13px] font-medium text-fg">
					{title}
				</span>
			</div>

			{/* ---- 数值: Outfit 600, 22px, tabular-nums ---- */}
			<span
				className={cn(
					"font-display text-[22px] font-semibold leading-tight",
					"text-fg",
					"text-tabular",
				)}
			>
				{value}
			</span>

			{/* ---- 进度条 (可选) ---- */}
			{progress !== undefined && (
				<div className="flex flex-col gap-1.5">
					{/* 进度条容器: 90×5px, --bg 背景, 3px 圆角 */}
					<div
						className="w-[90px] overflow-hidden"
						style={{
							height: PROGRESS_BAR_HEIGHT,
							backgroundColor: "var(--bg)",
							borderRadius: PROGRESS_BAR_RADIUS,
						}}
						role="progressbar"
						aria-valuenow={clampedProgress}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-label={`${title} 进度 ${clampedProgress}%`}
					>
						{/* 进度条填充: 主题色, 3px 圆角 */}
						<div
							className="h-full transition-[width] duration-300 ease-[var(--easing)]"
							style={{
								width: `${clampedProgress}%`,
								backgroundColor: PROGRESS_COLOR_MAP[progressColor],
								borderRadius: PROGRESS_BAR_RADIUS,
							}}
						/>
					</div>

					{/* 进度百分比文本 */}
					<span className="text-caption text-fg-muted">{clampedProgress}%</span>
				</div>
			)}

			{/* ---- 底部元数据 (可选) ---- */}
			{details && details.length > 0 && (
				<div className="flex flex-wrap gap-x-5 gap-y-1.5 border-t border-[var(--border-default)] pt-3">
					{details.map((detail, index) => (
						<div key={index} className="flex items-baseline gap-1.5">
							{/* 标签: DM Sans 400, 11px, --fg-muted */}
							<span className="text-caption text-fg-muted">{detail.label}</span>
							{/* 值: DM Sans 500, 12px, --fg-secondary */}
							<span className="font-body text-[12px] font-medium text-fg-secondary">
								{detail.value}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
