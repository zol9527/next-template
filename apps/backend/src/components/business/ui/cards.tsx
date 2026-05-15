/**
 * File: cards.tsx
 * Description: 卡片变体集合 — NextAdmin 设计系统中预配置的多种卡片布局
 *
 * 包含 6 种卡片变体:
 * - InfoCard: 信息卡片（border only，无阴影）
 * - MainCard: 主内容卡片（shadow + 60px header）
 * - MetricCard: 指标卡片（KPI 单值展示）
 * - FeedCard: 动态卡片（时间线 + 色点）
 * - CompactMetricCard: 紧凑指标卡（KPI strip 内用）
 * - DetailCard: 详情摘要卡片
 *
 * 设计令牌参考:
 * - 阴影: --shadow-card, --shadow-hover
 * - 圆角: --radius-sm(8px), --radius-md(12px), --radius-lg(16px)
 * - 边框: --border-default
 * - 卡片头部高度: --card-header-height (60px)
 * - 字体: --font-display (Outfit), --font-mono (JetBrains Mono)
 */

"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import * as React from "react";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// 通用类型
// ---------------------------------------------------------------------------

/**
 * Type: TrendDirection
 *
 * Description: 趋势方向（上升 / 下降 / 稳定）
 */
export type TrendDirection = "up" | "down" | "stable";

/**
 * Type: TrendInfo
 *
 * Description: 趋势信息，包含方向和显示值
 *
 * Properties:
 *   direction(TrendDirection): 趋势方向
 *   value(string): 显示文本（如 "+12.5%"）
 */
export interface TrendInfo {
	/** 趋势方向 */
	direction: TrendDirection;
	/** 趋势值文本 */
	value: string;
}

/**
 * Type: ColorTheme
 *
 * Description: 色彩主题，用于 CompactMetricCard 的图标色块
 *
 * 映射到设计令牌:
 *   orange → --ds-accent / --ds-accent-subtle
 *   gold   → --gold / --gold-subtle
 *   teal   → --teal / --teal-subtle
 *   rose   → --rose / --rose-subtle
 *   brown  → --brown / --brown-subtle
 *   peach  → --peach / --peach-subtle
 */
export type ColorTheme =
	| "orange"
	| "gold"
	| "teal"
	| "rose"
	| "brown"
	| "peach";

// ---------------------------------------------------------------------------
// 常量映射
// ---------------------------------------------------------------------------

/**
 * Constant: COLOR_THEME_MAP
 *
 * Description: ColorTheme 到 CSS 变量的映射
 *   每个主题包含前景色（文字/图标）和浅底色（背景）
 */
const _COLOR_THEME_MAP: Record<ColorTheme, { color: string; subtle: string }> =
	{
		orange: { color: "var(--ds-accent)", subtle: "var(--ds-accent-subtle)" },
		gold: { color: "var(--gold)", subtle: "var(--gold-subtle)" },
		teal: { color: "var(--teal)", subtle: "var(--teal-subtle)" },
		rose: { color: "var(--rose)", subtle: "var(--rose-subtle)" },
		brown: { color: "var(--brown)", subtle: "var(--brown-subtle)" },
		peach: { color: "var(--peach)", subtle: "var(--peach-subtle)" },
	};

/**
 * Constant: TREND_STYLE_MAP
 *
 * Description: 趋势方向到颜色和图标的映射
 *   up     → --teal (正向指标)
 *   down   → --rose (负向指标)
 *   stable → --fg-muted (平稳)
 */
const TREND_STYLE_MAP: Record<
	TrendDirection,
	{ color: string; Icon: typeof TrendingUp }
> = {
	up: { color: "var(--teal)", Icon: TrendingUp },
	down: { color: "var(--rose)", Icon: TrendingDown },
	stable: { color: "var(--fg-muted)", Icon: Minus },
};

// ===========================================================================
// 1a. InfoCard — 信息卡片
// ===========================================================================

