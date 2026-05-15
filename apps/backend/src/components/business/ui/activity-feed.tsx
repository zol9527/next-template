/**
 * File: activity-feed.tsx
 * Description: 活动 Feed 组件 — 时间线风格的活动事件展示
 *
 * 设计规范:
 * - 行布局: 彩色圆点 (7×7px) + 文本内容 + 时间戳
 * - 圆点颜色映射事件类型:
 *   - peach = 用户行为
 *   - teal  = 系统事件
 *   - rose  = 退款/异常
 *   - gold  = 安全事件
 * - 文本: DM Sans 400, 13px, --fg
 * - 演员名: font-semibold (加粗)
 * - 时间戳: DM Sans 400, 11px, --fg-muted, 右对齐
 * - 列表间距: 每项之间 11px 垂直间距
 */

"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Type: DotColor
 *
 * Description: 活动 Feed 圆点颜色，映射到事件类型
 */
export type DotColor = "peach" | "teal" | "rose" | "gold";

/**
 * Type: ActivityFeedItemProps
 *
 * Description: 活动 Feed 单项属性
 *
 * Properties:
 *   dotColor(DotColor): 圆点颜色/事件类型（默认 peach）
 *   content(React.ReactNode): 文本内容（必填，可包含 <strong> 加粗人名）
 *   time(string): 相对时间文本（必填，如 "14 分钟前"）
 *   className(string): 自定义样式
 */
export interface ActivityFeedItemProps {
	/** 圆点颜色，对应事件类型 */
	dotColor?: DotColor;
	/** 文本内容，可包含加粗人名 */
	content: React.ReactNode;
	/** 相对时间 */
	time: string;
	/** 自定义样式 */
	className?: string;
}

/**
 * Type: ActivityFeedListProps
 *
 * Description: 活动 Feed 列表容器属性
 *
 * Properties:
 *   items(ActivityFeedItemProps[]): 数据驱动的活动项列表（可选，与 children 二选一）
 *   children(React.ReactNode): 子元素（可选，与 items 二选一）
 *   className(string): 自定义样式
 */
export interface ActivityFeedListProps {
	/** 数据驱动的活动项列表 */
	items?: ActivityFeedItemProps[];
	/** 子元素（用于组合式用法） */
	children?: React.ReactNode;
	/** 自定义样式 */
	className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Constant: DOT_COLOR_MAP
 *
 * Description: 圆点颜色到 CSS 变量的映射
 */
const DOT_COLOR_MAP: Record<DotColor, string> = {
	peach: "var(--peach)",
	teal: "var(--teal)",
	rose: "var(--rose)",
	gold: "var(--gold)",
};

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

/**
 * Function: ActivityFeedItem
 *
 * Description: 活动 Feed 单项组件。展示带彩色圆点的时间线事件条目，
 *              包含事件描述文本和右侧时间戳。
 *
 * Parameters:
 *   dotColor(DotColor): 圆点颜色
 *   content(React.ReactNode): 事件文本
 *   time(string): 相对时间
 *   className(string): 自定义样式
 *
 * Returns:
 *   JSX.Element: 活动条目
 *
 * Example:
 *   <ActivityFeedItem
 *     dotColor="peach"
 *     content={<><strong>张明远</strong> 完成了「初中数学 · 函数专题」</>}
 *     time="14 分钟前"
 *   />
 */
export function ActivityFeedItem({
	dotColor = "peach",
	content,
	time,
	className,
}: ActivityFeedItemProps) {
	return (
		<div className={cn("flex items-start gap-2.5", className)}>
			{/* ---- 彩色圆点 (7×7px) ---- */}
			<span
				className="mt-[3px] shrink-0 rounded-full"
				style={{
					width: "7px",
					height: "7px",
					backgroundColor: DOT_COLOR_MAP[dotColor],
				}}
				aria-hidden="true"
			/>

			{/* ---- 文本内容 ---- */}
			<div className="flex flex-1 items-start justify-between gap-2">
				{/* 事件描述: DM Sans 400, 13px, --fg */}
				<span className="text-body text-fg leading-snug">{content}</span>

				{/* 时间戳: DM Sans 400, 11px, --fg-muted, 右对齐, shrink-0 避免压缩 */}
				<time className="shrink-0 text-caption text-fg-muted leading-snug">
					{time}
				</time>
			</div>
		</div>
	);
}

/**
 * Function: ActivityFeedList
 *
 * Description: 活动 Feed 列表容器组件。支持两种使用方式:
 *              1. 数据驱动：通过 items 属性传入数据数组
 *              2. 组合式：通过 children 传入 ActivityFeedItem 子组件
 *
 * Parameters:
 *   items(ActivityFeedItemProps[]): 数据驱动列表
 *   children(React.ReactNode): 子元素
 *   className(string): 自定义样式
 *
 * Returns:
 *   JSX.Element: Feed 列表容器
 *
 * Example - 数据驱动:
 *   <ActivityFeedList
 *     items={[
 *       { dotColor: 'peach', content: <><strong>张明远</strong> 完成了课程</>, time: '14 分钟前' },
 *       { dotColor: 'teal', content: '系统自动生成了月度报告', time: '1 小时前' },
 *     ]}
 *   />
 *
 * Example - 组合式:
 *   <ActivityFeedList>
 *     <ActivityFeedItem dotColor="rose" content="退款处理完成" time="2 小时前" />
 *     <ActivityFeedItem dotColor="gold" content="检测到异常登录尝试" time="3 小时前" />
 *   </ActivityFeedList>
 */
export function ActivityFeedList({
	items,
	children,
	className,
}: ActivityFeedListProps) {
	return (
		<div
			className={cn(
				"flex flex-col",
				// 列表项间距: 11px（设计规范中普通模式指标行间距）
				"gap-[11px]",
				className,
			)}
		>
			{/* 优先使用 items 数据驱动渲染，否则使用 children */}
			{items
				? items.map((item, index) => <ActivityFeedItem key={index} {...item} />)
				: children}
		</div>
	);
}
