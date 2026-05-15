/**
 * File: progress-bar.tsx
 * Description: 进度条组件 — 用于展示任务完成度、存储使用率等指标
 *
 * 设计规范:
 * - 容器: 圆角条形，--bg 背景色
 * - 填充条: 根据颜色变体使用对应的语义色，平滑过渡宽度变化
 * - 颜色变体: green(teal)/gold/orange(accent)
 * - 尺寸: sm(5px高度) / md(8px高度)
 * - 支持 aria 属性，保障可访问性
 *
 * 使用场景:
 * - 课程完成进度
 * - 存储空间使用率
 * - 任务执行进度
 * - 数据同步进度
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================
// 类型定义
// ============================================

/**
 * Type: ProgressBarColor
 *
 * Description: 进度条的颜色变体
 *
 * Options:
 *     green: 青绿色（成功/正向指标），使用 --teal
 *     gold: 金色（警告/中等进度），使用 --gold
 *     orange: 暖橙色（强调/主色），使用 --ds-accent
 */
export type ProgressBarColor = "green" | "gold" | "orange";

/**
 * Type: ProgressBarSize
 *
 * Description: 进度条的尺寸
 *
 * Options:
 *     sm: 小尺寸 (5px 高度)
 *     md: 中尺寸 (8px 高度)
 */
export type ProgressBarSize = "sm" | "md";

/**
 * Type: ProgressBarProps
 *
 * Description: 进度条组件的 props
 *
 * Properties:
 *     value(number): 进度值 (0-100)
 *     color(ProgressBarColor): 颜色变体
 *     size(ProgressBarSize): 尺寸变体
 *     showLabel(boolean): 是否显示百分比标签
 *     className(string): 自定义样式类名
 */
export interface ProgressBarProps {
	/** 进度值，范围 0-100 */
	value: number;
	/** 颜色变体，默认 'green' */
	color?: ProgressBarColor;
	/** 尺寸变体，默认 'sm' */
	size?: ProgressBarSize;
	/** 是否在右侧显示百分比标签 */
	showLabel?: boolean;
	/** 自定义样式类名 */
	className?: string;
}

// ============================================
// 样式映射
// ============================================

/**
 * 颜色变体到填充条样式的映射
 */
const COLOR_STYLES: Record<ProgressBarColor, string> = {
	green: "bg-[var(--teal)]",
	gold: "bg-[var(--gold)]",
	orange: "bg-[var(--ds-accent)]",
};

/**
 * 尺寸变体到容器高度的映射
 */
const SIZE_STYLES: Record<ProgressBarSize, string> = {
	sm: "h-[5px]",
	md: "h-[8px]",
};

// ============================================
// 组件实现
// ============================================

/**
 * Function: ProgressBar
 *
 * Description: 进度条组件 — 展示任务完成度或指标比例
 *             支持颜色变体、尺寸选项和百分比标签
 *
 * Parameters:
 *     value(number): 进度值 0-100（必填）
 *     color(ProgressBarColor): 颜色变体，默认 'green'
 *     size(ProgressBarSize): 尺寸变体，默认 'sm'
 *     showLabel(boolean): 是否显示百分比，默认 false
 *     className(string): 自定义样式类名
 *
 * Returns:
 *     React.ReactElement: 渲染后的进度条元素
 *
 * Example:
 *     // 基础用法
 *     <ProgressBar value={75} />
 *
 *     // 带百分比标签
 *     <ProgressBar value={60} showLabel />
 *
 *     // 自定义颜色和尺寸
 *     <ProgressBar value={45} color="gold" size="md" />
 *
 *     // 暖橙色进度条
 *     <ProgressBar value={90} color="orange" showLabel />
 */
export const ProgressBar = React.memo(
	React.forwardRef<HTMLDivElement, ProgressBarProps>(
		(
			{
				value,
				color = "green",
				size = "sm",
				showLabel = false,
				className,
				...props
			},
			ref,
		) => {
			// 将值限制在 0-100 范围内
			const clampedValue = Math.max(0, Math.min(100, value));

			return (
				<div className={cn("flex items-center gap-2", className)}>
					{/* 进度条主体容器 */}
					<div
						ref={ref}
						role="progressbar"
						aria-valuenow={clampedValue}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-label={`进度 ${Math.round(clampedValue)}%`}
						className={cn(
							// 容器样式
							"w-full overflow-hidden",
							// 圆角 3px
							"rounded-[3px]",
							// 背景色
							"bg-[var(--bg)]",
							// 尺寸
							SIZE_STYLES[size],
						)}
						{...props}
					>
						{/* 填充条 — 宽度通过内联 style 控制以支持过渡动画 */}
						<div
							className={cn(
								// 填充条基础样式
								"h-full rounded-[3px]",
								// 颜色变体
								COLOR_STYLES[color],
								// 平滑过渡宽度变化
								"transition-all duration-300 ease-out",
							)}
							style={{ width: `${clampedValue}%` }}
						/>
					</div>

					{/* 百分比标签 — 可选显示 */}
					{showLabel && (
						<span
							className={cn(
								// 等宽字体确保数字对齐
								"font-mono tabular-nums",
								// 字号和颜色
								"text-[11px] text-muted-foreground",
								// 固定宽度保持对齐
								"w-8 text-right",
							)}
						>
							{Math.round(clampedValue)}%
						</span>
					)}
				</div>
			);
		},
	),
);

ProgressBar.displayName = "ProgressBar";