/**
 * Type: InfoCardProps
 *
 * Description: 信息卡片属性 — 轻量级卡片，仅 border 无阴影
 *
 * Properties:
 *   title(string): 卡片标题（必填）
 *   subtitle(string): 副标题（可选，DM Sans 400, 12px, --fg-muted）
 *   action(ReactNode): 右侧操作区（可选）
 *   children(ReactNode): 卡片内容（必填）
 *   className(string): 自定义样式
 */
export interface InfoCardProps {
	/** 卡片标题 */
	title: string;
	/** 副标题 */
	subtitle?: string;
	/** 右侧操作区（如按钮、下拉菜单） */
	action?: React.ReactNode;
	/** 卡片内容 */
	children: React.ReactNode;
	/** 自定义样式 */
	className?: string;
}

/**
 * Function: InfoCard
 *
 * Description: 信息卡片组件 — 轻量级卡片布局，使用 border 边框 + --surface 背景，无阴影。
 *              适用于系统状态面板、交易数据面板等辅助信息展示场景。
 *
 * 设计规范:
 *   - 容器: --surface 背景, border-[var(--border-default)], rounded-[var(--radius-md)], 无阴影
 *   - 头部: title (Outfit 600, 15px) + 可选 subtitle (DM Sans 400, 12px, --fg-muted)
 *   - 操作: 右侧可选 action slot
 *
 * Example:
 *   <InfoCard title="系统状态" subtitle="最后检查: 5分钟前" action={<Button>刷新</Button>}>
 *     <p>CPU: 45%</p>
 *   </InfoCard>
 */
export const InfoCard = React.memo(function InfoCard({
	title,
	subtitle,
	action,
	children,
	className,
}: InfoCardProps) {
	return (
		<Card
			className={cn(
				// 信息卡片: 仅 border，无阴影
				"rounded-[var(--radius-md)] border border-[var(--border-default)] bg-surface shadow-none",
				className,
			)}
		>
			{/* 头部: 标题 + 副标题 + 操作区 */}
			<CardHeader className="flex flex-row items-center justify-between pb-3">
				<div className="flex flex-col gap-0.5">
					{/* 标题: Outfit 600, 15px, --fg */}
					<CardTitle className="heading-2 text-fg">{title}</CardTitle>
					{/* 副标题: DM Sans 400, 12px, --fg-muted */}
					{subtitle && <p className="text-body-sm text-fg-muted">{subtitle}</p>}
				</div>
				{/* 右侧操作区 */}
				{action && <div className="shrink-0">{action}</div>}
			</CardHeader>

			{/* 内容区: Paper Design — padding 20px */}
			<CardContent className="p-5 pt-0">{children}</CardContent>
		</Card>
	)
})

// ===========================================================================
// 1b. MainCard — 主内容卡片
// ===========================================================================

/**
 * Type: MainCardProps
 *
 * Description: 主内容卡片属性 — 带 shadow 的大卡片，固定 60px header
 *
 * Properties:
 *   title(string): 卡片标题（必填）
 *   actions(ReactNode): 右侧操作按钮区（可选）
 *   children(ReactNode): 卡片内容（必填）
 *   className(string): 自定义样式
 */
export interface MainCardProps {
	/** 卡片标题 */
	title: string;
	/** 右侧操作按钮区 */
	actions?: React.ReactNode;
	/** 卡片内容 */
	children: React.ReactNode;
	/** 自定义样式 */
	className?: string;
}

/**
 * Function: MainCard
 *
 * Description: 主内容卡片组件 — 带阴影的大卡片，适用于仪表盘主区域、表格容器等。
 *              头部固定 60px 高度 + 底部边框，内容区独立滚动。
 *
 * 设计规范:
 *   - 容器: --surface 背景, shadow-[var(--shadow-card)], rounded-[var(--radius-lg)]
 *   - 头部: 固定 60px 高度, 底部 border-[var(--border-default)], 标题左, actions 右
 *   - 内容: padding 24px 28px
 *
 * Example:
 *   <MainCard title="数据面板" actions={<Button>导出</Button>}>
 *     <DataTable data={...} />
 *   </MainCard>
 */
export const MainCard = React.memo(function MainCard({
	title,
	actions,
	children,
	className,
}: MainCardProps) {
	return (
		<Card
			className={cn(
				// 主内容卡片: shadow-card + 大圆角
				"rounded-[var(--radius-lg)] border-0 bg-surface shadow-[var(--shadow-card)]",
				className,
			)}
		>
			{/* 头部: 固定 60px 高度 + 底部边框 */}
			<CardHeader
				className={cn(
					"flex flex-row items-center justify-between",
					"border-b border-[var(--border-default)]",
					"px-7",
				)}
				style={{ height: "var(--card-header-height)" }}
			>
				{/* 标题: Outfit 600, 18px (heading-1) */}
				<CardTitle className="heading-1 text-fg">{title}</CardTitle>
				{/* 右侧操作区 */}
				{actions && (
					<div className="flex items-center gap-2 shrink-0">{actions}</div>
				)}
			</CardHeader>

			{/* 内容区: 垂直内边距 24px，水平内边距 28px */}
			<CardContent className="p-7">{children}</CardContent>
		</Card>
	);
});

// ===========================================================================
// 1c. MetricCard — 指标卡片 (KPI 单值)
// ===========================================================================

/**
 * Type: MetricCardProps
 *
 * Description: 指标卡片属性 — 单值 KPI 展示卡片
 *
 * Properties:
 *   label(string): 指标标签（必填，DM Sans 500, 11px, uppercase）
 *   value(string | number): 指标数值（必填，Outfit 600, 28px）
 *   icon(ReactNode): 可选图标
 *   trend(TrendInfo): 趋势信息（可选）
 *   className(string): 自定义样式
 */
export interface MetricCardProps {
	/** 指标标签 */
	label: string;
	/** 指标数值 */
	value: string | number;
	/** 可选图标元素 */
	icon?: React.ReactNode;
	/** 趋势信息 */
	trend?: TrendInfo;
	/** 自定义样式 */
	className?: string;
}

/**
 * Function: MetricCard
 *
 * Description: 指标卡片组件 — 单值 KPI 展示，适用于独立的指标区块。
 *              信息卡片风格（border + 无阴影），padding 20px。
 *
 * 设计规范:
 *   - 容器: --surface 背景, border, rounded-[var(--radius-md)], padding 20px
 *   - 标签: DM Sans 500, 11px, --fg-muted, uppercase
 *   - 数值: Outfit 600, 28px, --fg, tabular-nums
 *   - 趋势: pill 圆角标签，语义色
 *
 * Example:
 *   <MetricCard
 *     label="总收入"
 *     value="¥128,460"
 *     trend={{ direction: 'up', value: '+12.5%' }}
 *   />
 */
export const MetricCard = React.memo(function MetricCard({
	label,
	value,
	icon,
	trend,
	className,
}: MetricCardProps) {
	return (
		<div
			className={cn(
				// 信息卡片: border + --surface 背景, 无阴影
				"rounded-[var(--radius-md)] border border-[var(--border-default)]",
				"bg-surface p-5",
				"flex flex-col gap-2",
				className,
			)}
		>
			{/* 标签行: uppercase 标签 + 可选图标 */}
			<div className="flex items-center gap-1.5">
				{/* 可选图标 */}
				{icon && (
					<span className="shrink-0 text-fg-muted" aria-hidden="true">
						{icon}
					</span>
				)}
				{/* 标签: DM Sans 500, 11px, --fg-muted, uppercase */}
				<span className="text-overline text-fg-muted">{label}</span>
			</div>

			{/* 数值行: 数值 + 可选趋势标签 */}
			<div className="flex items-end justify-between gap-3">
				{/* 数值: Outfit 600, 28px, --fg, tabular-nums */}
				<span
					className={cn(
						"font-display text-[28px] font-semibold leading-tight",
						"text-fg",
						"text-tabular",
					)}
				>
					{value}
				</span>

				{/* 趋势标签 (可选) */}
				{trend && <TrendBadge trend={trend} />}
			</div>
		</div>
	);
});

// ===========================================================================
// 1d. FeedCard — 动态卡片
// ===========================================================================

/**
 * Type: FeedCardProps
 *
 * Description: 动态卡片属性 — 时间线风格的活动事件容器
 *
 * Properties:
 *   title(string): 卡片标题（默认 '最近动态'）
 *   children(ReactNode): 活动列表内容（建议使用 ActivityFeedItem）
 *   className(string): 自定义样式
 */
export interface FeedCardProps {
	/** 卡片标题 */
	title?: string;
	/** 活动列表内容 */
	children: React.ReactNode;
	/** 自定义样式 */
	className?: string;
}

/**
 * Function: FeedCard
 *
 * Description: 动态卡片组件 — 时间线风格的活动事件容器，带标题。
 *              内部通过 children 接收 ActivityFeedItem 组件。
 *
 * 设计规范:
 *   - 容器: --surface 背景, border, rounded-[var(--radius-md)]
 *   - 标题: "最近动态" (Outfit 600, 15px)
 *   - 内容: children（通常为 ActivityFeedList / ActivityFeedItem）
 *
 * Example:
 *   <FeedCard title="最近动态">
 *     <ActivityFeedList items={[...]} />
 *   </FeedCard>
 */
export const FeedCard = React.memo(function FeedCard({
	title = "最近动态",
	children,
	className,
}: FeedCardProps) {
	return (
		<Card
			className={cn(
				// 信息卡片: border + --surface 背景, 无阴影
				"rounded-[var(--radius-md)] border border-[var(--border-default)] bg-surface shadow-none",
				className,
			)}
		>
			{/* 标题: Outfit 600, 15px */}
			<CardHeader className="pb-3">
				<CardTitle className="heading-2 text-fg">{title}</CardTitle>
			</CardHeader>

			{/* 内容区: 活动列表 */}
			<CardContent className="pt-0">{children}</CardContent>
		</Card>
	);
});

// ===========================================================================
// 1e. CompactMetricCard — 紧凑指标卡 (KPI strip 内用)
// ===========================================================================

/**
 * Type: CompactMetricCardProps
 *
 * Description: 紧凑指标卡属性 — 设计用于 KPI strip 网格行内的单格
 *
 * Properties:
 *   label(string): 指标标签（必填，DM Sans 500, 11px, uppercase）
 *   value(string | number): 指标数值（必填，Outfit 600, 22px）
 *   trend(TrendInfo): 趋势信息（可选）
 *   colorTheme(ColorTheme): 图标色彩主题（可选）
 *   className(string): 自定义样式
 */
export interface CompactMetricCardProps {
	/** 指标标签 */
	label: string;
	/** 指标数值 */
	value: string | number;
	/** 趋势信息 */
	trend?: TrendInfo;
	/** 图标色彩主题 */
	colorTheme?: ColorTheme;
	/** 自定义样式 */
	className?: string;
}

/**
 * Function: CompactMetricCard
 *
 * Description: 紧凑指标卡组件 — 设计用于 KPI strip 网格行内的单格。
 *              无 border、无独立 padding，依赖父容器（KPI strip）的布局。
 *
 * 设计规范:
 *   - 标题: DM Sans 500, 11px, uppercase, --fg-muted
 *   - 数值: Outfit 600, 22px, --fg, tabular-nums
 *   - 趋势: pill 圆角标签，语义色
 *   - 无 border/padding — 父级 KPI strip 提供布局
 *
 * Example:
 *   <div className="grid grid-cols-6 gap-4">
 *     <CompactMetricCard label="学员总数" value="12,846" trend={{ direction: 'up', value: '+5.2%' }} />
 *     <CompactMetricCard label="活跃课程" value="342" colorTheme="teal" />
 *   </div>
 */
export const CompactMetricCard = React.memo(function CompactMetricCard({
	label,
	value,
	trend,
	className,
}: CompactMetricCardProps) {
	return (
		<div
			className={cn(
				// 无 border/padding — 依赖父级 KPI strip 布局
				"flex flex-col gap-1.5",
				className,
			)}
		>
			{/* 标签: DM Sans 500, 11px, uppercase, --fg-muted */}
			<span className="text-overline text-fg-muted">{label}</span>

			{/* 数值 + 趋势行 */}
			<div className="flex items-center gap-2">
				{/* 数值: Outfit 600, 22px, --fg, tabular-nums */}
				<span
					className={cn(
						"font-display text-[22px] font-semibold leading-tight",
						"text-fg",
						"text-tabular",
					)}
				>
					{value}
				</span>

				{/* 趋势标签 (可选) */}
				{trend && <TrendBadge trend={trend} />}
			</div>
		</div>
	);
});

// ===========================================================================
// 1f. DetailCard — 详情摘要卡片
// ===========================================================================

/**
 * Type: DetailCardProps
 *
 * Description: 详情摘要卡片属性 — 带状态 badge 的摘要展示卡片
 *
 * Properties:
 *   title(string): 卡片标题（必填）
 *   status(ReactNode): 状态 badge（可选，右侧展示）
 *   children(ReactNode): 内容区（必填，通常为 stats grid）
 *   actions(ReactNode): 底部操作区（可选）
 *   className(string): 自定义样式
 */
export interface DetailCardProps {
	/** 卡片标题 */
	title: string;
	/** 状态 badge（显示在标题右侧） */
	status?: React.ReactNode;
	/** 内容区（通常为 2-3 列的统计 grid） */
	children: React.ReactNode;
	/** 底部操作区 */
	actions?: React.ReactNode;
	/** 自定义样式 */
	className?: string;
}

/**
 * Function: DetailCard
 *
 * Description: 详情摘要卡片组件 — 带状态 badge 和底部操作区的摘要卡片。
 *              适用于订单详情、学员详情等需要状态标识的场景。
 *
 * 设计规范:
 *   - 容器: --surface 背景, shadow-card, rounded-[var(--radius-lg)]
 *   - 头部: title + status badge (右侧)
 *   - 内容: 2-3 列 stats grid
 *   - 底部: 可选操作按钮区
 *
 * Example:
 *   <DetailCard
 *     title="订单详情"
 *     status={<StatusPill variant="success" label="已完成" />}
 *     actions={<Button>导出</Button>}
 *   >
 *     <div className="grid grid-cols-3 gap-4">
 *       <StatItem label="金额" value="¥1,280" />
 *       <StatItem label="创建时间" value="2026-05-12" />
 *     </div>
 *   </DetailCard>
 */
export const DetailCard = React.memo(function DetailCard({
	title,
	status,
	children,
	actions,
	className,
}: DetailCardProps) {
	return (
		<Card
			className={cn(
				// 主内容卡片: shadow-card + 大圆角
				"rounded-[var(--radius-lg)] border-0 bg-surface shadow-[var(--shadow-card)]",
				className,
			)}
		>
			{/* 头部: 标题 + 状态 badge */}
			<CardHeader className="flex flex-row items-center justify-between pb-4">
				{/* 标题: Outfit 600, 18px (heading-1) */}
				<CardTitle className="heading-1 text-fg">{title}</CardTitle>
				{/* 状态 badge（右侧） */}
				{status && <div className="shrink-0">{status}</div>}
			</CardHeader>

			{/* 内容区: 2-3 列统计 grid */}
			<CardContent className="pt-0">{children}</CardContent>

			{/* 底部操作区 (可选) */}
			{actions && (
				<CardFooter className="border-t border-[var(--border-default)] pt-4">
					<div className="flex items-center gap-2">{actions}</div>
				</CardFooter>
			)}
		</Card>
	);
});

// ===========================================================================
// 内部子组件: TrendBadge — 趋势标签
// ===========================================================================

/**
 * Function: TrendBadge
 *
 * Description: 趋势标签组件 — pill 圆角，10px 字号，语义色
 *              up → teal, down → rose, stable → muted
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
				"inline-flex items-center gap-0.5 shrink-0",
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
